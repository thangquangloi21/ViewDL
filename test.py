"""
Test module for database queries
"""
from database import DatabaseManager
from log import Logger

logger = Logger()
db = DatabaseManager()


def test_database_connection():
    """Test database connection"""
    logger.info("Testing database connection...")
    if db.check_connection():
        logger.info("✓ Database connection successful")
        return True
    else:
        logger.error("✗ Database connection failed")
        return False


def test_transaction_query():
    """Test transaction history query"""
    logger.info("Testing transaction query...")
    try:
        sql = "SELECT TOP 10 * FROM [Data_qad].[dbo].[Transaction History Browse (NRI)]"
        results = db.fetch_all(sql, limit=10)
        
        if results:
            logger.info(f"✓ Retrieved {len(results)} transaction records")
            for i, row in enumerate(results[:3], 1):
                logger.info(f"  Row {i}: {list(row.keys())[:5]}")  # Print first 5 columns
            return True
        else:
            logger.warning("✗ No transaction records found")
            return False
    except Exception as e:
        logger.error(f"✗ Transaction query failed: {e}")
        return False


def main():
    """Run all tests"""
    logger.info("=" * 50)
    logger.info("Starting database tests")
    logger.info("=" * 50)
    
    results = {
        "Database Connection": test_database_connection(),
        "Transaction Query": test_transaction_query(),
    }
    
    logger.info("=" * 50)
    logger.info("Test Results:")
    for test_name, result in results.items():
        status = "✓ PASSED" if result else "✗ FAILED"
        logger.info(f"  {test_name}: {status}")
    logger.info("=" * 50)


if __name__ == '__main__':
    main()
