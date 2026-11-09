"""
Segmentation App - FastAPI Backend
Customer Segmentation & Targeted Promotions
"""

import os
import json
import time
import uvicorn
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from databricks.sdk import WorkspaceClient


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
WAREHOUSE_ID = os.environ.get("DATABRICKS_WAREHOUSE_ID", "")
CATALOG = os.environ.get("APP_CATALOG", "main")
SCHEMA = os.environ.get("APP_SCHEMA", "banking")

_w: WorkspaceClient | None = None


def _get_client() -> WorkspaceClient:
    global _w
    if _w is None:
        _w = WorkspaceClient()
    return _w


# ---------------------------------------------------------------------------
# SQL helper
# ---------------------------------------------------------------------------
def _exec(sql: str, max_rows: int = 1000) -> list[dict]:
    """Execute SQL via Statement Execution API. Returns list of dicts."""
    w = _get_client()
    try:
        resp = w.statement_execution.execute_statement(
            statement=sql,
            warehouse_id=WAREHOUSE_ID,
            wait_timeout="120s",
            row_limit=max_rows,
            catalog=CATALOG,
            schema=SCHEMA,
        )
        if resp.status and resp.status.state and resp.status.state.value == "FAILED":
            error_msg = resp.status.error.message if resp.status.error else "Unknown SQL error"
            raise Exception(error_msg)

        if not resp.manifest or not resp.result:
            return []

        columns = [c.name for c in resp.manifest.schema.columns]
        rows = []
        if resp.result.data_array:
            for row in resp.result.data_array:
                rows.append(dict(zip(columns, row)))
        return rows
    except Exception as e:
        err = str(e)
        if "TABLE_OR_VIEW_NOT_FOUND" in err or "SCHEMA_NOT_FOUND" in err:
            return []
        raise


def _safe_exec(sql: str, max_rows: int = 1000) -> list[dict]:
    """Execute SQL, returning empty list on any error (table not found, etc.)."""
    try:
        return _exec(sql, max_rows)
    except Exception as e:
        print(f"[WARN] SQL failed: {e}")
        return []


def _tbl(name: str) -> str:
    return f"`{CATALOG}`.`{SCHEMA}`.`{name}`"


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(lifespan=lifespan)


# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "healthy", "warehouse_id": WAREHOUSE_ID, "catalog": CATALOG}


@app.get("/api/segments")
def get_segments():
    """List all segment profiles."""
    rows = _safe_exec(f"SELECT * FROM {_tbl('05_cluster_profiles')}")
    if not rows:
        return {"segments": [], "pipeline_status": "pending"}
    return {"segments": rows}


@app.get("/api/segments/{segment_id}/customers")
def get_segment_customers(segment_id: str):
    """Get customers in a specific segment with their scores."""
    sql = f"""
    SELECT
        c.customer_id, c.first_name, c.last_name, c.gender, c.region, c.income, c.tier,
        s.segment,
        p.propensity_score, p.propensity_decile, p.predicted_responder,
        ch.churn_probability, ch.churn_risk_tier,
        l.estimated_clv, l.clv_tier
    FROM {_tbl('05_customer_reference_scored')} s
    JOIN {_tbl('01_raw_customers')} c ON s.customer_id = c.customer_id
    LEFT JOIN {_tbl('08_customer_propensity_scores')} p ON s.customer_id = p.customer_id
    LEFT JOIN {_tbl('11_churn_risk_scores')} ch ON s.customer_id = ch.customer_id
    LEFT JOIN {_tbl('12_customer_ltv')} l ON s.customer_id = l.customer_id
    WHERE CAST(s.segment AS STRING) = '{segment_id}'
    LIMIT 50
    """
    rows = _safe_exec(sql)
    return {"customers": rows}


@app.get("/api/customers/overview")
def customers_overview():
    """Summary KPIs."""
    # Total customers
    total = _safe_exec(f"SELECT COUNT(*) AS cnt FROM {_tbl('01_raw_customers')}")
    total_count = int(total[0]["cnt"]) if total else 0

    # Avg income
    avg_inc = _safe_exec(f"SELECT ROUND(AVG(CAST(income AS DOUBLE)), 0) AS avg_income FROM {_tbl('01_raw_customers')}")
    avg_income = avg_inc[0]["avg_income"] if avg_inc else 0

    # Segment count
    seg_cnt = _safe_exec(f"SELECT COUNT(DISTINCT segment) AS cnt FROM {_tbl('05_cluster_profiles')}")
    segment_count = int(seg_cnt[0]["cnt"]) if seg_cnt else 0

    # Avg CLV
    avg_clv = _safe_exec(f"SELECT ROUND(AVG(CAST(estimated_clv AS DOUBLE)), 0) AS avg_clv FROM {_tbl('12_customer_ltv')}")
    avg_clv_val = avg_clv[0]["avg_clv"] if avg_clv else 0

    # Avg propensity
    avg_prop = _safe_exec(f"SELECT ROUND(AVG(CAST(propensity_score AS DOUBLE)), 3) AS avg_prop FROM {_tbl('08_customer_propensity_scores')}")
    avg_prop_val = avg_prop[0]["avg_prop"] if avg_prop else 0

    # Customers by segment
    by_segment = _safe_exec(f"""
        SELECT CAST(segment AS STRING) AS segment, COUNT(*) AS count
        FROM {_tbl('05_customer_reference_scored')}
        GROUP BY segment ORDER BY count DESC
    """)

    # Churn distribution
    churn_dist = _safe_exec(f"""
        SELECT churn_risk_tier, COUNT(*) AS count
        FROM {_tbl('11_churn_risk_scores')}
        GROUP BY churn_risk_tier
    """)

    # CLV tiers
    clv_dist = _safe_exec(f"""
        SELECT clv_tier, COUNT(*) AS count
        FROM {_tbl('12_customer_ltv')}
        GROUP BY clv_tier ORDER BY count DESC
    """)

    return {
        "total_customers": total_count,
        "segment_count": segment_count,
        "avg_income": avg_income,
        "avg_clv": avg_clv_val,
        "avg_propensity": avg_prop_val,
        "customers_by_segment": by_segment,
        "churn_distribution": churn_dist,
        "clv_distribution": clv_dist,
    }


@app.get("/api/propensity/distribution")
def propensity_distribution():
    """Propensity score distribution by decile."""
    by_decile = _safe_exec(f"""
        SELECT CAST(propensity_decile AS INT) AS decile, COUNT(*) AS count,
               ROUND(AVG(CAST(propensity_score AS DOUBLE)), 3) AS avg_score
        FROM {_tbl('08_customer_propensity_scores')}
        GROUP BY propensity_decile ORDER BY decile
    """)

    responders = _safe_exec(f"""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN CAST(predicted_responder AS INT) = 1 THEN 1 ELSE 0 END) AS responders
        FROM {_tbl('08_customer_propensity_scores')}
    """)

    by_segment = _safe_exec(f"""
        SELECT CAST(s.segment AS STRING) AS segment,
               ROUND(AVG(CAST(p.propensity_score AS DOUBLE)), 3) AS avg_score,
               COUNT(*) AS count
        FROM {_tbl('08_customer_propensity_scores')} p
        JOIN {_tbl('05_customer_reference_scored')} s ON p.customer_id = s.customer_id
        GROUP BY s.segment ORDER BY avg_score DESC
    """)

    top_customers = _safe_exec(f"""
        SELECT p.customer_id, c.first_name, c.last_name, c.tier, c.region,
               p.propensity_score, p.propensity_decile, p.predicted_responder
        FROM {_tbl('08_customer_propensity_scores')} p
        JOIN {_tbl('01_raw_customers')} c ON p.customer_id = c.customer_id
        ORDER BY CAST(p.propensity_score AS DOUBLE) DESC
        LIMIT 20
    """)

    return {
        "by_decile": by_decile,
        "responder_stats": responders[0] if responders else {},
        "by_segment": by_segment,
        "top_customers": top_customers,
    }


@app.get("/api/churn/summary")
def churn_summary():
    """Churn risk distribution."""
    distribution = _safe_exec(f"""
        SELECT churn_risk_tier, COUNT(*) AS count,
               ROUND(AVG(CAST(churn_probability AS DOUBLE)), 3) AS avg_probability
        FROM {_tbl('11_churn_risk_scores')}
        GROUP BY churn_risk_tier
    """)

    total = _safe_exec(f"SELECT COUNT(*) AS cnt FROM {_tbl('11_churn_risk_scores')}")
    total_count = int(total[0]["cnt"]) if total else 0

    top_risk = _safe_exec(f"""
        SELECT ch.customer_id, c.first_name, c.last_name, c.tier, c.region, c.income,
               ch.churn_probability, ch.churn_risk_tier,
               l.estimated_clv, l.clv_tier
        FROM {_tbl('11_churn_risk_scores')} ch
        JOIN {_tbl('01_raw_customers')} c ON ch.customer_id = c.customer_id
        LEFT JOIN {_tbl('12_customer_ltv')} l ON ch.customer_id = l.customer_id
        ORDER BY CAST(ch.churn_probability AS DOUBLE) DESC
        LIMIT 20
    """)

    return {
        "distribution": distribution,
        "total": total_count,
        "top_risk_customers": top_risk,
    }


@app.get("/api/campaigns")
def get_campaigns():
    """Campaign copy and targets summary."""
    copy = _safe_exec(f"SELECT * FROM {_tbl('09_campaign_copy')}")

    targets_summary = _safe_exec(f"""
        SELECT CAST(segment AS STRING) AS segment, campaign_type,
               COUNT(*) AS target_count,
               ROUND(AVG(CAST(propensity_score AS DOUBLE)), 3) AS avg_propensity
        FROM {_tbl('09_campaign_targets')}
        GROUP BY segment, campaign_type ORDER BY target_count DESC
    """)

    total_targets = _safe_exec(f"SELECT COUNT(*) AS cnt FROM {_tbl('09_campaign_targets')}")

    return {
        "campaign_copy": copy,
        "targets_summary": targets_summary,
        "total_targets": int(total_targets[0]["cnt"]) if total_targets else 0,
    }


@app.get("/api/customers/{customer_id}")
def get_customer(customer_id: str):
    """Single customer detail."""
    cust = _safe_exec(f"SELECT * FROM {_tbl('01_raw_customers')} WHERE customer_id = '{customer_id}'")
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")

    segment = _safe_exec(f"SELECT * FROM {_tbl('05_customer_reference_scored')} WHERE customer_id = '{customer_id}'")
    propensity = _safe_exec(f"SELECT * FROM {_tbl('08_customer_propensity_scores')} WHERE customer_id = '{customer_id}'")
    churn = _safe_exec(f"SELECT * FROM {_tbl('11_churn_risk_scores')} WHERE customer_id = '{customer_id}'")
    ltv = _safe_exec(f"SELECT * FROM {_tbl('12_customer_ltv')} WHERE customer_id = '{customer_id}'")
    campaign = _safe_exec(f"SELECT * FROM {_tbl('09_campaign_targets')} WHERE customer_id = '{customer_id}'")

    return {
        "customer": cust[0] if cust else None,
        "segment": segment[0] if segment else None,
        "propensity": propensity[0] if propensity else None,
        "churn": churn[0] if churn else None,
        "ltv": ltv[0] if ltv else None,
        "campaign": campaign[0] if campaign else None,
    }


@app.get("/api/segment-drift")
def segment_drift():
    """Segment drift metrics."""
    rows = _safe_exec(f"SELECT * FROM {_tbl('10_segment_drift_metrics')}")
    return {"drift_metrics": rows}


@app.get("/api/ltv/distribution")
def ltv_distribution():
    """CLV distribution by tier."""
    by_tier = _safe_exec(f"""
        SELECT clv_tier, COUNT(*) AS count,
               ROUND(AVG(CAST(estimated_clv AS DOUBLE)), 0) AS avg_clv,
               ROUND(MIN(CAST(estimated_clv AS DOUBLE)), 0) AS min_clv,
               ROUND(MAX(CAST(estimated_clv AS DOUBLE)), 0) AS max_clv
        FROM {_tbl('12_customer_ltv')}
        GROUP BY clv_tier ORDER BY avg_clv DESC
    """)
    return {"by_tier": by_tier}


# ---------------------------------------------------------------------------
# Serve React Frontend
# ---------------------------------------------------------------------------
static_dir = Path(__file__).parent / "static"

if static_dir.exists():
    # Mount assets subdirectory for JS/CSS bundles
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Serve other static files (favicon, etc.)
    @app.get("/favicon.ico")
    async def favicon():
        fav = static_dir / "favicon.ico"
        if fav.exists():
            return FileResponse(str(fav))
        return {"status": "no favicon"}

    # SPA fallback — must be LAST
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept /api routes
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        index = static_dir / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return {"error": "Frontend not built. Run npm run build in frontend/."}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
