"""
Flask application for NRI (Non-Recoverable Item) transaction tracking system
"""
from flask import Flask, render_template, jsonify, request
from log import Logger
from database import DatabaseManager
from config import get_config
from enum import Enum

# Initialize
config = get_config()
logger = Logger(level=config.LOG_LEVEL)
db = DatabaseManager()
app = Flask(__name__)
app.config['SECRET_KEY'] = config.SECRET_KEY


class Status(Enum):
    """Status enum for data"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    COMPLETED = "completed"


# Sample data for demonstration
DATA = [
    {"id": 1, "name": "Nội dung 1", "status": Status.ACTIVE.value, "description": "Mô tả chi tiết về nội dung 1"},
    {"id": 2, "name": "Nội dung 2", "status": Status.INACTIVE.value, "description": "Mô tả chi tiết về nội dung 2"},
    {"id": 3, "name": "Nội dung 3", "status": Status.ACTIVE.value, "description": "Mô tả chi tiết về nội dung 3"},
    {"id": 4, "name": "Nội dung 4", "status": Status.ACTIVE.value, "description": "Mô tả chi tiết về nội dung 4"},
    {"id": 5, "name": "Nội dung 5", "status": Status.INACTIVE.value, "description": "Mô tả chi tiết về nội dung 5"},
    {"id": 6, "name": "Nội dung 6", "status": Status.ACTIVE.value, "description": "Mô tả chi tiết về nội dung 6"},
    {"id": 7, "name": "Nội dung 7", "status": Status.INACTIVE.value, "description": "Mô tả chi tiết về nội dung 7"},
    {"id": 8, "name": "Nội dung 8", "status": Status.ACTIVE.value, "description": "Mô tả chi tiết về nội dung 8"},
    {"id": 9, "name": "Nội dung 9", "status": Status.ACTIVE.value, "description": "Mô tả chi tiết về nội dung 9"},
    {"id": 10, "name": "Nội dung 10", "status": Status.INACTIVE.value, "description": "Mô tả chi tiết về nội dung 10"},
]


def _fetch_transaction_data(limit=None):
    """
    Fetch transaction data from database
    
    Args:
        limit (int): Optional limit for records
        
    Returns:
        list: Transaction data
    """
    try:
        sql = "SELECT * FROM [Data_qad].[dbo].[Transaction History Browse (NRI)]"
        data = db.fetch_all(sql, limit=limit or config.DB_QUERY_LIMIT)
        logger.info(f"Fetched {len(data)} transaction records")
        return data
    except Exception as e:
        logger.error(f"Error fetching transaction data: {e}")
        return []


@app.route('/')
def index():
    """Main dashboard page"""
    logger.info("Accessed main dashboard")
    return render_template('index.html', data=DATA)


@app.route('/api/data')
def api_data():
    """API endpoint for sample data"""
    logger.info("API call: /api/data")
    return jsonify(DATA)


@app.route('/transaction')
def transaction_history():
    """Transaction history page"""
    logger.info("Accessed transaction history page")
    transactions = _fetch_transaction_data()
    return render_template('_transaction.html', transactions=transactions)


@app.route('/api/transaction')
def api_transaction():
    """API endpoint for transaction data (JSON format)"""
    limit = request.args.get('limit', type=int)
    logger.info(f"API call: /api/transaction (limit={limit})")
    data = _fetch_transaction_data(limit=limit)
    return jsonify(data)


@app.route('/health')
def health_check():
    """Health check endpoint"""
    db_healthy = db.check_connection()
    return jsonify({
        'status': 'healthy' if db_healthy else 'unhealthy',
        'database': 'connected' if db_healthy else 'disconnected'
    }), 200 if db_healthy else 503


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    logger.warning(f"404 error: {request.path}")
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"500 error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info("Starting Flask application")
    logger.info(f"Environment: {config.__class__.__name__}")
    logger.info(f"Debug mode: {config.DEBUG}")
    logger.info("=" * 50)
    
    # Check database connection before starting
    if db.check_connection():
        logger.info("Database connection verified")
        app.run(host=config.HOST, debug=config.DEBUG, port=config.PORT)
    else:
        logger.error("Failed to connect to database. Exiting.")
    
    logger.info("Flask application stopped")
