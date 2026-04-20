"""
API routes — JSON endpoints consumed by the frontend.

Security note
-------------
* Column names in the dynamic search query are validated against
  table-specific whitelists to prevent SQL injection.
* Values are passed as bound parameters via SQLAlchemy text() — never
  interpolated into the query string.
"""
from math import ceil
import re
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy import text
from constants import (
    SAMPLE_DATA,
    TRANSACTION_TABLE,
    ALLOWED_OPERATORS,
    SEARCH_TABLES,
)

api_bp = Blueprint("api", __name__)

MAX_PAGE_SIZE = 500
DEFAULT_PAGE_SIZE = 100


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


def _normalise_pagination(raw_page, raw_page_size, default_page_size=DEFAULT_PAGE_SIZE):
    """Normalise and clamp page inputs."""
    try:
        page = int(raw_page)
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(raw_page_size)
    except (TypeError, ValueError):
        page_size = default_page_size

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = default_page_size

    page_size = min(page_size, MAX_PAGE_SIZE)
    offset = (page - 1) * page_size
    return page, page_size, offset


def _build_search_filters(conditions, allowed_columns, logger, column_types=None):
    """Build WHERE clauses + params safely from validated conditions.

    Operators:
        equals, not_equals, contains, range, startswith,
        greater_than, less_than, is_null, is_not_null

    Date/datetime columns are compared using CAST/CONVERT with style 103
    (dd/mm/yyyy) so that user-supplied values match the display format.
    """
    where_clauses = []
    params = {}
    column_types = column_types or {}

    for idx, cond in enumerate(conditions):
        column = cond.get("column", "").strip()
        operator = cond.get("operator", "contains").strip().lower()
        value = cond.get("value", "").strip()
        value2 = cond.get("value2", "").strip()

        if not column:
            continue

        if column not in allowed_columns:
            logger.warning(f"Search rejected: invalid column {column!r}")
            continue

        if operator not in ALLOWED_OPERATORS:
            operator = "contains"

        # is_null / is_not_null don't need a value
        if operator == "is_null":
            where_clauses.append(f"[{column}] IS NULL")
            continue
        if operator == "is_not_null":
            where_clauses.append(f"[{column}] IS NOT NULL")
            continue

        # All other operators require a value
        if not value:
            continue

        col_type = column_types.get(column, "")
        is_date = col_type in _DATE_TYPES

        param_key = f"val_{idx}"
        param_key2 = f"val2_{idx}"

        if is_date:
            # Date comparisons — use CAST to DATE for proper comparison
            date_col = f"CAST([{column}] AS DATE)"
            date_val = f"CONVERT(DATE, :{param_key}, 103)"

            if operator == "equals":
                where_clauses.append(f"{date_col} = {date_val}")
                params[param_key] = value
            elif operator == "not_equals":
                where_clauses.append(f"{date_col} <> {date_val}")
                params[param_key] = value
            elif operator == "greater_than":
                where_clauses.append(f"{date_col} >= {date_val}")
                params[param_key] = value
            elif operator == "less_than":
                where_clauses.append(f"{date_col} <= {date_val}")
                params[param_key] = value
            elif operator == "range":
                if value2:
                    date_val2 = f"CONVERT(DATE, :{param_key2}, 103)"
                    where_clauses.append(
                        f"{date_col} BETWEEN {date_val} AND {date_val2}"
                    )
                    params[param_key] = value
                    params[param_key2] = value2
                else:
                    where_clauses.append(f"{date_col} = {date_val}")
                    params[param_key] = value
            else:
                # contains / startswith → text search on formatted string
                col_expr = f"CONVERT(VARCHAR, [{column}], 103)"
                if operator == "startswith":
                    where_clauses.append(f"{col_expr} LIKE :{param_key}")
                    params[param_key] = f"{value}%"
                else:
                    where_clauses.append(f"{col_expr} LIKE :{param_key}")
                    params[param_key] = f"%{value}%"
        else:
            # Text / numeric columns
            col_expr = f"[{column}]"

            if operator == "equals":
                where_clauses.append(f"{col_expr} = :{param_key}")
                params[param_key] = value
            elif operator == "not_equals":
                where_clauses.append(f"{col_expr} <> :{param_key}")
                params[param_key] = value
            elif operator == "startswith":
                where_clauses.append(f"{col_expr} LIKE :{param_key}")
                params[param_key] = f"{value}%"
            elif operator == "greater_than":
                where_clauses.append(f"{col_expr} > :{param_key}")
                params[param_key] = value
            elif operator == "less_than":
                where_clauses.append(f"{col_expr} < :{param_key}")
                params[param_key] = value
            elif operator == "range":
                if value2:
                    where_clauses.append(
                        f"{col_expr} >= :{param_key} AND {col_expr} <= :{param_key2}"
                    )
                    params[param_key] = value
                    params[param_key2] = value2
                else:
                    where_clauses.append(f"{col_expr} = :{param_key}")
                    params[param_key] = value
            else:  # contains
                where_clauses.append(f"{col_expr} LIKE :{param_key}")
                params[param_key] = f"%{value}%"

    return where_clauses, params


def _extract_table_parts(qualified_table_name):
    """Extract [catalog].[schema].[table] parts from SQL Server quoted name."""
    match = re.match(r"^\[(.+?)\]\.\[(.+?)\]\.\[(.+?)\]$", qualified_table_name)
    if not match:
        return None, None, None
    return match.group(1), match.group(2), match.group(3)


# SQL Server date/time data types (used to detect date columns)
_DATE_TYPES = frozenset([
    'date', 'datetime', 'datetime2', 'smalldatetime', 'datetimeoffset', 'time',
])


def _fetch_table_columns(db, qualified_table_name, allowed_columns=None):
    """Return (ordered column list, column_types dict) from INFORMATION_SCHEMA."""
    _, schema_name, table_name = _extract_table_parts(qualified_table_name)
    if not schema_name or not table_name:
        cols = sorted(list(allowed_columns or []))
        return cols, {}

    sql = """
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = :schema_name
          AND TABLE_NAME = :table_name
        ORDER BY ORDINAL_POSITION
    """

    with db.get_connection() as connection:
        result = connection.execute(text(sql), {
            "schema_name": schema_name,
            "table_name": table_name,
        })
        rows = result.fetchall()

    columns = []
    column_types = {}
    for row in rows:
        col_name = row._mapping.get("COLUMN_NAME")
        data_type = (row._mapping.get("DATA_TYPE") or "").lower()
        if not col_name:
            continue
        columns.append(col_name)
        column_types[col_name] = data_type

    if allowed_columns:
        allowed = set(allowed_columns)
        columns = [c for c in columns if c in allowed]
        column_types = {k: v for k, v in column_types.items() if k in allowed}

    if not columns:
        cols = sorted(list(allowed_columns or []))
        return cols, {}
    return columns, column_types


def _resolve_allowed_columns(db, table_config):
    """Resolve allowed columns and types from config or metadata fallback."""
    configured_allowed = table_config.get('allowed_columns')
    columns, column_types = _fetch_table_columns(
        db=db,
        qualified_table_name=table_config['table_name'],
        allowed_columns=configured_allowed,
    )
    return columns, column_types


def _resolve_transaction_allowed_columns(db):
    """Resolve transaction columns and types from DB metadata."""
    columns, column_types = _fetch_table_columns(
        db=db,
        qualified_table_name=TRANSACTION_TABLE,
        allowed_columns=None,
    )
    return columns or [], column_types


def _execute_paginated_query(db, base_sql, where_clauses, params, page, page_size, order_by_sql):
    """Run COUNT + paged SELECT and return data with paging metadata."""
    where_sql = f" WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    filtered_sql = f"{base_sql}{where_sql}"

    count_sql = f"SELECT COUNT(1) AS total_count FROM ({filtered_sql}) AS q"
    data_sql = (
        f"{filtered_sql} "
        f"ORDER BY {order_by_sql} "
        "OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY"
    )

    offset = (page - 1) * page_size
    data_params = dict(params)
    data_params["offset"] = offset
    data_params["page_size"] = page_size

    with db.get_connection() as connection:
        total_row = connection.execute(text(count_sql), params).fetchone()
        total = int(total_row._mapping.get("total_count", 0)) if total_row else 0

        result = connection.execute(text(data_sql), data_params)
        rows = result.fetchall()
        data = [dict(row._mapping) for row in rows]

    total_pages = ceil(total / page_size) if total > 0 else 0
    return data, total, total_pages


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
    """Return transaction records (client-side pagination)."""
    limit = request.args.get("limit", type=int)
    current_app.app_logger.info(f"GET /api/transaction (limit={limit})")
    return jsonify(_fetch_transaction_data(limit=limit))


@api_bp.route("/transaction/columns")
def api_transaction_columns():
    """Return ordered searchable columns from transaction view metadata."""
    db = current_app.db
    logger = current_app.app_logger

    try:
        columns, column_types = _resolve_transaction_allowed_columns(db)
        date_columns = [c for c, t in column_types.items() if t in _DATE_TYPES]
        logger.info(f"GET /api/transaction/columns -> {len(columns)} column(s)")
        return jsonify({
            "success": True,
            "columns": columns,
            "date_columns": date_columns,
        })
    except Exception as exc:
        logger.error(f"Failed to fetch transaction columns: {exc}")
        return jsonify({
            "success": False,
            "columns": [],
            "date_columns": [],
            "error": "Cannot load columns from metadata",
        }), 200


@api_bp.route("/transaction/search", methods=["POST"])
def api_transaction_search():
    """
    Server-side search on the transaction table (client-side pagination).

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

    allowed_columns, column_types = _resolve_transaction_allowed_columns(db)

    where_clauses, params = _build_search_filters(
        conditions=conditions,
        allowed_columns=allowed_columns,
        logger=logger,
        column_types=column_types,
    )

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


@api_bp.route("/search/<table_id>/columns")
def api_generic_search_columns(table_id):
    """Return ordered searchable columns for a configured table from metadata."""
    db = current_app.db
    logger = current_app.app_logger

    if table_id not in SEARCH_TABLES:
        logger.warning(f"Invalid table_id for columns: {table_id}")
        return jsonify({
            "success": False,
            "columns": [],
            "error": f"Unknown table: {table_id}",
        }), 400

    table_config = SEARCH_TABLES[table_id]
    try:
        columns, column_types = _resolve_allowed_columns(db=db, table_config=table_config)
        date_columns = [c for c, t in column_types.items() if t in _DATE_TYPES]
        logger.info(f"GET /api/search/{table_id}/columns -> {len(columns)} column(s)")
        return jsonify({
            "success": True,
            "columns": columns,
            "date_columns": date_columns,
        })
    except Exception as exc:
        logger.error(f"Failed to fetch columns for {table_id}: {exc}")
        fallback = table_config.get('allowed_columns') or []
        return jsonify({
            "success": False,
            "columns": sorted(list(fallback)),
            "date_columns": [],
            "error": "Cannot load columns from metadata",
        }), 200


@api_bp.route("/search/<table_id>/data")
def api_generic_data(table_id):
    """Return default rows for a configured table (client-side pagination in frontend)."""
    cfg = current_app.config["APP_CONFIG"]
    db = current_app.db
    logger = current_app.app_logger

    if table_id not in SEARCH_TABLES:
        logger.warning(f"Invalid table_id for data: {table_id}")
        return jsonify({
            "success": False,
            "error": f"Unknown table: {table_id}",
            "count": 0,
            "data": [],
        }), 400

    table_config = SEARCH_TABLES[table_id]
    limit = request.args.get("limit", type=int) or cfg.DB_QUERY_LIMIT
    sql = f"SELECT * FROM {table_config['table_name']}"

    try:
        data = db.fetch_all(sql, limit=limit)
        logger.info(f"GET /api/search/{table_id}/data (limit={limit}) -> {len(data)} rows")
        return jsonify({
            "success": True,
            "count": len(data),
            "data": data,
        })
    except Exception as exc:
        logger.error(f"Data load error on {table_id}: {exc}")
        return jsonify({
            "success": False,
            "error": "Data load failed — see server logs for details.",
            "count": 0,
            "data": [],
        }), 500


# ---------------------------------------------------------------------------
# Generic multi-table search endpoint
# ---------------------------------------------------------------------------

@api_bp.route("/search/<table_id>", methods=["POST"])
def api_generic_search(table_id):
    """
    Generic server-side search on any configured table (client-side pagination).
    
    URL: POST /api/search/<table_id>
    table_id: 'transaction', 'workorder', 'salesorder', etc.
    
    Request body (JSON):
    {
        "conditions": [
            {"column": "column_name", "operator": "contains", "value": "search_value"}
        ],
        "limit": 100
    }
    """
    cfg    = current_app.config["APP_CONFIG"]
    db     = current_app.db
    logger = current_app.app_logger

    # Validate table_id
    if table_id not in SEARCH_TABLES:
        logger.warning(f"Invalid table_id: {table_id}")
        return jsonify({
            "success": False,
            "error":   f"Unknown table: {table_id}",
            "count":   0,
            "data":    [],
        }), 400

    table_config = SEARCH_TABLES[table_id]
    table_name = table_config['table_name']
    allowed_columns, column_types = _resolve_allowed_columns(db=db, table_config=table_config)

    body       = request.get_json(silent=True) or {}
    conditions = body.get("conditions", [])
    limit      = body.get("limit", cfg.DB_QUERY_LIMIT)

    logger.info(f"POST /api/search/{table_id} — {len(conditions)} condition(s)")

    where_clauses, params = _build_search_filters(
        conditions=conditions,
        allowed_columns=allowed_columns,
        logger=logger,
        column_types=column_types,
    )

    base_sql = f"SELECT * FROM {table_name}"
    sql = f"{base_sql} WHERE {' AND '.join(where_clauses)}" if where_clauses else base_sql

    try:
        data = db.fetch_all(sql, limit=limit, params=params)
        logger.info(f"Search on {table_id} returned {len(data)} rows")
        return jsonify({
            "success": True,
            "count":   len(data),
            "data":    data,
            "query":   sql if cfg.DEBUG else None,
        })
    except Exception as exc:
        logger.error(f"Search error on {table_id}: {exc}")
        return jsonify({
            "success": False,
            "error":   "Search failed — see server logs for details.",
            "count":   0,
            "data":    [],
        }), 500
