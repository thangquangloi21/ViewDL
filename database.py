"""
Database module with connection pooling and query execution
"""
from sqlalchemy import create_engine, text, pool
from contextlib import contextmanager
from log import Logger
from config import get_config


class DatabaseManager:
    """Manages database connections with pooling"""
    
    def __init__(self):
        """Initialize database manager with connection pool"""
        self.config = get_config()
        self.logger = Logger()
        self.engine = self._create_engine()
    
    def _create_engine(self):
        """Create SQLAlchemy engine with pooling"""
        try:
            engine = create_engine(
                self.config.DATABASE_URL,
                poolclass=pool.QueuePool,
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,  # Test connections before using
                echo=False,
            )
            self.logger.info("Database engine created successfully")
            return engine
        except Exception as e:
            self.logger.error(f"Failed to create database engine: {e}")
            raise
    
    @contextmanager
    def get_connection(self):
        """
        Context manager for database connections
        Automatically handles connection lifecycle
        """
        connection = None
        try:
            connection = self.engine.connect()
            yield connection
            connection.commit()
        except Exception as e:
            if connection:
                connection.rollback()
            self.logger.error(f"Database connection error: {e}")
            raise
        finally:
            if connection:
                connection.close()
    
    def fetch_all(self, query, limit=None):
        """
        Execute a SELECT query and fetch all results
        
        Args:
            query (str): SQL query string (should not include TOP clause)
            limit (int): Optional limit for records
            
        Returns:
            list: List of dictionaries with query results
        """
        try:
            with self.get_connection() as connection:
                # Determine limit
                actual_limit = limit or self.config.DB_QUERY_LIMIT
                
                # Add TOP clause if query doesn't already have it
                # SQL Server compatible way using TOP
                if 'TOP' not in query.upper():
                    # Insert TOP clause after SELECT
                    query = query.replace('SELECT', f'SELECT TOP {actual_limit}', 1)
                
                result = connection.execute(text(query))
                rows = result.fetchall()
                
                # Convert to list of dictionaries
                data = [dict(row._mapping) for row in rows]
                self.logger.info(f"Query executed successfully. Rows: {len(data)}")
                return data
        except Exception as e:
            self.logger.error(f"Error executing query: {e}")
            return []
    
    def fetch_one(self, query):
        """
        Execute a SELECT query and fetch one result
        
        Args:
            query (str): SQL query string
            
        Returns:
            dict: First row as dictionary or None
        """
        try:
            with self.get_connection() as connection:
                result = connection.execute(text(query))
                row = result.fetchone()
                
                if row:
                    return dict(row._mapping)
                return None
        except Exception as e:
            self.logger.error(f"Error executing query: {e}")
            return None
    
    def execute(self, query):
        """
        Execute a non-SELECT query (INSERT, UPDATE, DELETE)
        
        Args:
            query (str): SQL query string
            
        Returns:
            int: Number of affected rows
        """
        try:
            with self.get_connection() as connection:
                result = connection.execute(text(query))
                affected_rows = result.rowcount
                self.logger.info(f"Query executed successfully. Affected rows: {affected_rows}")
                return affected_rows
        except Exception as e:
            self.logger.error(f"Error executing query: {e}")
            return 0
    
    def check_connection(self):
        """Test database connection"""
        try:
            with self.get_connection() as connection:
                connection.execute(text("SELECT 1"))
                self.logger.info("Database connection test successful")
                return True
        except Exception as e:
            self.logger.error(f"Database connection test failed: {e}")
            return False
