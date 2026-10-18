# KisanConnect

KisanConnect is a React and Flask farming assistant for Indian farmers. It includes a shared responsive SaaS navigation shell, farm dashboard, account-linked farm profiles, saved advisory history, safe irrigation and nutrient guidance, marketplace inquiries and replies, and links to official scheme portals. Recommendations and unavailable model states are labeled by their source and limitations.

## Technology

- Frontend: React, TypeScript, React Router, Vite, Tailwind CSS
- Backend: Flask, Flask-SQLAlchemy, SQLite, Flask-Bcrypt, JWT
- External providers: data.gov.in Agmarknet, Gemini, Open-Meteo, Nominatim

## Run locally

Requirements: Node.js 20.19+ (Vite 8), Python 3.9+, npm, and pip.

```sh
cd frontend
npm ci
npm run dev
```

The local `frontend/.env.local` points the frontend at `http://localhost:5000`. Copy `backend/.env.example` to `backend/.env`, then install and start the API:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The frontend is served at `http://localhost:5173` (Vite may choose the next available port). The backend is at `http://localhost:5000`.

For production, set a stable, randomly generated `SECRET_KEY`; do not rely on the development fallback. Set `DATABASE_URL` to a persistent database URL if SQLite's local file is not suitable. Set `GEMINI_API_KEY` to enable AI chat and `AGMARKNET_API_KEY` to enable official mandi data. Keys belong in backend environment configuration, never in frontend variables. Weather uses Open-Meteo and reverse geocoding uses Nominatim from the browser.

## Data and feature status

Farm profiles and farm-tool records are stored in the configured SQLAlchemy database and scoped to the signed-in account. Existing user and marketplace data remain in the existing database. The new tables are created additively on application startup.

| Feature | Current behavior | Status / dependency |
|---|---|---|
| Crop recommendations | Guided criteria workflow, farm prefill, persisted rules-based backend advice, and selected crop saving | Not a validated ML model; the guide does not estimate yield or profitability |
| Disease detection | Image upload validates type/size and reports the inference provider response honestly | Diagnosis is unavailable until a genuine model or inference provider is configured; no disease result is persisted |
| Weather | Open-Meteo current conditions and five-day forecast, including rainfall probability when supplied | External browser request; geolocation or profile-location lookup and provider network access are required |
| Irrigation | Saves rules-based advice against the selected account-owned farm | Rain and temperature are entered by the user; there is no connected sensor or automatic forecast handoff |
| Market prices | Queries data.gov.in; results are shown only when the provider returns them | Requires `AGMARKNET_API_KEY`; the local provider check returned HTTP 502 and no live records |
| Marketplace | Listings persist; owner-only deletion, stored buyer inquiries, farmer replies, and owner-private contact fields | Public listing feed omits seller phone numbers; listing editing and completed transactions are not implemented |
| Fertilizer and pesticide advisor | Crop/observation-based general safety guidance is stored with farm context | Does not calculate a dosage or prescribe products; disease-result context is unavailable without inference |
| Yield prediction | Saves an unavailable-model record without showing a made-up yield | Blocked until a validated model and local training data are supplied |
| Government schemes | Searchable directory of official government portals | No eligibility engine, saved-scheme workflow, or application tracking; verify details at each official portal |
| AI assistant | Gemini-backed text chat accepts selected-farm context and stores successful exchanges; browser speech features are supported when available | Requires `GEMINI_API_KEY`; provider behavior and speech support depend on the runtime environment |

The selected farm is stored in browser state and reused by Farm Tools, crop results, and the assistant. Farm profiles and crop selections remain account-owned in the database. The application does not claim that a device sensor, disease classifier, trained yield model, live price feed, or scheme eligibility engine exists when it is not configured. Public marketplace responses omit contact numbers; owners can see contact details on their own listings, and buyers can contact sellers through authenticated inquiries.

## Verification

Frontend build:

```sh
cd frontend && npm run build
```

Backend API tests:

```sh
cd backend
PYTHONPYCACHEPREFIX=/tmp/smartcrop-pycache ./.venv/bin/python -m unittest discover -s tests -v
```

The tests use a temporary SQLite database. They cover farm ownership and persistence, crop selection, advisory persistence and validation, unavailable model states, marketplace listing ownership, private contact fields, buyer inquiries and farmer replies, and official scheme links.
