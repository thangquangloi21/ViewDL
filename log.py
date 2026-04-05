"""
Logging module with thread-safe file operations and rotation
"""
import os
import threading
from datetime import datetime
from pathlib import Path


class Logger:
    """Thread-safe logger with daily file rotation"""
    
    # Class-level lock for thread safety
    _lock = threading.Lock()
    
    # Log levels with filtering
    LOG_LEVELS = {
        'DEBUG': 0,
        'INFO': 1,
        'WARN': 2,
        'ERROR': 3,
    }
    
    def __init__(self, log_dir="Log", console=True, level='INFO', max_file_size=10*1024*1024):
        """
        Initialize logger
        
        Args:
            log_dir (str): Directory for log files
            console (bool): Whether to print to console
            level (str): Minimum log level to record
            max_file_size (int): Maximum log file size before rotation (default 10MB)
        """
        self.log_dir = log_dir
        self.console = console
        self.level = level.upper()
        self.max_file_size = max_file_size
        self.current_date = None
        self.log_path = None
        
        Path(self.log_dir).mkdir(parents=True, exist_ok=True)
        self._update_log_file()

    def _update_log_file(self):
        """Update log file path if date changed"""
        today = datetime.now().strftime("%Y-%m-%d")
        if today != self.current_date:
            self.current_date = today
            self.log_path = os.path.join(self.log_dir, f"log_{today}.txt")

    def _rotate_if_needed(self):
        """Rotate log file if it exceeds max size"""
        if os.path.exists(self.log_path):
            file_size = os.path.getsize(self.log_path)
            if file_size > self.max_file_size:
                # Rename current log to backup
                timestamp = datetime.now().strftime("%H-%M-%S")
                backup_path = f"{self.log_path}.{timestamp}.bak"
                try:
                    os.rename(self.log_path, backup_path)
                except Exception as e:
                    print(f"Failed to rotate log file: {e}")

    def _should_log(self, level):
        """Check if level should be logged based on log level"""
        return self.LOG_LEVELS.get(level, 1) >= self.LOG_LEVELS.get(self.level, 1)

    def _write(self, level, message):
        """Write message to log file (thread-safe)"""
        if not self._should_log(level):
            return
        
        with self._lock:  # Thread-safe file access
            self._update_log_file()
            self._rotate_if_needed()
            
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            line = f"[{timestamp}] [{level}] {message}\n"
            
            try:
                with open(self.log_path, "a", encoding="utf-8") as f:
                    f.write(line)
            except IOError as e:
                print(f"Failed to write to log file: {e}")
            
            if self.console:
                print(line.strip())

    def debug(self, msg):
        """Log debug message"""
        self._write("DEBUG", msg)

    def info(self, msg):
        """Log info message"""
        self._write("INFO", msg)

    def warning(self, msg):
        """Log warning message"""
        self._write("WARN", msg)

    def error(self, msg):
        """Log error message"""
        self._write("ERROR", msg)
