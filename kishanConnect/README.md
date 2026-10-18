# KisanConnect

KisanConnect is a farming support website for Indian farmers. I built it with a React frontend and a Flask backend.

The website includes:

- farmer registration and login
- farm profiles and farm records
- crop recommendations
- disease image upload
- weather information
- irrigation and fertilizer guidance
- market prices
- farmer marketplace and inquiries
- government scheme links
- AI farming assistant

## Tech used

- React, TypeScript, React Router, Vite and Tailwind CSS
- Flask, SQLAlchemy, SQLite, Flask-Bcrypt and JWT
- Open-Meteo and Nominatim for weather and location data
- Gemini for the AI assistant when an API key is configured
- data.gov.in / Agmarknet for market prices when an API key is configured

## Run the project locally

You need Node.js, npm, Python 3.9 or newer, and pip.

Start the backend:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Start the frontend in another terminal:

```sh
cd frontend
npm ci
npm run dev
```

The frontend normally runs at `http://localhost:5173` and the backend at `http://localhost:5000`.

For local environment setup, copy `backend/.env.example` to `backend/.env`. Add a strong `SECRET_KEY` and add `GEMINI_API_KEY` or `AGMARKNET_API_KEY` only if those features are needed. Do not put private keys in frontend files.

## Current status

Most features are connected to the backend and save data for the signed-in farmer. Crop advice and irrigation guidance are rules-based. Disease detection and yield prediction need a real model or provider before they can give model-generated results. Weather and market data depend on the external providers being available.

The application does not show made-up disease, yield, price, or scheme eligibility results. It shows an unavailable state when the required provider or model is not configured.

## Check the project

Build the frontend:

```sh
cd frontend
npm run build
```

Run the backend tests:

```sh
cd backend
PYTHONPYCACHEPREFIX=/tmp/kisanconnect-pycache ./.venv/bin/python -m unittest discover -s tests -v
```

The tests use a temporary SQLite database and cover account-owned farms, crop selections, advisory records, marketplace ownership, inquiries, replies, and unavailable provider states.
