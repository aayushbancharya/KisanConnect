from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import requests
import os
import jwt
import datetime
import time
import json
import secrets
import math
import threading
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import wraps
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Database setup
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///smartcrop.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY') or secrets.token_hex(32)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

AGMARKNET_API_KEY = os.getenv("AGMARKNET_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

_mandi_cache = {}
_mandi_cache_lock = threading.Lock()
AGMARKNET_BASE_URL = "https://api.agmarknet.gov.in/v1"
AGMARKNET_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://agmarknet.gov.in",
    "Referer": "https://agmarknet.gov.in/",
    "User-Agent": "Mozilla/5.0 (compatible; KisanConnect/1.0)",
}


def _first_value(record, *names, default=""):
    """Read a field from data.gov.in/AGMARKNET despite label/case differences."""
    def normalise_key(key):
        return re.sub(r"[^a-z0-9]+", "_", str(key).strip().casefold()).strip("_")

    values = {normalise_key(key): value for key, value in record.items()}
    for name in names:
        value = values.get(normalise_key(name))
        if value not in (None, ""):
            return str(value).strip()
    return default


def _normalise_mandi_records(records, commodity, state):
    """Convert the varying official API field names into the frontend contract."""
    normalised = []
    for record in records or []:
        modal = _first_value(record, "modal_price", "modal price", "modal price rs quintal", "modal", "price")
        if not modal or not any(char.isdigit() for char in modal):
            continue
        normalised.append({
            "state": _first_value(record, "state", default=state),
            "district": _first_value(record, "district", "district_name", "dist_name", default="Not specified"),
            "market": _first_value(record, "market", "market_name", "mkt_name", "mandi", default="Not specified"),
            "commodity": _first_value(record, "commodity", "commodity_name", default=commodity),
            "variety": _first_value(record, "variety", "variety_name", default="Not specified"),
            "min_price": _first_value(record, "min_price", "min price", "min price rs quintal", "minimum_price", default="—"),
            "max_price": _first_value(record, "max_price", "max price", "max price rs quintal", "maximum_price", default="—"),
            "modal_price": modal,
            "arrival_date": _first_value(record, "arrival_date", "arrival date", "price_date", "date", default="Not specified"),
        })
    return normalised


def _commodity_variants(commodity):
    """Official feeds use several names for the same farmer-facing commodity."""
    aliases = {
        "rice": ["Rice", "Paddy"],
        "sunflower": ["Sunflower", "Sunflower Seed", "Sunflower Seeds"],
        "sugarcane": ["Sugarcane", "Sugar Cane"],
        "chickpea": ["Chickpea", "Bengal Gram", "Gram"],
        "pigeon pea": ["Pigeon Pea", "Arhar", "Tur"],
        "black gram": ["Black Gram", "Urad"],
        "green gram": ["Green Gram", "Moong"],
    }
    return aliases.get(commodity.strip().casefold(), [commodity.strip()])

# User Model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(15), nullable=True)
    state = db.Column(db.String(50), nullable=True)
    district = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'state': self.state,
            'district': self.district,
        }
    
class Listing(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    farmer_name = db.Column(db.String(100), nullable=False)
    crop = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Integer, nullable=False)
    unit = db.Column(db.String(20), nullable=False)
    state = db.Column(db.String(50), nullable=False)
    district = db.Column(db.String(50), nullable=True)
    quality = db.Column(db.String(20), nullable=True)
    harvest_date = db.Column(db.String(30), nullable=True)
    phone = db.Column(db.String(15), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self, include_phone=True):
        return {
            'id': self.id,
            'farmerName': self.farmer_name,
            'crop': self.crop,
            'quantity': self.quantity,
            'price': self.price,
            'unit': self.unit,
            'state': self.state,
            'district': self.district,
            'quality': self.quality,
            'harvestDate': self.harvest_date,
            'phone': self.phone if include_phone else None,
            'description': self.description,
            'createdAt': str(self.created_at),
        }

class ListingOwnership(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey('listing.id'), nullable=False, unique=True, index=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)

class ListingInquiry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey('listing.id'), nullable=False, index=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    message = db.Column(db.String(1000), nullable=False)
    farmer_reply = db.Column(db.String(1000), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    replied_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        listing = db.session.get(Listing, self.listing_id)
        buyer = db.session.get(User, self.buyer_id)
        return {'id': self.id, 'listingId': self.listing_id, 'crop': listing.crop if listing else None,
                'buyerName': buyer.name if buyer else 'Buyer', 'message': self.message,
                'farmerReply': self.farmer_reply, 'createdAt': self.created_at.isoformat(),
                'repliedAt': self.replied_at.isoformat() if self.replied_at else None}

class Farm(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(60), nullable=False)
    district = db.Column(db.String(60), nullable=False)
    acres = db.Column(db.Float, nullable=False)
    soil_type = db.Column(db.String(40), nullable=True)
    water_source = db.Column(db.String(60), nullable=True)
    current_crop = db.Column(db.String(80), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'state': self.state,
                'district': self.district, 'acres': self.acres,
                'soilType': self.soil_type, 'waterSource': self.water_source,
                'currentCrop': self.current_crop, 'createdAt': self.created_at.isoformat()}

class FarmRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    farm_id = db.Column(db.Integer, db.ForeignKey('farm.id'), nullable=True, index=True)
    kind = db.Column(db.String(40), nullable=False, index=True)
    crop = db.Column(db.String(80), nullable=True)
    payload = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        return {'id': self.id, 'farmId': self.farm_id, 'kind': self.kind,
                'crop': self.crop, 'result': json.loads(self.payload),
                'createdAt': self.created_at.isoformat()}
    
# Create tables
with app.app_context():
    db.create_all()

@app.route('/')
def home():
    return jsonify({"message": "KisanConnect Backend is running!", "status": "ok"})

def authenticated_user():
    token = request.headers.get('Authorization', '').replace('Bearer ', '', 1)
    if not token:
        return None, (jsonify({'error': 'Authentication required'}), 401)
    try:
        claims = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user = db.session.get(User, claims.get('user_id'))
        if user:
            return user, None
    except Exception:
        pass
    return None, (jsonify({'error': 'Session expired or invalid. Please sign in again.'}), 401)

def require_user(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        user, error = authenticated_user()
        if error:
            return error
        return fn(user, *args, **kwargs)
    return wrapped

@app.route('/api/farms', methods=['GET', 'POST'])
@require_user
def farms(user):
    if request.method == 'GET':
        return jsonify({'farms': [f.to_dict() for f in Farm.query.filter_by(owner_id=user.id).order_by(Farm.created_at.desc()).all()]})
    data = request.get_json(silent=True) or {}
    name, state, district = (str(data.get(k, '')).strip() for k in ('name', 'state', 'district'))
    try:
        acres = float(data.get('acres', 0))
    except (TypeError, ValueError):
        acres = 0
    if not name or not state or not district or not math.isfinite(acres) or acres <= 0 or acres > 100000:
        return jsonify({'error': 'Farm name, state, district, and a positive acreage are required.'}), 400
    farm = Farm(owner_id=user.id, name=name[:100], state=state[:60], district=district[:60],
                acres=acres, soil_type=str(data.get('soilType', ''))[:40],
                water_source=str(data.get('waterSource', ''))[:60], current_crop=str(data.get('currentCrop', ''))[:80])
    db.session.add(farm)
    db.session.commit()
    return jsonify({'farm': farm.to_dict()}), 201

@app.route('/api/farm-records', methods=['GET'])
@require_user
def farm_records(user):
    query = FarmRecord.query.filter_by(owner_id=user.id)
    kind = request.args.get('kind')
    farm_id = request.args.get('farmId', type=int)
    if kind:
        query = query.filter_by(kind=kind)
    if farm_id:
        query = query.filter_by(farm_id=farm_id)
    return jsonify({'records': [r.to_dict() for r in query.order_by(FarmRecord.created_at.desc()).limit(100).all()]})

@app.route('/api/farms/<int:farm_id>/crop-selection', methods=['POST'])
@require_user
def select_farm_crop(user, farm_id):
    farm = Farm.query.filter_by(id=farm_id, owner_id=user.id).first()
    if not farm:
        return jsonify({'error': 'Farm not found.'}), 404
    data = request.get_json(silent=True) or {}
    crop = str(data.get('crop', '')).strip()
    if not crop or len(crop) > 80:
        return jsonify({'error': 'Choose a valid crop.'}), 400
    farm.current_crop = crop
    record = FarmRecord(owner_id=user.id, farm_id=farm.id, kind='crop-selection', crop=crop,
                        payload=json.dumps({'status': 'selected', 'crop': crop}, ensure_ascii=False))
    db.session.add(record)
    db.session.commit()
    return jsonify({'farm': farm.to_dict(), 'record': record.to_dict()}), 200

@app.route('/api/farm-tools/<kind>', methods=['POST'])
@require_user
def farm_tools(user, kind):
    data = request.get_json(silent=True) or {}
    allowed = {'crop-advice', 'irrigation', 'nutrient-advice', 'yield-estimate'}
    if kind not in allowed and kind != 'disease-analysis':
        return jsonify({'error': 'Unknown farm tool.'}), 404
    farm = None
    if data.get('farmId') is not None:
        farm = Farm.query.filter_by(id=data.get('farmId'), owner_id=user.id).first()
        if not farm:
            return jsonify({'error': 'Farm not found.'}), 404
    crop = str(data.get('crop') or (farm.current_crop if farm else '') or '').strip()[:80]
    if kind == 'disease-analysis':
        affected_part = str(data.get('affectedPart') or '').strip()
        crop_age = str(data.get('cropAge') or '').strip()
        spread = str(data.get('spread') or '').strip()
        if not crop or affected_part not in {'Leaf', 'Stem', 'Fruit', 'Root', 'Whole Plant'} or crop_age not in {'Just planted', 'Young plant', 'Grown plant', 'Ready to harvest'} or spread not in {'Only a few plants', 'About half the field', 'Most of the field'}:
            return jsonify({'error': 'Choose a crop, affected plant part, crop age, and affected area before saving the field observation.'}), 400
        if spread == 'Most of the field':
            urgency = 'Contact your local agricultural extension officer promptly because the problem is widespread.'
        elif spread == 'About half the field':
            urgency = 'Arrange an in-person assessment soon and check nearby rows for spread.'
        else:
            urgency = 'Mark affected plants and check whether symptoms spread over the next 1–2 days.'
        result = {
            'status': 'field_observation_saved',
            'label': 'Field observation saved — photo not diagnosed',
            'message': 'No image-classification model is configured, so this photo was not analyzed and no disease has been identified.',
            'crop': crop, 'affectedPart': affected_part, 'cropAge': crop_age, 'spread': spread,
            'nextSteps': [urgency, 'Take clear photos of both affected and healthy plants, including close-ups and the whole plant.',
                         'Avoid applying pesticide or mixing products until a qualified local expert confirms the cause.'],
            'safety': 'This is an observation record, not a diagnosis or treatment prescription.'
        }
        record = FarmRecord(owner_id=user.id, farm_id=farm.id if farm else None, kind='disease-observation', crop=crop,
                            payload=json.dumps(result, ensure_ascii=False))
        db.session.add(record)
        db.session.commit()
        result['recordId'] = record.id
        return jsonify(result), 200
    if kind == 'crop-advice':
        soil = str(data.get('soilType') or (farm.soil_type if farm else '')).lower()
        water = str(data.get('waterAvailability', 'medium')).lower()
        season = str(data.get('season', '')).lower()
        options = [
            {'crop': 'Millet', 'conditions': ['dry', 'sandy', 'low'], 'season': 'kharif', 'reason': 'Often considered in lower-water plans; check local variety and sowing window.'},
            {'crop': 'Rice', 'conditions': ['clay', 'alluvial', 'high'], 'season': 'kharif', 'reason': 'Can suit water-available fields; confirm local water and soil conditions.'},
            {'crop': 'Wheat', 'conditions': ['loamy', 'alluvial', 'medium'], 'season': 'rabi', 'reason': 'A common winter option; verify district sowing dates.'},
            {'crop': 'Groundnut', 'conditions': ['red', 'sandy', 'medium'], 'season': 'kharif', 'reason': 'May fit well-drained soils; check local rainfall and seed availability.'},
            {'crop': 'Maize', 'conditions': ['loamy', 'red', 'medium'], 'season': 'kharif', 'reason': 'Flexible crop option; local hybrid and market suitability vary.'},
        ]
        ranked = sorted(options, key=lambda o: (any(c in soil or c in water for c in o['conditions']) + (o['season'] in season)), reverse=True)[:3]
        result = {'status': 'rule_based_advisory', 'label': 'Advisory, not a validated ML prediction', 'recommendations': ranked,
                  'inputs': {'soilType': soil, 'waterAvailability': water, 'season': season}}
    elif kind == 'irrigation':
        if data.get('forecastRainMm') in (None, '') or data.get('temperatureC') in (None, ''):
            return jsonify({'error': 'Enter forecast rainfall and temperature from a weather forecast. No sensor or weather data is fetched by this tool.'}), 400
        try:
            rain = float(data.get('forecastRainMm'))
            temp = float(data.get('temperatureC'))
        except (TypeError, ValueError):
            return jsonify({'error': 'Rainfall and temperature must be numeric.'}), 400
        if not math.isfinite(rain) or not math.isfinite(temp) or rain < 0 or rain > 500 or temp < -30 or temp > 60:
            return jsonify({'error': 'Weather values are outside the supported range.'}), 400
        soil = str(data.get('soilType') or (farm.soil_type if farm else 'unknown')).lower()
        if rain >= 10:
            advice = 'Rain is forecast; check soil moisture before irrigating and avoid waterlogging.'
            interval = 'Recheck after the rainfall'
        elif temp >= 34:
            advice = 'Hot conditions increase water stress risk. Check root-zone moisture and irrigate in cooler hours if needed.'
            interval = 'Check soil moisture daily'
        else:
            advice = 'Use a soil-moisture check before watering; avoid a fixed schedule without crop stage and soil readings.'
            interval = 'Recheck soil moisture in 1–2 days'
        result = {'status': 'rule_based_advisory', 'label': 'Guidance from manually entered forecast; no sensor data', 'source': 'user_entered_weather', 'advice': advice,
                  'checkAgain': interval, 'forecastRainMm': rain, 'temperatureC': temp, 'soilType': soil, 'crop': crop or None}
    elif kind == 'nutrient-advice':
        observation = str(data.get('observation', '')).strip()[:300]
        result = {'status': 'general_guidance', 'label': 'No fertilizer or pesticide dosage generated',
                  'advice': 'Record crop stage and symptoms, test soil where possible, and confirm nutrient needs with a local agricultural extension officer before applying inputs.',
                  'observation': observation, 'crop': crop or None,
                  'safety': 'Do not mix or apply pesticides based on image guesses. Follow the product label and local agricultural guidance.'}
    else:
        try:
            acres = float(data.get('acres') or (farm.acres if farm else 0) or 0)
        except (TypeError, ValueError):
            return jsonify({'error': 'Farm acreage must be numeric.'}), 400
        if not math.isfinite(acres) or acres < 0 or acres > 100000:
            return jsonify({'error': 'Farm acreage is outside the supported range.'}), 400
        result = {'status': 'model_unavailable', 'label': 'Yield prediction model is not configured',
                  'message': 'No yield figure is shown because this project has no validated crop yield model or local training data.',
                  'crop': crop or None, 'acres': acres}
    record = FarmRecord(owner_id=user.id, farm_id=farm.id if farm else None, kind=kind, crop=crop or None,
                        payload=json.dumps(result, ensure_ascii=False))
    db.session.add(record)
    db.session.commit()
    result['recordId'] = record.id
    return jsonify(result), 200

@app.route('/api/schemes')
def schemes():
    # Deliberately point farmers to official directories instead of inferring eligibility or availability.
    return jsonify({'status': 'official_links_only', 'schemes': [
        {'name': 'myScheme', 'description': 'Search government schemes and check current eligibility on the official portal.', 'url': 'https://www.myscheme.gov.in/'},
        {'name': 'PM-KISAN', 'description': 'Check current PM-KISAN information and beneficiary services.', 'url': 'https://pmkisan.gov.in/'},
        {'name': 'Pradhan Mantri Fasal Bima Yojana', 'description': 'Check crop insurance details and current enrollment windows.', 'url': 'https://pmfby.gov.in/'},
        {'name': 'e-NAM', 'description': 'Official national agriculture market portal.', 'url': 'https://enam.gov.in/'},
        {'name': 'Kisan Credit Card (KCC)', 'description': 'Explore bank credit for crop cultivation, post-harvest needs, and eligible allied activities. Apply through participating banks; terms and eligibility apply.', 'url': 'https://www.myscheme.gov.in/schemes/kcc'},
        {'name': 'Soil Health Card', 'description': 'Access soil testing services and soil nutrient reports to help plan crop and input decisions.', 'url': 'https://soilhealth.dac.gov.in/'},
        {'name': 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)', 'description': 'Explore irrigation, water-use efficiency, and watershed programme information. Components and application routes vary by state.', 'url': 'https://pmksy.gov.in/'},
        {'name': 'PM-KUSUM', 'description': 'Check official information on solar pumps and solarisation of agricultural power. Contact your state implementing agency for current application windows.', 'url': 'https://pmkusum.mnre.gov.in/'},
        {'name': 'National Mission on Natural Farming', 'description': 'Find training, demonstrations, and guidance for farmers interested in natural farming practices.', 'url': 'https://www.myscheme.gov.in/schemes/nmnf'},
        {'name': 'Agriculture Infrastructure Fund (AIF)', 'description': 'Explore financing support for eligible post-harvest infrastructure and community farming assets; lending and eligibility conditions apply.', 'url': 'https://agriinfra.dac.gov.in/'},
        {'name': 'Mission for Integrated Development of Horticulture (MIDH)', 'description': 'Review programme support related to horticulture, planting material, protected cultivation, and post-harvest activities. State guidelines apply.', 'url': 'https://www.myscheme.gov.in/schemes/midh'},
        {'name': 'Pradhan Mantri Kisan Maandhan Yojana', 'description': 'Check the voluntary pension scheme information for eligible small and marginal farmers.', 'url': 'https://www.myscheme.gov.in/schemes/pmkmdy'},
        {'name': 'Formation and Promotion of 10,000 FPOs', 'description': 'Learn about farmer producer organisations, support, and official programme resources through SFAC.', 'url': 'https://sfacindia.com/fpos.aspx'},
        {'name': 'Pradhan Mantri Matsya Sampada Yojana (PMMSY)', 'description': 'Official scheme information for fishers, fish farmers, and fisheries enterprises.', 'url': 'https://dof.gov.in/pmmsy'},
        {'name': 'National Food Security Mission (NFSM)', 'description': 'Explore crop productivity and food security mission information; state implementation and support vary.', 'url': 'https://nfsm.gov.in/'},
    ], 'notice': 'Availability and eligibility vary by location and date. Verify details on the linked government portal.'})

# Register
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({'error': 'Provide account details as JSON.'}), 400
        name = str(data.get('name') or '').strip()
        email = str(data.get('email') or '').strip().lower()
        password = str(data.get('password') or '')
        phone = str(data.get('phone') or '').strip()
        state = str(data.get('state') or '').strip()
        district = str(data.get('district') or '').strip()

        if not name or not email or not password:
            return jsonify({'error': 'Name, email and password are required'}), 400

        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400

        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'error': 'Account already exists with this email'}), 400

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        user = User(
            name=name,
            email=email,
            password=hashed_password,
            phone=phone,
            state=state,
            district=district
        )
        db.session.add(user)
        db.session.commit()

        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({
            'message': 'Account created successfully!',
            'token': token,
            'user': user.to_dict()
        }), 201

    except Exception:
        app.logger.exception('Account registration failed')
        db.session.rollback()
        return jsonify({'error': 'The account could not be created. Please retry.'}), 500

# Login
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({'error': 'Provide sign-in details as JSON.'}), 400
        email = str(data.get('email') or '').strip().lower()
        password = str(data.get('password') or '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({'error': 'No account found with this email. Please sign up first!'}), 404

        if not bcrypt.check_password_hash(user.password, password):
            return jsonify({'error': 'Incorrect password. Please try again!'}), 401

        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({
            'message': f'Welcome back, {user.name}!',
            'token': token,
            'user': user.to_dict()
        }), 200

    except Exception:
        app.logger.exception('Account login failed')
        return jsonify({'error': 'The sign-in request could not be completed. Please retry.'}), 500

# Get current user
@app.route('/api/me', methods=['GET'])
def get_me():
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'No token provided'}), 401

        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        user = db.session.get(User, data['user_id'])

        if not user:
            return jsonify({'error': 'User not found'}), 404

        return jsonify({'user': user.to_dict()}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Session expired. Please login again!'}), 401
    except Exception:
        return jsonify({'error': 'Session expired or invalid. Please sign in again.'}), 401

# Market prices route
@app.route('/api/market-prices')
def market_prices():
    commodity = request.args.get('commodity', '')
    state = request.args.get('state', '')
    if not commodity.strip() or not state.strip():
        return jsonify({'error': 'Commodity and state are required.'}), 400
    cache_key = (commodity.strip().casefold(), state.strip().casefold())
    with _mandi_cache_lock:
        cached = _mandi_cache.get(cache_key)
        if cached and time.time() - cached[0] < 1800:
            return jsonify(cached[1])

    # Prefer the keyed open-data API when it responds. It is currently unreliable in
    # some regions, so fall through to AGMARKNET's own public market reports.
    if AGMARKNET_API_KEY:
        for resource_id in ("9ef84268-d588-465a-a308-a864a43d0070", "35985678-0d79-46b4-9ed6-6f13308a1d24"):
            for commodity_variant in _commodity_variants(commodity):
                try:
                    response = requests.get(
                        f"https://api.data.gov.in/resource/{resource_id}",
                        params={"api-key": AGMARKNET_API_KEY, "format": "json", "filters[commodity]": commodity_variant,
                                "filters[state]": state, "limit": 20},
                        timeout=(2, 2),
                    )
                    data = response.json()
                    records = _normalise_mandi_records(data.get("records", []), commodity.strip(), state.strip())
                    if response.ok and records:
                        result = {"records": records[:20], "source": "data.gov.in", "live": True,
                                  "note": "Recent reported prices from the Government of India's open mandi data. Prices and reporting dates vary by market."}
                        with _mandi_cache_lock:
                            _mandi_cache[cache_key] = (time.time(), result)
                        return jsonify(result)
                except (requests.RequestException, ValueError):
                    continue

    try:
        filters_response = requests.get(f"{AGMARKNET_BASE_URL}/daily-price-arrival/filters",
                                        headers=AGMARKNET_HEADERS, timeout=(3, 6))
        filters_response.raise_for_status()
        filters_payload = filters_response.json()
        filters_data = filters_payload.get("data", filters_payload)
        commodity_names = {name.casefold() for name in _commodity_variants(commodity)}
        commodity_entry = next((item for item in filters_data.get("cmdt_data", [])
                                if str(item.get("commodity", item.get("commodity_name", item.get("cmdt_name", "")))).casefold() in commodity_names), None)
        state_entry = next((item for item in filters_data.get("state_data", [])
                           if str(item.get("state", item.get("state_name", item.get("st_name", "")))).casefold() == state.strip().casefold()), None)
        if not commodity_entry or not state_entry:
            return jsonify({'error': f'AGMARKNET has no matching commodity or state for {commodity} in {state}.', 'source': 'AGMARKNET'}), 404

        commodity_id = commodity_entry.get("commodity_id", commodity_entry.get("cmdt_id", commodity_entry.get("id")))
        state_id = state_entry.get("state_id", state_entry.get("st_id", state_entry.get("id")))
        markets = [market for market in filters_data.get("market_data", [])
                   if str(market.get("state_id", market.get("st_id", ""))) == str(state_id)]
        # Keep the lookup bounded while scanning enough markets to find recent reports.
        markets = markets[:48]
        if not markets:
            return jsonify({'error': f'AGMARKNET has no listed markets for {state}.', 'source': 'AGMARKNET'}), 404

        def get_market_report(market):
            market_id = market.get("market_id", market.get("mkt_id", market.get("id")))
            if not market_id:
                return []
            try:
                report = requests.get(
                    f"{AGMARKNET_BASE_URL}/prices-and-arrivals/market-price/lastweek",
                    params={"marketId": market_id, "stateId": state_id, "commodityId": commodity_id,
                            "includeExcel": "false"},
                    headers=AGMARKNET_HEADERS, timeout=(2, 4),
                )
                if not report.ok:
                    return []
                payload = report.json()
                columns = [col.get("key") for col in payload.get("columns", []) if col.get("key")]
                date_columns = sorted((key for key in columns if key[:4].isdigit() and "-" in key), reverse=True)
                output = []
                market_name = market.get("mkt_name", market.get("market_name", market.get("market", "")))
                district_name = market.get("district_name", market.get("dist_name", market.get("district", "")))
                for row in payload.get("data", []):
                    price = next((row.get(day) for day in date_columns
                                  if str(row.get(day, "")).replace(",", "").replace(".", "", 1).isdigit()), None)
                    if price is None:
                        continue
                    output.append({"state": state, "district": district_name, "market": market_name,
                                   "commodity": commodity, "variety": row.get("variety", "Not specified"),
                                   "min_price": "—", "max_price": "—", "modal_price": str(price),
                                   "arrival_date": next((day for day in date_columns
                                                         if str(row.get(day, "")).replace(",", "").replace(".", "", 1).isdigit()), "")})
                return output
            except (requests.RequestException, ValueError):
                return []

        records = []
        with ThreadPoolExecutor(max_workers=12) as executor:
            futures = [executor.submit(get_market_report, market) for market in markets]
            for future in as_completed(futures):
                records.extend(future.result())
                if len(records) >= 20:
                    break
        if records:
            result = {"records": records[:20], "source": "AGMARKNET", "live": True,
                      "note": "Recent reported prices from AGMARKNET's last-seven-day market reports. Missing days are not estimated."}
            with _mandi_cache_lock:
                _mandi_cache[cache_key] = (time.time(), result)
            return jsonify(result)
        return jsonify({'error': f'No recent {commodity} prices were reported by the markets checked in {state}. Try another crop or state.',
                        'source': 'AGMARKNET', 'markets_checked': len(markets)}), 404
    except (requests.RequestException, ValueError, KeyError) as error:
        app.logger.warning("Official mandi lookup failed (%s)", type(error).__name__)
        return jsonify({'error': 'Official mandi data is temporarily unavailable. Please retry shortly.', 'source': 'AGMARKNET'}), 502


def offline_farming_guidance(question):
    """Provide limited, clearly labeled general advice when the live model is unreachable."""
    text = question.casefold()
    notice = "Offline farming guide (the live AI connection is unavailable). This is general guidance, not a live-data prediction.\n\n"
    if 'karnataka' in text and any(word in text for word in ('crop', 'grow', 'suit', 'best', 'plant')):
        return notice + (
            "There is no single best crop for all of Karnataka: the state has ten agro-climatic zones. As a broad starting point, UAS Bengaluru lists ragi, maize, pulses, "
            "groundnut and some horticulture for parts of the southern dry zones; jowar, cotton, pulses and oilseeds are common options in drier zones; rice and sugarcane "
            "are more suited to locations with reliable water. Choose only after checking your district's zone, soil, rainfall, irrigation and current sowing calendar. "
            "For a specific choice, share your district, soil type and whether the field is rainfed or irrigated. Source: UAS Bengaluru agro-climatic zones."
        )
    if any(word in text for word in ('increase', 'improve', 'higher', 'more')) and 'yield' in text:
        return notice + (
            "For a better chance of improving yield: (1) get a soil test and follow the crop- and zone-specific recommendation, (2) use locally recommended quality seed "
            "and sow at the recommended time and spacing, (3) manage weeds early and protect moisture, (4) rotate with a suitable legume where practical, and "
            "(5) scout regularly for pests and disease. Avoid extra fertilizer or pesticide without a soil report or confirmed need. The best steps depend on your crop and field; "
            "share your crop, district, soil and irrigation situation for more focused advice."
        )
    if any(word in text for word in ('sell', 'market', 'price', 'mandi', 'onion', 'pyaz')):
        return notice + (
            "For onion sales in Maharashtra, compare same-day prices and arrivals at two or three nearby APMCs on the official AGMARKNET or e-NAM portal. "
            "Compare the reported price after transport, commission, and handling costs; a higher distant-market quote may not mean higher net returns. "
            "Sell well-cured, dry, sorted produce, and store only in a suitable ventilated onion store. I cannot see today's prices or predict tomorrow's market."
        )
    if any(word in text for word in ('disease', 'pest', 'curl', 'spot', 'yellow', 'wilt', 'insect')):
        return notice + (
            "I cannot diagnose a crop problem offline. Note which plant parts are affected, how quickly symptoms are spreading, and recent irrigation or spray history. "
            "Photograph affected and healthy plants, and ask your local Krishi Vigyan Kendra or agriculture officer to confirm the cause before treatment. "
            "Do not apply or mix pesticides based on a guess; follow the product label."
        )
    if any(word in text for word in ('fertilizer', 'fertiliser', 'urea', 'dose', 'dosage', 'nutrient')):
        return notice + (
            "Base fertilizer decisions on a recent soil test, the crop and growth stage, and your state agriculture recommendations. Avoid guessing a dose or mixing products. "
            "Follow the product label and ask your local agriculture extension officer if the soil report or application rate is unclear."
        )
    if any(word in text for word in ('water', 'irrigat', 'rain', 'drought')):
        return notice + (
            "I cannot see your field moisture or local forecast. Check soil moisture near the active root zone and consider crop type, growth stage, soil texture, and recent rain before irrigating. "
            "Avoid a fixed schedule when field conditions differ; seek local crop-specific advice for water-sensitive stages."
        )
    if any(word in text for word in ('crop', 'grow', 'sow', 'plant', 'seed', 'rotation', 'yield')):
        return notice + (
            "Choose crops and sowing dates using your soil test, reliable local water supply, current state agricultural calendar, and seed availability. "
            "Rotate crop families where practical, use certified seed suited to your area, and confirm local variety and sowing-window advice with your Krishi Vigyan Kendra. "
            "I cannot check current weather or guarantee yield offline."
        )
    if 'organic' in text:
        return notice + (
            "Start with a soil test and a gradual plan: recycle clean crop residues, use well-decomposed farmyard manure or compost, include suitable legumes in rotation, "
            "and reduce avoidable soil disturbance. Keep records of inputs and check the applicable organic certification standard before selling produce as certified organic. "
            "Do not assume an input is permitted without checking the relevant standard and label."
        )
    return notice + (
        "I can provide only basic general guidance while the AI connection is unavailable. For advice specific to your crop and field, include the crop, growth stage, "
        "district, soil type, and what you observed, then retry when the live AI connection is restored."
    )


def offline_assistant_response(messages, status, provider_http_status=None):
    latest_question = str(messages[-1].get('content', '')) if messages else ''
    result = {'reply': offline_farming_guidance(latest_question), 'source': 'offline_guide', 'status': status}
    if provider_http_status is not None:
        result['providerHttpStatus'] = provider_http_status
    return jsonify(result), 200


@app.route('/api/ai-assistant', methods=['POST'])
@require_user
def ai_assistant(user):
    try:
        data = request.get_json(silent=True) or {}
        messages = data.get('messages', [])
        language_names = {'en': 'English', 'hi': 'Hindi', 'kn': 'Kannada', 'ta': 'Tamil', 'te': 'Telugu',
                          'mr': 'Marathi', 'pa': 'Punjabi', 'gu': 'Gujarati', 'bn': 'Bengali', 'or': 'Odia',
                          'ml': 'Malayalam', 'as': 'Assamese'}
        language = language_names.get(str(data.get('languageCode', 'en')).lower(), 'English')
        system_prompt = (f"You are KisanConnect, a practical agricultural assistant for farmers in India. "
                         f"Always answer in {language}, using simple, concise language. Help with crop planning, "
                         "farming practices, soil, irrigation, pests, symptoms, inputs, harvest, storage, and farm schemes. "
                         "Do not claim to diagnose a photo or field condition. Do not invent live prices, weather, sensor data, "
                         "scheme eligibility, or local facts. Never guess pesticide or fertilizer dosages; direct the farmer "
                         "to the product label and a local agricultural extension officer. State uncertainty when relevant. "
                         "For unrelated questions, briefly explain that you only assist with farming.")
        if not isinstance(messages, list) or not messages or len(messages) > 30:
            return jsonify({'error': 'Provide between 1 and 30 chat messages.'}), 400
        if any(not isinstance(msg, dict) or msg.get('role') not in ('user', 'assistant') or
               not isinstance(msg.get('content'), str) or not msg['content'].strip() or len(msg['content']) > 4000
               for msg in messages):
            return jsonify({'error': 'Chat messages must have a valid role and text under 4,000 characters.'}), 400
        farm_context = data.get('farmContext')
        selected_farm = None
        if isinstance(farm_context, dict) and farm_context.get('id') is not None:
            selected_farm = Farm.query.filter_by(id=farm_context.get('id'), owner_id=user.id).first()
            if not selected_farm:
                return jsonify({'error': 'Farm context is not available for this account.'}), 404
            system_prompt += (f"\n\nFarmer's selected farm context (user-owned saved data): name={selected_farm.name}, "
                              f"state={selected_farm.state}, district={selected_farm.district}, acres={selected_farm.acres}, "
                              f"soil={selected_farm.soil_type or 'not recorded'}, current crop={selected_farm.current_crop or 'not recorded'}. "
                              "Use this context only when relevant; do not infer unrecorded facts.")
        elif farm_context is not None:
            return jsonify({'error': 'Farm context must be an owned farm or null.'}), 400
        if not GEMINI_API_KEY:
            return offline_assistant_response(messages, 'provider_unconfigured')
        system_prompt += ("\n\nAccuracy and safety requirements: Never invent live mandi prices, official scheme eligibility, "
                          "disease diagnoses, model confidence, or sensor readings. For chemical inputs, do not guess "
                          "dosages; direct the farmer to the product label and a local agricultural extension officer. "
                          "Clearly state uncertainty and recommend local expert review when field conditions matter.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

        contents = []
        for msg in messages:
            role = "model" if msg["role"] == "assistant" else "user"
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })

        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": contents,
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 900},
        }

        response = requests.post(url, headers={"x-goog-api-key": GEMINI_API_KEY}, json=payload, timeout=(5, 45))
        if not response.ok:
            app.logger.warning("Gemini request rejected with HTTP %s", response.status_code)
            if response.status_code in (401, 403):
                message = 'Gemini rejected the configured API key or its permissions. Check GEMINI_API_KEY in backend/.env.'
            elif response.status_code == 404:
                message = f'The configured Gemini model ({GEMINI_MODEL}) is unavailable. Set GEMINI_MODEL to a model enabled for your API key.'
            elif response.status_code == 429:
                message = 'Gemini rate limit or quota was reached. Check the project quota and retry shortly.'
            elif response.status_code >= 500:
                message = 'Gemini is temporarily unavailable. Please retry shortly.'
            else:
                message = 'Gemini rejected the request. Check the model configuration and API project settings.'
            app.logger.warning("Gemini fallback enabled for HTTP %s", response.status_code)
            return offline_assistant_response(messages, 'provider_error', response.status_code)
        try:
            result = response.json()
        except ValueError:
            app.logger.warning("Gemini returned a non-JSON response")
            return offline_assistant_response(messages, 'invalid_provider_response')

        candidates = result.get("candidates") or []
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            reply = "\n".join(part.get("text", "") for part in parts if part.get("text")).strip()
            if not reply:
                return offline_assistant_response(messages, 'empty_provider_response')
            latest_question = str(messages[-1].get('content', ''))[:2000]
            record = FarmRecord(owner_id=user.id, farm_id=selected_farm.id if selected_farm else None, kind='assistant-chat',
                                payload=json.dumps({'question': latest_question, 'reply': reply[:8000]}, ensure_ascii=False))
            db.session.add(record)
            db.session.commit()
            return jsonify({"reply": reply})
        finish_reason = candidates[0].get("finishReason", "") if candidates else ""
        if finish_reason == "SAFETY":
            return jsonify({'error': 'The request was blocked by the provider safety filter. Please rephrase it as a farming question.', 'status': 'safety_block'}), 422
        return jsonify({'error': 'Gemini returned no answer. Please rephrase and try again.', 'status': 'empty_response'}), 502

    except requests.Timeout:
        app.logger.warning('Gemini request timed out')
        return offline_assistant_response(messages, 'provider_timeout')
    except requests.RequestException as error:
        # Do not log the request URL or exception text: provider URLs/headers can contain credentials.
        app.logger.warning('Gemini connection failed (%s)', type(error).__name__)
        return offline_assistant_response(messages, 'provider_unreachable')
    except Exception as error:
        app.logger.error('AI assistant request failed (%s)', type(error).__name__)
        return jsonify({'error': 'The AI assistant encountered an internal error. Please retry.', 'status': 'internal_error'}), 500

# Get all listings
@app.route('/api/listings', methods=['GET'])
def get_listings():
    try:
        crop = request.args.get('crop', '')
        state = request.args.get('state', '')

        query = Listing.query

        if request.args.get('mine') == 'true':
            user, error = authenticated_user()
            if error:
                return error
            query = query.join(ListingOwnership, ListingOwnership.listing_id == Listing.id).filter(ListingOwnership.owner_id == user.id)

        if crop:
            query = query.filter(
                Listing.crop.ilike(f'%{crop}%')
            )
        if state and state != 'All States':
            query = query.filter_by(state=state)

        listings = query.order_by(
            Listing.created_at.desc()
        ).all()

        return jsonify({
            # Contact details are private to listing owners. Buyers use the
            # authenticated inquiry flow instead of receiving phone numbers
            # from the public marketplace feed.
            'listings': [l.to_dict(include_phone=request.args.get('mine') == 'true') for l in listings]
        }), 200

    except Exception:
        app.logger.exception('Marketplace listing request failed')
        return jsonify({'error': 'Marketplace listings could not be loaded. Please retry.'}), 500


# Create new listing
@app.route('/api/listings', methods=['POST'])
@require_user
def create_listing(user):
    try:
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify({'error': 'Provide listing details as JSON.'}), 400

        farmer_name = str(data.get('farmerName') or '').strip()
        crop = str(data.get('crop') or '').strip()
        state = str(data.get('state') or '').strip()
        phone = str(data.get('phone') or '').strip()
        try:
            quantity = int(data.get('quantity') or 0)
            price = int(data.get('price') or 0)
        except (TypeError, ValueError):
            return jsonify({'error': 'Quantity and price must be whole numbers.'}), 400

        if not farmer_name or not crop or not state or not phone or quantity <= 0 or price <= 0:
            return jsonify({
                'error': 'Enter a farmer name, crop, positive quantity and price, state, and contact number.'
            }), 400
        if len(farmer_name) > 100 or len(crop) > 100 or len(state) > 50 or len(phone) > 15:
            return jsonify({'error': 'One or more listing fields are too long.'}), 400

        listing = Listing(
            farmer_name=farmer_name[:100],
            crop=crop[:100],
            quantity=quantity,
            price=price,
            unit=str(data.get('unit') or 'Quintal')[:20],
            state=state[:50],
            district=str(data.get('district') or '')[:50],
            quality=str(data.get('quality') or 'A Grade')[:20],
            harvest_date=str(data.get('harvestDate') or '')[:30],
            phone=phone,
            description=str(data.get('description') or '')[:500],
        )

        db.session.add(listing)
        db.session.flush()
        db.session.add(ListingOwnership(listing_id=listing.id, owner_id=user.id))
        db.session.commit()

        return jsonify({
            'message': 'Listing posted successfully!',
            'listing': listing.to_dict()
        }), 201

    except Exception:
        app.logger.exception('Marketplace listing creation failed')
        db.session.rollback()
        return jsonify({'error': 'The listing could not be created. Please check the details and retry.'}), 500

@app.route('/api/listings/<int:listing_id>/inquiries', methods=['POST'])
@require_user
def create_listing_inquiry(user, listing_id):
    listing = db.session.get(Listing, listing_id)
    if not listing:
        return jsonify({'error': 'Listing not found.'}), 404
    ownership = ListingOwnership.query.filter_by(listing_id=listing_id).first()
    if not ownership:
        return jsonify({'error': 'The farmer account for this legacy listing is unavailable for in-app inquiries.'}), 409
    if ownership.owner_id == user.id:
        return jsonify({'error': 'You cannot inquire about your own listing.'}), 400
    data = request.get_json(silent=True) or {}
    message = str(data.get('message', '')).strip()
    if not message or len(message) > 1000:
        return jsonify({'error': 'Enter an inquiry of 1 to 1,000 characters.'}), 400
    inquiry = ListingInquiry(listing_id=listing.id, buyer_id=user.id, farmer_id=ownership.owner_id, message=message)
    db.session.add(inquiry); db.session.commit()
    return jsonify({'inquiry': inquiry.to_dict()}), 201

@app.route('/api/inquiries/received', methods=['GET'])
@require_user
def received_inquiries(user):
    inquiries = ListingInquiry.query.filter_by(farmer_id=user.id).order_by(ListingInquiry.created_at.desc()).limit(100).all()
    return jsonify({'inquiries': [inquiry.to_dict() for inquiry in inquiries]})

@app.route('/api/inquiries/sent', methods=['GET'])
@require_user
def sent_inquiries(user):
    inquiries = ListingInquiry.query.filter_by(buyer_id=user.id).order_by(ListingInquiry.created_at.desc()).limit(100).all()
    return jsonify({'inquiries': [inquiry.to_dict() for inquiry in inquiries]})

@app.route('/api/inquiries/<int:inquiry_id>/reply', methods=['POST'])
@require_user
def reply_to_inquiry(user, inquiry_id):
    inquiry = ListingInquiry.query.filter_by(id=inquiry_id, farmer_id=user.id).first()
    if not inquiry:
        return jsonify({'error': 'Inquiry not found for this farmer account.'}), 404
    data = request.get_json(silent=True) or {}
    reply = str(data.get('reply', '')).strip()
    if not reply or len(reply) > 1000:
        return jsonify({'error': 'Enter a reply of 1 to 1,000 characters.'}), 400
    inquiry.farmer_reply = reply
    inquiry.replied_at = datetime.datetime.utcnow()
    db.session.commit()
    return jsonify({'inquiry': inquiry.to_dict()}), 200


# Delete listing
@app.route('/api/listings/<int:listing_id>', methods=['DELETE'])
@require_user
def delete_listing(user, listing_id):
    try:
        listing = db.session.get(Listing, listing_id)
        if not listing:
            return jsonify({'error': 'Listing not found'}), 404

        ownership = ListingOwnership.query.filter_by(listing_id=listing.id, owner_id=user.id).first()
        if not ownership:
            return jsonify({'error': 'You can only delete listings you created.'}), 403

        db.session.delete(ownership)
        db.session.delete(listing)
        db.session.commit()
        return jsonify({'message': 'Listing deleted!'}), 200

    except Exception:
        app.logger.exception('Marketplace listing deletion failed')
        db.session.rollback()
        return jsonify({'error': 'The listing could not be deleted. Please retry.'}), 500
    
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host=os.getenv("HOST", "127.0.0.1"), port=port)
