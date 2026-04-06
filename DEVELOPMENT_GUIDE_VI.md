# 📚 ViewDL — Hướng Dẫn Phát Triển & Thiết Kế Dự Án

## 📋 Tổng Quan Dự Án

**NRI Transaction Tracking System** — Flask web application kết nối SQL Server (QAD ERP)

### Mục Đích Chính
- 🔍 Tìm kiếm lịch sử giao dịch với điều kiện động
- 📊 Xem dashboard tổng quan dữ liệu
- 🛡️ Đảm bảo an toàn (chống SQL injection)
- ⚙️ Chạy trên Windows (Waitress) + Linux (Gunicorn)

### Stack Công Nghệ
| Layer | Công Nghệ |
|-------|-----------|
| Backend | Python 3.10+, Flask 2.3+ |
| ORM / DB | SQLAlchemy 2.0+, pyodbc, SQL Server (ODBC 18) |
| Frontend | Vanilla JavaScript (ES2020), HTML5, CSS3 |
| Config | python-dotenv |
| Production | Waitress 2.1+ (Windows) |

---

## 🏗️ Kiến Trúc Dự Án

### Sơ Đồ Data Flow

```
REQUEST FLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend (HTML/JS)
    ↓ HTTP Request
routes/pages.py (Render HTML Views)
routes/api.py (JSON Endpoints)
    ↓
app.py (Application Factory)
    ↓ Dependency Injection
[database.py] [config.py] [constants.py] [log.py]
    ↓
SQL Server Database (Data Layer)
    ↓ Response
Frontend Updated
```

### Thiết Kế Chính

1. **Application Factory Pattern** (`create_app()`)
   - Tách biệt config khỏi code
   - Dễ test và extend
   - Dependency injection qua `app.db`, `app.app_logger`

2. **Blueprint-Based Routing**
   - `pages_bp` — HTML views
   - `api_bp` — JSON endpoints
   - Dễ phân chia trách nhiệm

3. **Connection Pooling**
   - SQLAlchemy QueuePool: 5 base + 10 overflow
   - Tối ưu hiệu suất DB

4. **Security First**
   - Parameterized queries (chống SQL injection)
   - Whitelist validation (cột được phép)
   - Environment-based secrets

---

## 📁 Chi Tiết Các File Chính

### 1. **app.py** — Core Factory & Initialization
```
Chức Năng:
  - create_app(cfg) — tạo và cấu hình Flask app
  - Attach services: app.db (DatabaseManager), app.app_logger (Logger)
  - Register blueprints: pages_bp, api_bp
  - Global error handlers

Mở rộng khi:
  - Thêm blueprint mới
  - Thêm middleware toàn cục
  - Thay đổi error response format
```

### 2. **config.py** — Environment-Based Configuration
```
Chức Năng:
  - Lớp Config (base)
  - DevelopmentConfig
  - ProductionConfig
  - Tự động load từ .env

Các Setting Chính:
  - DB_SERVER, DB_DATABASE, DB_USERNAME, DB_PASSWORD
  - LOG_LEVEL
  - SECRET_KEY
  - DATABASE_URL (auto-built)

Mở rộng khi:
  - Thêm setting mới (cache timeout, rate limit, etc.)
  - Thêm environment mới (staging)
  - Thay đổi connection string format
```

### 3. **database.py** — DatabaseManager & Connection Pool
```
Chức Năng:
  - Quản lý SQLAlchemy engine
  - Context manager (get_connection)
  - fetch_all(query, limit, params) — execute & fetch
  - Check connection health (cho /health endpoint)

Key Methods:
  - _create_engine() — khởi tạo pool
  - get_connection() — yield connection an toàn
  - fetch_all() — execute SELECT query

Mở rộng khi:
  - Thêm fetch_one() helper
  - Thêm execute_procedure() cho stored procs
  - Thay đổi pool config (pool_size, max_overflow)
```

### 4. **routes/api.py** — JSON REST Endpoints
```
Endpoints:
  GET  /api/data
       → Trả về SAMPLE_DATA
  
  GET  /api/transaction?limit=100
       → Lấy transaction records (có limit)
  
  POST /api/transaction/search
       → Dynamic search với conditions
       Request body:
         {
           "conditions": [
             {"column": "tr_part", "operator": "contains", "value": "ABC"}
           ],
           "limit": 100
         }

Security:
  ✔️ Column validation (TRANSACTION_ALLOWED_COLUMNS whitelist)
  ✔️ Operator validation (ALLOWED_OPERATORS)
  ✔️ Parameterized queries (no string interpolation)

Mở rộng khi:
  - Thêm endpoint mới
  - Thêm operator mới (>=, between, etc.)
  - Thêm response format (CSV export, etc.)
```

### 5. **routes/pages.py** — HTML Views
```
Routes:
  GET /
       → Render index.html + SAMPLE_DATA

  GET /health
       → JSON status check: DB connected?
       → HTTP 200 (healthy) hoặc 503 (error)

Mở rộng khi:
  - Thêm trang mới
  - Thêm middleware (authentication)
  - Thay đổi template context
```

### 6. **constants.py** — Security Whitelist & Enums
```
Chứa:
  - TRANSACTION_TABLE = "pjt_trh"
  - TRANSACTION_ALLOWED_COLUMNS = ["tr_part", "tr_date", ...]
  - ALLOWED_OPERATORS = ["contains", "equals", "startswith"]
  - SAMPLE_DATA = {...}

Quan Trọng:
  ⚠️ ANY CỘ HỚN MUỐN SEARCH PHẢI THÊM VÀO ALLOWED_COLUMNS
  ⚠️ Nếu forget → API tự động reject query

Mở rộng khi:
  - Thêm cột mới vào database
  - Thêm operator mới
  - Thêm enum/constant khác
```

### 7. **static/js/transaction.js** — Frontend Search Logic
```
Chức Năng:
  - Xây dựng conditions từ form input
  - POST /api/transaction/search
  - Update HTML table với results

Mở rộng khi:
  - Thêm filter UI
  - Thêm sort feature
  - Thêm export/download
  - Thêm pagination
```

### 8. **static/js/script.js** — Sidebar & View Switching
```
Chức Năng:
  - Sidebar menu control
  - switchView() — show/hide partials
  - Load dashboard data via /api/data

Mở rộng khi:
  - Thêm view mới (partial)
  - Thêm live refresh
  - Thêm real-time notifications
```

### 9. **log.py** — Thread-Safe Rotating Logger
```
Chức Năng:
  - Logger instance per environment
  - Daily rotating log files (Log/log_YYYY-MM-DD.txt)
  - Thread-safe
  - Level: DEBUG, INFO, WARNING, ERROR

Mở rộng khi:
  - Thay đổi log format
  - Thêm file/level
  - Thêm remote logging (Sentry, etc.)
```

### 10. **templates/** — HTML Partials
```
Files:
  - index.html     → Shell/layout chính
  - _dashboard.html → Dashboard view partial
  - _transaction.html → Transaction table partial
  - _other.html    → Other views partial

Thiết Kế:
  - Dùng partials để switch view không reload
  - SAMPLE_DATA inject từ backend

Mở rộng khi:
  - Thêm view mới
  - Thay đổi layout
  - Thêm form, dashboard widget
```

---

## 🔄 Data Flow Chi Tiết: Ví Dụ Search Giao Dịch

### Kịch Bản: User tìm kiếm transaction với part = "ABC"

#### **Bước 1: Frontend gửi request**
```javascript
// static/js/transaction.js
POST /api/transaction/search
Content-Type: application/json

{
  "conditions": [
    {
      "column": "tr_part",
      "operator": "contains",
      "value": "ABC"
    }
  ],
  "limit": 100
}
```

#### **Bước 2: Backend xử lý (routes/api.py)**
```python
# Step 2a: Validate request
conditions = body.get("conditions", [])
limit = body.get("limit", cfg.DB_QUERY_LIMIT)

# Step 2b: Validate mỗi condition
for cond in conditions:
    column = cond.get("column")
    operator = cond.get("operator")
    value = cond.get("value")
    
    # ✅ Check: column có trong whitelist không?
    if column not in TRANSACTION_ALLOWED_COLUMNS:
        return {"error": f"Column {column} not allowed"}, 400
    
    # ✅ Check: operator có valid không?
    if operator not in ALLOWED_OPERATORS:
        return {"error": f"Operator {operator} not allowed"}, 400

# Step 2c: Build query động
# Ví dụ: "SELECT * FROM pjt_trh WHERE tr_part LIKE :value LIMIT 100"
query = f"SELECT * FROM {TRANSACTION_TABLE} WHERE 1=1"
params = {}

for i, cond in enumerate(conditions):
    column = cond["column"]
    operator = cond["operator"]
    value = cond["value"]
    param_name = f"param_{i}"
    
    if operator == "contains":
        query += f" AND {column} LIKE :{param_name}"
        params[param_name] = f"%{value}%"
    elif operator == "equals":
        query += f" AND {column} = :{param_name}"
        params[param_name] = value
    elif operator == "startswith":
        query += f" AND {column} LIKE :{param_name}"
        params[param_name] = f"{value}%"

query += f" LIMIT {limit}"

# ⚠️ IMPORTANT: Never string-interpolate values
# ✅ CORRECT: Use SQLAlchemy text() + params
```

#### **Bước 3: DatabaseManager thực thi**
```python
# database.py - db.fetch_all()
def fetch_all(self, query, limit=None, params=None):
    with self.get_connection() as conn:
        # Use SQLAlchemy text() for parameterized query
        stmt = text(query)
        result = conn.execute(stmt, params or {})
        return [dict(row) for row in result.fetchall()]
```

**Chi Tiết Connection Pool:**
- Lấy 1 connection từ pool (5 available)
- Execute query với bound params (chống SQL injection)
- Commit (hoặc rollback nếu error)
- Return connection vào pool
- Retry nếu pool full (max_overflow=10)

#### **Bước 4: Response trở về Frontend**
```json
[
  {
    "tr_part": "ABC-001",
    "tr_qty": 100,
    "tr_date": "2026-04-01",
    ...
  },
  {
    "tr_part": "ABC-002",
    "tr_qty": 50,
    "tr_date": "2026-04-02",
    ...
  }
]
```

#### **Bước 5: Frontend update UI**
```javascript
// transaction.js
fetch('/api/transaction/search', {
  method: 'POST',
  body: JSON.stringify({conditions, limit})
})
.then(res => res.json())
.then(data => {
  // Update table
  updateTransactionTable(data);
})
```

---

## 🔐 Security Best Practices (Đã Implement)

### 1. **SQL Injection Prevention**
✅ **Column Names:**
- Whitelist: `TRANSACTION_ALLOWED_COLUMNS = ["tr_part", "tr_qty", "tr_date", ...]`
- API validate: `if column not in TRANSACTION_ALLOWED_COLUMNS: reject`

✅ **Values:**
- Parameterized queries: `WHERE tr_part LIKE :param_1`
- Never: `WHERE tr_part LIKE '%{user_input}%'` ❌

✅ **Operators:**
- Whitelist: `ALLOWED_OPERATORS = ["contains", "equals", "startswith"]`
- Only these 3 operators phép dùng
- User không thể injection `; DROP TABLE` ❌

### 2. **Configuration Security**
✅ **Secrets in .env**
```
DB_PASSWORD=your_password
SECRET_KEY=random_key
```
- Never hardcode credentials
- .env added to .gitignore

✅ **Environment-Based Config**
```python
if ENV == "production":
    DEBUG = False
    SECRET_KEY = os.getenv('SECRET_KEY')  # Must exist
else if ENV == "development":
    DEBUG = True
    SECRET_KEY = "dev-key"
```

### 3. **Error Handling & Logging**
✅ **Generic Responses**
```python
# API always returns safe message
return {"error": "Invalid request"}, 400
# Not: "SQL Syntax Error on line 42" ❌
```

✅ **Detailed Logs (Server-side Only)**
```python
app.app_logger.error(f"DB Error: {exc}")  # File only
# Not: exposed in HTTP response ❌
```

### 4. **Connection Security**
✅ **TrustServerCertificate=yes** (for self-signed certs)
```
DATABASE_URL = mssql+pyodbc://user:pass@server/db?driver=ODBC_18&TrustServerCertificate=yes
```

✅ **Connection Pool**
- `pool_pre_ping=True` — test connection before use
- Prevent stale connections

---

## 🚀 Hướng Dẫn Setup & Chạy

### A. Thiết Lập Ban Đầu (Lần Đầu)

**1. Tạo virtual environment:**
```bash
python -m venv .venv
.venv\Scripts\activate
```

**2. Install dependencies:**
```bash
pip install -r requirements.txt
```

**3. Configure .env:**
```bash
copy .env.example .env
```

Edit `.env`:
```ini
FLASK_ENV=development
DB_SERVER=your_server_name
DB_DATABASE=QAD_Data
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DRIVER=ODBC Driver 18 for SQL Server
SECRET_KEY=generate_random_string_here
LOG_LEVEL=INFO
DB_QUERY_LIMIT=100
```

**4. Test DB connectivity:**
```bash
python test.py
```

Expected output:
```
✓ Database connected successfully
✓ Table "pjt_trh" found
✓ 1,234 records total
```

### B. Chạy Development Server

```bash
python app.py
```

Output:
```
 * Running on http://localhost:5000
 * Debug mode: on
```

**Logs live** tại `/Log/log_2026-04-06.txt`

### C. Chạy Production (Windows)

```bash
waitress-serve --host=0.0.0.0 --port=5000 wsgi:app
```

---

## 🔧 Phát Triển Tính Năng Mới

### Ví Dụ 1: Thêm Cột Search Mới (VD: `tr_qty`)

**Step 1:** Verify cột exists trong SQL Server
```sql
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'pjt_trh' AND COLUMN_NAME = 'tr_qty'
```

**Step 2:** Thêm vào whitelist
```python
# constants.py
TRANSACTION_ALLOWED_COLUMNS = [
    "tr_part",
    "tr_qty",          # ← NEW
    "tr_date",
    "tr_price",
    ...
]
```

**Step 3:** Frontend tự động hỗ trợ!
```javascript
// transaction.js không cần thay đổi
// UI form tự động có dropdown option cho tr_qty
```

### Ví Dụ 2: Thêm Endpoint API Mới

```python
# routes/api.py
@api_bp.route("/transaction/summary", methods=["GET"])
def api_transaction_summary():
    """
    Trả về: số lượng giao dịch, date range
    """
    db = current_app.db
    cfg = current_app.config["APP_CONFIG"]
    logger = current_app.app_logger
    
    try:
        sql = f"""
        SELECT 
            COUNT(*) as total_records,
            MIN(tr_date) as earliest_date,
            MAX(tr_date) as latest_date
        FROM {TRANSACTION_TABLE}
        """
        result = db.fetch_all(sql, limit=1)
        logger.info("Transaction summary fetched")
        return jsonify(result[0] if result else {})
    except Exception as exc:
        logger.error(f"Error: {exc}")
        return {"error": "Failed to fetch summary"}, 500
```

### Ví Dụ 3: Thêm Trang View Mới

**Step 1:** Tạo partial HTML
```html
<!-- templates/_inventory.html -->
<div id="inventory" class="view-panel">
  <h2>Inventory Status</h2>
  <table id="inv-table">
    <!-- Table will be populated by JS -->
  </table>
</div>
```

**Step 2:** Thêm link vào sidebar
```html
<!-- templates/index.html -->
<nav class="sidebar">
  <a href="#" onclick="switchView('dashboard')">Dashboard</a>
  <a href="#" onclick="switchView('transaction')">Transaction</a>
  <a href="#" onclick="switchView('inventory')">Inventory</a>  ← NEW
</nav>
```

**Step 3:** Thêm JS handler
```javascript
// static/js/script.js
function switchView(view) {
    document.querySelectorAll('.view-panel').forEach(el => el.style.display = 'none');
    document.getElementById(view).style.display = 'block';
}
```

**Step 4:** Thêm API endpoint (nếu cần data)
```python
# routes/api.py
@api_bp.route("/inventory")
def api_inventory():
    db = current_app.db
    sql = "SELECT * FROM inv_master"
    return jsonify(db.fetch_all(sql, cfg.DB_QUERY_LIMIT))
```

---

## 📊 Project Structure Reference

```
e:\PROJ\ViewDL/
├── app.py                       # Factory
├── config.py                    # Config classes
├── constants.py                 # Whitelist, enums
├── database.py                  # DatabaseManager
├── log.py                       # Logger
├── wsgi.py                      # Production entry-point
├── test.py                      # DB connectivity test
├── requirements.txt             # Dependencies
├── .env.example                 # Config template
├── README.md                    # Project README
├── DEVELOPMENT_GUIDE_VI.md      # This file 📖
│
├── routes/
│   ├── __init__.py
│   ├── pages.py                 # HTML routes (/, /health)
│   └── api.py                   # JSON API (/api/*)
│
├── templates/
│   ├── index.html               # Shell layout
│   ├── _dashboard.html          # Dashboard partial
│   ├── _transaction.html        # Transaction partial
│   └── _other.html              # Other partial
│
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── script.js            # Sidebar, view-switch
│       └── transaction.js       # Search logic
│
└── Log/                         # Runtime logs (gitignored)
    ├── log_2026-04-04.txt
    └── log_2026-04-05.txt
```

---

## 🧪 Testing & Verification

### Unit Test: Test DB Connectivity
```bash
python test.py
```

### Integration Test: Search API
```bash
curl -X POST http://localhost:5000/api/transaction/search \
  -H "Content-Type: application/json" \
  -d '{
    "conditions": [{"column": "tr_part", "operator": "contains", "value": "ABC"}],
    "limit": 10
  }'
```

### Manual Test: Web UI
1. Mở http://localhost:5000
2. Click vào Transaction view
3. Nhập search condition
4. Verify results appear

---

## 📝 Development Checklist

- [ ] Clone / download project
- [ ] Setup `.venv` + install dependencies
- [ ] Configure `.env` với DB credentials
- [ ] Run `test.py` → verify DB connection
- [ ] Run `python app.py` → start dev server
- [ ] Test http://localhost:5000 → dashboard loads
- [ ] Test /api/transaction → returns data
- [ ] Test /api/transaction/search → POST works
- [ ] Read through `routes/api.py` → understand search logic
- [ ] Modify `constants.py` → add new column
- [ ] Modify `templates/_transaction.html` → update UI
- [ ] Test changes → verify no errors

---

## 🎯 Kế Tiếp — Phát Triển Tiếp

1. **Deep Dive SQL Queries**
   - Read existing queries in api.py
   - Understand transaction table schema
   - Add custom WHERE clauses

2. **Extend Frontend**
   - Add date range picker
   - Add export to CSV
   - Add sorting fields

3. **Add Authentication**
   - Create login view
   - Add user roles
   - Protect /api/* endpoints

4. **Performance Optimization**
   - Add database indexes
   - Cache frequently used queries
   - Implement pagination

5. **Deployment**
   - Configure Waitress for Windows
   - Setup environment variables
   - Configure HTTPS

---

**💡 Tips:**
- Always validate + whitelist user input
- Use SQLAlchemy for all DB queries (safer)
- Check logs in `Log/` folder for debug
- Test locally before deploying
