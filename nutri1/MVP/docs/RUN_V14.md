# Run V14 prototype

## Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

## Frontend prototype
Open `web/index.html` in a browser.

For production, serve the frontend from a secure web host and connect it to the FastAPI backend.

## Database
Apply:
1. database/schema_unified.sql
2. database/schema_v14_extensions.sql

Then seed country/language/food data using approved national datasets.
