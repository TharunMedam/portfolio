# E-Survey Data Platform

Runnable portfolio implementation for the resume project covering survey submission, input validation, report generation, filtered retrieval, and stakeholder-friendly summaries.

## Run

```powershell
cd projects/esurvey
npm start
```

Open `http://localhost:4200`.

## API

- `POST /api/responses` validates and stores a survey response.
- `GET /api/responses?department=Support` filters structured records.
- `GET /api/reports/summary` returns aggregate satisfaction, NPS, department, and recommendation metrics.

The project uses an in-memory dataset so it can run locally without database setup. The reporting module mirrors the cleaning, aggregation, and structured report workflow described in the resume.
