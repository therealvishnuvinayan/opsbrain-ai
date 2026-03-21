# OpsBrain AI Backend (FastAPI)

Async FastAPI backend for OpsBrain AI with:
- Entity lookup (`orders`, `customers`, `suppliers`) from Postgres
- Knowledge ingestion into `pgvector`
- RAG endpoint: `POST /api/ask`

## Stack
- Python 3.11+
- FastAPI + Uvicorn
- SQLAlchemy 2.0 async + asyncpg
- SQLAlchemy sync migrations via psycopg (Alembic)
- Alembic migrations
- pgvector
- OpenAI SDK for live OpsBrain responses

## Project Structure
```text
backend/
  app/
    main.py
    core/
    db/
      session.py
      base.py
      migrations/
    models/
    schemas/
    services/
    api/
  Dockerfile
  docker-compose.yml
  requirements.txt
  .env.example
  alembic.ini
```

## Environment
1. Copy env template:
```bash
cp .env.example .env
```

2. Update values as needed:
- `DATABASE_URL`
- `SYNC_DATABASE_URL`
- `OPENAI_API_KEY` (optional)
- `CORS_ORIGINS` (defaults include Next.js dev at `http://localhost:3000`)
  - If you open frontend via LAN IP (for example `http://192.168.1.143:3000`), add that origin here too.

Suggested DSN formats:
- `DATABASE_URL=postgresql+asyncpg://...`
- `SYNC_DATABASE_URL=postgresql+psycopg://...`

## Run with Docker
From `backend/`:
```bash
docker compose up --build
```

Backend: `http://localhost:8000`

Postgres: `localhost:5433` by default

If `5433` is also occupied, override the host bind:
```bash
POSTGRES_HOST_PORT=5434 docker compose up --build
```

## Local Run (without Docker)
From `backend/`:
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Migrations
Create new migration:
```bash
alembic revision -m "your_change"
```

Apply migration:
```bash
alembic upgrade head
```

## Seed Demo Data
```bash
python -m app.db.seed
```

## API Endpoints
Base prefix: `/api`

- `GET /api/health`
- `GET /api/operations/orders?query=&status=&limit=`
- `GET /api/operations/customers?query=&limit=`
- `GET /api/operations/suppliers?query=&limit=`
- `GET /api/operations/orders/{order_number}`
- `POST /api/knowledge/sources`
- `POST /api/knowledge/ingest`
- `GET /api/knowledge/search?query=&k=`
- `POST /api/ask`

## curl Examples
Health:
```bash
curl http://localhost:8000/api/health
```

Create knowledge source:
```bash
curl -X POST http://localhost:8000/api/knowledge/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Supplier Incident Notes",
    "type": "note",
    "status": "processing",
    "access": "internal",
    "owner": "ops@opsbrain.ai",
    "tags": ["supplier", "incidents"]
  }'
```

Ingest text:
```bash
curl -X POST http://localhost:8000/api/knowledge/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source_id": "<SOURCE_UUID>",
    "text": "Eneba reported intermittent API latency between 09:00 and 10:30 UTC...",
    "chunk_size": 500,
    "chunk_overlap": 100
  }'
```

Search knowledge:
```bash
curl "http://localhost:8000/api/knowledge/search?query=eneba%20latency&k=5"
```

Ask endpoint:
```bash
curl -X POST http://localhost:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Why is OB-24832 delayed?",
    "entity_hints": {
      "order_numbers": ["OB-24832"],
      "customer_ids": [],
      "supplier_ids": []
    },
    "k": 6
  }'
```

## Frontend Integration Note
Set this in Next.js env when ready:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Notes
- If `OPENAI_API_KEY` is not set, `/api/ask` returns `503` instead of generating fallback reasoning.
- Embeddings are optional fallback: if unavailable, ingestion stores chunks without vectors and search falls back to `ILIKE`.
