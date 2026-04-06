# NRI Transaction Tracking System

Flask web application for searching and viewing transaction history data from SQL Server (QAD ERP).

---

## Features

- **Transaction History Search** — Dynamic multi-condition search with column whitelist and parameterized queries (SQL-injection safe)
- **Dashboard View** — Overview panel with sample data loaded via REST API
- **Multi-view Sidebar** — Work Order, Sales Order, Purchase Order, Quality, and more
- **Application Factory Pattern** — Blueprint-based modular routing
- **SQL Server Integration** — SQLAlchemy connection pool with `ODBC Driver 18 for SQL Server`
- **Production Ready** — Waitress WSGI server for Windows deployment
- **Environment-based Config** — All secrets in `.env`, never hardcoded
- **Thread-safe Logging** — Daily rotating log files under `Log/`

---

## Tech Stack

| Layer      | Technology                                     |
|------------|------------------------------------------------|
| Backend    | Python 3.10+, Flask 2.3+                       |
| ORM / DB   | SQLAlchemy 2.0+, pyodbc, SQL Server (ODBC 18)  |
| Frontend   | Vanilla JS (ES2020), HTML5, CSS3               |
| Config     | python-dotenv                                  |
| Production | Waitress 2.1+                                  |

---

## Project Structure

```text
tracuuqad/
├── app.py                  # Application factory (create_app)
├── config.py               # Environment-based configuration classes
├── constants.py            # Security whitelist, enums, sample data
├── database.py             # DatabaseManager — connection pool, fetch_all()
├── log.py                  # Thread-safe daily-rotating logger
├── wsgi.py                 # Production WSGI entry-point
├── requirements.txt
├── test.py                 # DB connectivity & query tests
├── .env.example            # Config template — copy to .env
│
├── routes/
│   ├── pages.py            # Page blueprints:  GET /   GET /health
│   └── api.py              # API blueprints:   /api/data  /api/transaction  /api/transaction/search
│
├── templates/
│   ├── index.html          # Shell layout
│   ├── _dashboard.html     # Dashboard partial
│   ├── _transaction.html   # Transaction History partial
│   └── _other.html         # Other views partial
│
├── static/
│   ├── css/style.css
│   └── js/
│       ├── script.js       # Sidebar, view-switching, dashboard data
│       └── transaction.js  # Transaction search logic
│
└── Log/                    # Runtime log files (gitignored)
```

---

## Requirements

- Python 3.10 or newer
- Microsoft [ODBC Driver 18 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
- Access to a SQL Server instance with the `Data_qad` database

---

## Setup

### 1. Create virtual environment

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux / macOS
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment

```bash
copy .env.example .env
```

Edit `.env` and fill in your actual values:

```ini
FLASK_ENV=development
SECRET_KEY=<generate-a-long-random-string>

DB_SERVER=10.x.x.x
DB_DATABASE=Data_qad
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_DRIVER=ODBC Driver 18 for SQL Server
DB_QUERY_LIMIT=100

HOST=0.0.0.0
PORT=5000
LOG_LEVEL=INFO
```

> **Tip** — Generate a secret key:
>
> ```bash
> python -c "import secrets; print(secrets.token_hex(32))"
> ```

---

## Running

### Development

```bash
python app.py
```

Server starts at `http://127.0.0.1:5000`.  
If the database is unreachable the app still starts and logs a WARNING — the UI loads but data calls return errors.

### Production (Windows — Waitress)

```bash
waitress-serve --host=0.0.0.0 --port=5000 wsgi:app
```

### Production (Linux / Docker — Gunicorn)

```bash
gunicorn --workers=4 --bind=0.0.0.0:5000 wsgi:app
```

---

## API Endpoints

| Method | Path                      | Description                               |
|--------|---------------------------|-------------------------------------------|
| GET    | `/`                       | Main dashboard (HTML)                     |
| GET    | `/health`                 | Health check — returns DB status (JSON)   |
| GET    | `/api/data`               | Sample/demo dataset (JSON)                |
| GET    | `/api/transaction`        | Transaction records; optional `?limit=N`  |
| POST   | `/api/transaction/search` | Dynamic server-side search (JSON)         |

### POST `/api/transaction/search` — Request body

```json
{
  "conditions": [
    { "column": "tr_part",   "operator": "contains",   "value": "ABC" },
    { "column": "tr_loc",    "operator": "equals",     "value": "WH1" },
    { "column": "tr_userid", "operator": "startswith", "value": "john" }
  ],
  "limit": 100
}
```

**Operators:** `contains` | `equals` | `startswith`

Column names are validated against a fixed whitelist (`TRANSACTION_ALLOWED_COLUMNS` in `constants.py`).  
Values are always bound as SQLAlchemy parameters — never interpolated into the SQL string.

---

## Database Tests

```bash
python test.py
```

Tests DB connectivity and runs a sample transaction query, printing results to console and `Log/`.

---

## Health Check

```bash
curl http://localhost:5000/health
```

Returns `200 OK` when DB is connected, `503 Service Unavailable` otherwise:

```json
{ "status": "healthy", "database": "connected" }
```

---

## Security

| Concern         | Mitigation                                                          |
|-----------------|---------------------------------------------------------------------|
| SQL injection   | Column whitelist + SQLAlchemy parameterized queries                 |
| Secrets         | All credentials in `.env`; `.env` is gitignored                     |
| Error leakage   | Custom 404/500 handlers return JSON — no stack traces in production |
| Session signing | `SECRET_KEY` from `.env` (required)                                 |

---

## Logging

Logs are written to `Log/log_YYYY-MM-DD.txt` with daily rotation (max 10 MB per file before creating a `.bak`).  
Log level is controlled by `LOG_LEVEL` in `.env`: `DEBUG` | `INFO` | `WARN` | `ERROR`.

---

## License

Internal use — NRI production system.
