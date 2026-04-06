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
                pool_pre_ping=True,
                echo=False,
            )
            self.logger.info("Database engine created successfully")
            return engine
        except Exception as e:
            self.logger.error(f"Failed to create database engine: {e}")
            return None
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        if self.engine is None:
            raise RuntimeError(
                "Database engine is not initialised. "
                "Check DB_SERVER / DB_USERNAME / DB_PASSWORD in your .env file."
            )
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
    
    def fetch_all(self, query, limit=None, params=None):
        """
        Execute a SELECT query and fetch all results.

        Args:
            query  (str):       SQL query (without TOP clause).
            limit  (int):       Max rows to return; falls back to config default.
            params (dict|None): Named bind parameters for SQLAlchemy text().
                                Values are bound safely — never interpolated.

        Returns:
            list[dict]: Query results as a list of row dicts.
        """
        try:
            with self.get_connection() as connection:
                actual_limit = limit or self.config.DB_QUERY_LIMIT

                # Inject TOP clause for SQL Server row-limit (safe — integer only)
                if "TOP" not in query.upper():
                    query = query.replace("SELECT", f"SELECT TOP {actual_limit}", 1)

                result = connection.execute(text(query), params or {})
                rows = result.fetchall()

                data = [dict(row._mapping) for row in rows]
                self.logger.info(f"Query OK — rows returned: {len(data)}")
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
        """Test database connection. Returns False if engine is not initialised."""
        if self.engine is None:
            self.logger.error("Database connection test failed: engine not initialised")
            return False
        try:
            with self.get_connection() as connection:
                connection.execute(text("SELECT 1"))
                self.logger.info("Database connection test successful")
                return True
        except Exception as e:
            self.logger.error(f"Database connection test failed: {e}")
            return False
