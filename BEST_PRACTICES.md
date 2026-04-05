# 📚 BEST PRACTICES - TRACUUQAD

Document các best practices được áp dụng trong dự án.

## Table of Contents
1. [Python Best Practices](#python-best-practices)
2. [Flask Best Practices](#flask-best-practices)
3. [Database Best Practices](#database-best-practices)
4. [Frontend Best Practices](#frontend-best-practices)
5. [Security Best Practices](#security-best-practices)
6. [Code Standards](#code-standards)

---

## Python Best Practices

### 1. Environment Variables
✅ **DO:**
```python
# config.py - Load từ .env
from dotenv import load_dotenv
import os

DB_SERVER = os.getenv('DB_SERVER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
```

❌ **DON'T:**
```python
# Hardcoded
DB_SERVER = "10.239.1.54"
DB_PASSWORD = "123456"
```

### 2. Error Handling
✅ **DO:**
```python
def fetch_data(query):
    try:
        with self.get_connection() as conn:
            result = conn.execute(text(query))
            return result.fetchall()
    except Exception as e:
        self.logger.error(f"Error executing query: {e}")
        return []
```

❌ **DON'T:**
```python
def fetch_data(query):
    result = conn.execute(query)
    return result.fetchall()  # No error handling
```

### 3. Docstrings
✅ **DO:**
```python
def fetch_all(self, query, limit=None):
    """
    Execute a SELECT query and fetch all results
    
    Args:
        query (str): SQL query string
        limit (int): Optional limit for records
        
    Returns:
        list: List of dictionaries with query results
    """
```

❌ **DON'T:**
```python
def fetch_all(self, query, limit=None):
    # fetch data
    pass
```

### 4. Connection Management
✅ **DO:**
```python
from contextlib import contextmanager

@contextmanager
def get_connection(self):
    connection = self.engine.connect()
    try:
        yield connection
        connection.commit()
    except Exception as e:
        connection.rollback()
        raise
    finally:
        connection.close()
```

❌ **DON'T:**
```python
def get_connection(self):
    return self.engine.connect()  # No cleanup
```

### 5. Logging
✅ **DO:**
```python
logger.info(f"Fetched {len(data)} records from {table}")
logger.error(f"Database error: {str(e)}")
logger.warning("Connection timeout, retrying...")
```

❌ **DON'T:**
```python
print("Data fetched")  # Use print for user output only
print(data)  # Could expose sensitive info
```

---

## Flask Best Practices

### 1. Application Factory Pattern
✅ **DO:**
```python
# create_app.py
def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(get_config(config_name))
    
    # Register blueprints, handlers, etc
    return app
```

### 2. Error Handlers
✅ **DO:**
```python
@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 error: {request.path}")
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500
```

### 3. Request Context
✅ **DO:**
```python
from flask import request

@app.route('/api/data')
def get_data():
    limit = request.args.get('limit', type=int)
    logger.info(f"API call from {request.remote_addr}")
    return jsonify(data)
```

### 4. JSON Responses
✅ **DO:**
```python
# Always use jsonify for consistent response format
return jsonify({'status': 'ok', 'data': data, 'count': len(data)})
```

### 5. Configuration
✅ **DO:**
```python
# Separate config classes for different environments
class DevelopmentConfig:
    DEBUG = True
    
class ProductionConfig:
    DEBUG = False
```

---

## Database Best Practices

### 1. Connection Pooling
✅ **DO:**
```python
engine = create_engine(
    connection_string,
    poolclass=pool.QueuePool,
    pool_size=5,          # Keep 5 connections ready
    max_overflow=10,      # Allow up to 10 temporary connections
    pool_pre_ping=True,   # Test connections before using
)
```

❌ **DON'T:**
```python
# New connection for every request
conn = create_engine(connection_string).connect()
```

### 2. Parameterized Queries
✅ **DO:**
```python
# SQLAlchemy handles parameterization automatically
query = "SELECT * FROM users WHERE id = :id"
result = conn.execute(text(query), {'id': user_id})
```

❌ **DON'T:**
```python
# SQL Injection risk!
query = f"SELECT * FROM users WHERE id = {user_id}"
```

### 3. Query Limits
✅ **DO:**
```python
# Use OFFSET/FETCH for pagination
query = """
    SELECT * FROM table
    OFFSET :offset ROWS
    FETCH NEXT :limit ROWS ONLY
"""
```

❌ **DON'T:**
```python
# TOP is deprecated and inflexible
query = "SELECT TOP 100 * FROM table"
```

### 4. Transaction Management
✅ **DO:**
```python
with engine.begin() as connection:
    # All statements here use same transaction
    result1 = connection.execute(query1)
    result2 = connection.execute(query2)
    # Auto-commit on success, auto-rollback on error
```

---

## Frontend Best Practices

### 1. DOM Caching
✅ **DO:**
```javascript
const elements = {
    button: document.getElementById('myButton'),
    input: document.getElementById('myInput'),
    list: document.getElementById('list'),
};

// Reuse cached elements
elements.button.addEventListener('click', handler);
```

❌ **DON'T:**
```javascript
// Repeated DOM lookups
document.getElementById('myButton').addEventListener('click', handler);
document.getElementById('myButton').textContent = 'Click me';
```

### 2. Batch DOM Operations
✅ **DO:**
```javascript
const fragment = document.createDocumentFragment();

for (let item of items) {
    const el = document.createElement('div');
    el.textContent = item.text;
    fragment.appendChild(el);
}

// Single DOM operation
container.appendChild(fragment);
```

❌ **DON'T:**
```javascript
// Multiple reflows
for (let item of items) {
    const el = document.createElement('div');
    el.textContent = item.text;
    container.appendChild(el);  // Each iteration triggers reflow
}
```

### 3. Event Delegation
✅ **DO:**
```javascript
// Single listener on parent
container.addEventListener('click', (e) => {
    if (e.target.matches('.item-btn')) {
        handleItemClick(e.target);
    }
});
```

❌ **DON'T:**
```javascript
// Listener on every item
items.forEach(item => {
    item.addEventListener('click', handler);
});
```

### 4. CSS Batching
✅ **DO:**
```javascript
element.style.cssText = 'color: red; padding: 10px; margin: 5px;';
// or use classes
element.classList.add('active', 'highlighted');
```

❌ **DON'T:**
```javascript
element.style.color = 'red';
element.style.padding = '10px';
element.style.margin = '5px';  // 3 style updates
```

### 5. Error Handling
✅ **DO:**
```javascript
fetch('/api/data')
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
    .then(data => updateUI(data))
    .catch(error => {
        console.error('Error:', error);
        showErrorMessage('Failed to load data');
    });
```

❌ **DON'T:**
```javascript
// No error handling
fetch('/api/data')
    .then(r => r.json())
    .then(data => updateUI(data));
```

---

## Security Best Practices

### 1. Secrets Management
✅ **DO:**
```python
# .env file (never commit to git)
DB_PASSWORD=secret_password
API_KEY=secret_key

# .gitignore
*.env
*.env.local
secrets/
```

❌ **DON'T:**
```python
# In source code
password = "secret123"
api_key = "abc123xyz"
```

### 2. Input Validation
✅ **DO:**
```python
# Validate limits
limit = request.args.get('limit', type=int, default=100)
if limit > 1000:
    limit = 1000  # Cap the limit

# Sanitize user input
value = request.args.get('search', '').strip()
if len(value) > 255:
    return error_response("Search term too long")
```

❌ **DON'T:**
```python
# Direct usage
limit = int(request.args.get('limit'))  # Could be any large number
value = request.args.get('search')      # No validation
```

### 3. CSRF Protection
✅ **DO:**
```html
<!-- Flask includes CSRF by default for POST/PUT/DELETE -->
<form method="POST">
    {{ csrf_token() }}
    ...
</form>
```

### 4. SQL Injection Prevention
✅ **DO:**
```python
# Use parameterized queries
query = "SELECT * FROM users WHERE email = :email"
result = execute(query, {'email': user_email})
```

❌ **DON'T:**
```python
# String formatting allows injection
query = f"SELECT * FROM users WHERE email = '{email}'"
```

### 5. HTTPS
✅ **DO:**
```python
# Production configuration
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
```

---

## Code Standards

### Naming Conventions
```python
# Constants: UPPER_SNAKE_CASE
DB_QUERY_LIMIT = 100
MAX_CONNECTIONS = 5

# Classes: PascalCase
class DatabaseManager:
    pass

# Functions/variables: snake_case
def fetch_transaction_data():
    transaction_list = []
    return transaction_list

# Private: _leading_underscore
def _internal_helper():
    pass
```

### Code Organization
```python
# Imports (top of file)
from datetime import datetime
from sqlalchemy import create_engine
from log import Logger

# Constants
MAX_SIZE = 100

# Classes
class DatabaseManager:
    def __init__(self):
        pass
    
    def public_method(self):
        pass
    
    def _private_method(self):
        pass

# Functions
def helper_function():
    pass

# Main execution
if __name__ == '__main__':
    main()
```

### Comments
```python
# ✅ Good: Explains WHY, not WHAT
# Use connection pooling to reuse connections and reduce overhead
engine = create_engine(connection_string, poolclass=pool.QueuePool)

❌ Bad: Explains WHAT (code already shows this)
# Create an engine
engine = create_engine(connection_string)

✅ Good: Complex logic needs explanation
# Sort transactions by date descending, then by amount ascending
# This ensures recent/high-value items appear first
transactions.sort(key=lambda x: (-x.date, x.amount))
```

---

## Performance Checklist

- ✅ Connection pooling enabled
- ✅ Database queries use OFFSET/FETCH with limits
- ✅ Frontend uses DocumentFragment for batch DOM updates
- ✅ DOM elements are cached
- ✅ CSS changes batched with cssText
- ✅ No N+1 queries
- ✅ Error handling doesn't block execution
- ✅ Large operations logged for monitoring

---

## Security Checklist

- ✅ No hardcoded secrets
- ✅ Environment variables for configuration
- ✅ Parameterized SQL queries
- ✅ Input validation on all endpoints
- ✅ Error messages don't expose sensitive info
- ✅ HTTPS in production
- ✅ CORS configured properly
- ✅ Rate limiting enabled
- ✅ Logging enabled for audit trail

---

## Testing Checklist

- ✅ Database connection test
- ✅ Query execution test
- ✅ Error handling test
- ✅ Performance test with large datasets
- ✅ Security scan for vulnerabilities
- ✅ Load testing for concurrent requests

---

**Last Updated**: 2026-04-05
