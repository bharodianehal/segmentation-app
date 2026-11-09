# Segmentation App: Customer Segmentation & Targeted Promotions

A Databricks App (FastAPI backend + React/Vite/Tailwind frontend) that presents the output of the
[customer-segmentation](https://github.com/bharodianehal/customer-segmentation) notebook pipeline to marketing users.
It shows customer segments, segment drift, propensity, churn risk, customer lifetime value (CLV) and campaign
targeting. All data is **synthetic**.

> See [DISCLAIMER.md](DISCLAIMER.md). This is a demonstration project, not a supported product.

## What it shows

| Area | API | Source table (in `<catalog>.<schema>`) |
|---|---|---|
| Overview KPIs | `GET /api/customers/overview` | `01_raw_customers`, `05_cluster_profiles`, `08_customer_propensity_scores`, `11_churn_risk_scores`, `12_customer_ltv` |
| Segments | `GET /api/segments`, `GET /api/segments/{id}/customers` | `05_cluster_profiles`, `05_customer_reference_scored` |
| Propensity | `GET /api/propensity/distribution` | `08_customer_propensity_scores` |
| Churn | `GET /api/churn/summary` | `11_churn_risk_scores` |
| Campaigns | `GET /api/campaigns` | campaign targeting output (notebook 09) |
| Customer 360 | `GET /api/customers/{customer_id}` | joined segment / score tables |
| Segment drift | `GET /api/segment-drift` | dynamic segmentation output (notebook 10) |
| CLV | `GET /api/ltv/distribution` | `12_customer_ltv` |

SQL runs through the Databricks SQL Statement Execution API on a SQL warehouse, with the app's service principal
(`databricks-sdk` `WorkspaceClient`).

## Prerequisites

- A Databricks workspace with Unity Catalog, a SQL warehouse and Databricks Apps.
- The tables above, built by the `customer-segmentation` notebooks (01 to 12).
- Databricks CLI, authenticated (`databricks auth login --profile <profile>`).

## Configure and deploy

1. Edit `app.yaml`:
   - `DATABRICKS_WAREHOUSE_ID`: your SQL warehouse ID
   - `APP_CATALOG` / `APP_SCHEMA`: where the segmentation tables live (defaults `main` / `banking`)
2. (Optional) Rebuild the frontend: `cd frontend && npm install && npm run build` (the output goes to `static/`).
3. Deploy:
   ```bash
   databricks apps create segmentation-app --profile <profile>
   databricks sync . /Workspace/Users/<you>/segmentation-app --profile <profile>
   databricks apps deploy segmentation-app --source-code-path /Workspace/Users/<you>/segmentation-app --profile <profile>
   ```
4. Grant the app's service principal `CAN USE` on the warehouse and `USE CATALOG`/`USE SCHEMA`/`SELECT` on the schema.

## Run locally

```bash
pip install -r requirements.txt
export DATABRICKS_CONFIG_PROFILE=<profile> DATABRICKS_WAREHOUSE_ID=<warehouse-id> APP_CATALOG=main APP_SCHEMA=banking
python app.py
```

## Disclaimer

Educational/demo use only, synthetic data, no warranty. See [DISCLAIMER.md](DISCLAIMER.md).
