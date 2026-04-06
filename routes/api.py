"""
API routes — JSON endpoints consumed by the frontend.

Security note
-------------
* Column names in the dynamic search query are validated against
  TRANSACTION_ALLOWED_COLUMNS (whitelist) to prevent SQL injection.
* Values are passed as bound parameters via SQLAlchemy text() — never
  interpolated into the query string.
"""
from flask import Blueprint, jsonify, request, current_app
from constants import (
    SAMPLE_DATA,
    TRANSACTION_TABLE,
    TRANSACTION_ALLOWED_COLUMNS,
    ALLOWED_OPERATORS,
)

api_bp = Blueprint("api", __name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fetch_transaction_data(limit=None):
    cfg    = current_app.config["APP_CONFIG"]
    db     = current_app.db
    logger = current_app.app_logger
    try:
        sql  = f"SELECT * FROM {TRANSACTION_TABLE}"
        data = db.fetch_all(sql, limit=limit or cfg.DB_QUERY_LIMIT)
        logger.info(f"Fetched {len(data)} transaction records")
        return data
    except Exception as exc:
        logger.error(f"Error fetching transaction data: {exc}")
        return []


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@api_bp.route("/data")
def api_data():
    """Return sample/demo data."""
    current_app.app_logger.info("GET /api/data")
    return jsonify(SAMPLE_DATA)


@api_bp.route("/transaction")
def api_transaction():
    """Return transaction records (paginated by limit query-param)."""
    limit = request.args.get("limit", type=int)
    current_app.app_logger.info(f"GET /api/transaction (limit={limit})")
    return jsonify(_fetch_transaction_data(limit=limit))


@api_bp.route("/transaction/search", methods=["POST"])
def api_transaction_search():
    """
    Server-side search on the transaction table.

    Request body (JSON):
    {
        "conditions": [
            {"column": "tr_part", "operator": "contains", "value": "ABC"}
        ],
        "limit": 100
    }
    Operators: contains | equals | startswith
    """
    cfg    = current_app.config["APP_CONFIG"]
    db     = current_app.db
    logger = current_app.app_logger

    body       = request.get_json(silent=True) or {}
    conditions = body.get("conditions", [])
    limit      = body.get("limit", cfg.DB_QUERY_LIMIT)

    logger.info(f"POST /api/transaction/search — {len(conditions)} condition(s)")

    where_clauses: list[str] = []
    params: dict[str, str]   = {}

    for idx, cond in enumerate(conditions):
        column   = cond.get("column",   "").strip()
        operator = cond.get("operator", "contains").strip().lower()
        value    = cond.get("value",    "").strip()

        if not column or not value:
            continue

        # --- Security: reject unknown columns ---
        if column not in TRANSACTION_ALLOWED_COLUMNS:
            logger.warning(f"Search rejected: invalid column {column!r}")
            continue

        # --- Security: normalise operator ---
        if operator not in ALLOWED_OPERATORS:
            operator = "contains"

        # --- Build parameterised clause ---
        param_key = f"val_{idx}"
        if operator == "equals":
            where_clauses.append(f"[{column}] = :{param_key}")
            params[param_key] = value
        elif operator == "startswith":
            where_clauses.append(f"[{column}] LIKE :{param_key}")
            params[param_key] = f"{value}%"
        else:  # contains
            where_clauses.append(f"[{column}] LIKE :{param_key}")
            params[param_key] = f"%{value}%"

    base_sql = f"SELECT * FROM {TRANSACTION_TABLE}"
    sql = f"{base_sql} WHERE {' AND '.join(where_clauses)}" if where_clauses else base_sql

    try:
        data = db.fetch_all(sql, limit=limit, params=params)
        logger.info(f"Search returned {len(data)} rows")
        return jsonify({
            "success": True,
            "count":   len(data),
            "data":    data,
            # Only expose the raw SQL in debug mode to aid development
            "query":   sql if cfg.DEBUG else None,
        })
    except Exception as exc:
        logger.error(f"Search error: {exc}")
        return jsonify({
            "success": False,
            "error":   "Search failed — see server logs for details.",
            "count":   0,
            "data":    [],
        }), 500
