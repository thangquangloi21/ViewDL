# 🚀 QUICK START - TRACUUQAD

## Prerequisites
- Python 3.8+
- MS SQL Server configured and accessible
- ODBC Driver 18 for SQL Server installed

## Installation

### 1️⃣ Install Dependencies
```bash
pip install -r requirements.txt
```

### 2️⃣ Verify Configuration
```bash
# Check if .env file exists
cat .env

# Key variables:
# - DB_SERVER: 10.239.1.54
# - DB_DATABASE: Data_qad
# - DB_USERNAME: sa
# - DB_PASSWORD: 123456
```

### 3️⃣ Test Database Connection
```bash
python test.py
```

**Expected output:**
```
✓ Database connection successful
✓ Retrieved 10 transaction records
```

If test fails:
- Verify network connection to 10.239.1.54
- Check SQL Server is running
- Verify ODBC Driver 18 is installed: `odbcconf.exe`
- Check .env credentials are correct

### 4️⃣ Start Application
```bash
# Option 1: Direct Python
python app.py

# Option 2: Flask CLI
flask run

# Option 3: Flask with custom port
flask run --port 8000
```

### 5️⃣ Access Application
```
http://localhost:5000
```

---

## Key Features

### Dashboard
- View summary of data
- Quick access to transaction search

### Transaction Search
- Add multiple search conditions
- Search operators: contains, equals, starts with
- Real-time filtering with instant results
- Clear all function to reset search

### API Endpoints
- `GET /api/data` - Sample data
- `GET /api/transaction` - Transaction data (optionally with `?limit=50`)
- `GET /health` - Health check

---

## Configuration

All settings in `.env` file:

```ini
# Database (Don't share these credentials!)
DB_SERVER=10.239.1.54
DB_DATABASE=Data_qad
DB_USERNAME=sa
DB_PASSWORD=123456

# Flask
FLASK_ENV=development     # development or production
FLASK_DEBUG=False          # True only for development
LOG_LEVEL=INFO            # DEBUG, INFO, WARN, ERROR

# Server
HOST=0.0.0.0
PORT=5000
```

### Production Deployment

**Before deploying to production:**

1. Change SECRET_KEY in .env to a random string:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

2. Set FLASK_ENV=production

3. Set FLASK_DEBUG=False

4. Update database credentials securely

5. Use a production WSGI server (Gunicorn, uWSGI)

```bash
# Example with Gunicorn:
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

---

## Monitoring & Logs

Logs are automatically created in `Log/` directory with daily rotation.

```
Log/
├── log_2026-04-05.txt    # Today's log
├── log_2026-04-04.txt    # Yesterday's log
└── log_2026-04-04.txt.12-34-56.bak  # Rotated due to size
```

View recent logs:
```bash
# Windows
type Log\log_2026-04-05.txt

# Linux/Mac
tail -f Log/log_2026-04-05.txt
```

Check health:
```bash
curl http://localhost:5000/health
```

---

## Troubleshooting

### Database Connection Fails
```
Error: Failed to connect to database
```

**Solution:**
1. Run: `python test.py`
2. Check if SQL Server is accessible: `ping 10.239.1.54`
3. Verify database credentials in `.env`
4. Check ODBC Driver: `odbcconf.exe`

### Port Already in Use
```
Address already in use
```

**Solution:**
```bash
# Use different port
flask run --port 8000

# Or kill process on port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Response Timeout on Large Queries
```
timeout: User Query Timeout Expired
```

**Solution:**
- Reduce DB_QUERY_LIMIT in `.env`
- Use POST with filters instead of fetching all
- Check database performance

---

## Development Notes

### File Organization
```
tracuuqad/
├── config.py          # Configuration management
├── database.py        # Database layer with pooling
├── log.py             # Logging with rotation
├── app.py             # Flask application
├── test.py            # Tests
├── requirements.txt   # Dependencies
├── .env              # Environment variables (don't commit!)
├── templates/        # HTML files
├── static/           # CSS, JS, images
└── Log/              # Log files
```

### Adding New Routes
```python
# In app.py
@app.route('/api/new-endpoint')
def new_endpoint():
    logger.info("API call: /api/new-endpoint")
    data = db.fetch_all("SELECT TOP 10 * FROM table")
    return jsonify(data)
```

### Adding New Database Queries
```python
# Use DatabaseManager for all DB operations
from database import DatabaseManager

db = DatabaseManager()

# Fetch all results
results = db.fetch_all("SELECT * FROM table WHERE active = 1")

# Fetch one result
result = db.fetch_one("SELECT TOP 1 * FROM table WHERE id = 1")

# Execute update/insert/delete
affected = db.execute("UPDATE table SET col = value WHERE id = 1")
```

---

## Performance Tips

1. **Database Queries:**
   - Always use OFFSET/FETCH instead of TOP
   - Add WHERE conditions to limit result set
   - Use appropriate database indexes

2. **Frontend:**
   - Search filters are processed client-side
   - Large datasets (>10k rows) may be slow
   - Consider pagination for better UX

3. **Caching:**
   - Add Redis caching for frequently accessed data
   - Implement cache invalidation strategy

---

## Next Steps

1. ✅ Verify database connection: `python test.py`
2. ✅ Start server: `python app.py`
3. ✅ Open browser: `http://localhost:5000`
4. ✅ Test transaction search
5. ✅ Check logs: `Log/log_*.txt`

For detailed information, see `OPTIMIZATION_REPORT.md`

---

**Questions?** Check the log files first - they usually contain error details!
