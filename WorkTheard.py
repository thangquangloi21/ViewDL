# class xử lý công việc trong thread riêng
import threading
import subprocess
import os
from log import Logger
import csv
from pathlib import Path
from sqlalchemy import create_engine, table, text


class WorkThread(threading.Thread):
    log = Logger()
    # SQL
    server = "10.239.1.54"
    database = "Data_qad"
    schema = "dbo"
    username = "sa"
    password = "123456"
    def __init__(self):
        threading.Thread.__init__(self)
        self.log.info("Application initialized")

    def run(self):
        self.log.info("WorkThread started")
        # Thực hiện công việc ở đây, ví dụ: chạy một lệnh shell
        try:
            # Ví dụ: chạy một lệnh shell đơn giản
            # result = subprocess.run(['echo', 'Hello from WorkThread!'], capture_output=True, text=True)
            # self.log.info(f"Command output: {result.stdout}")
            # Thêm công việc thực tế của bạn ở đây
            self.log.info("WorkThread completed successfully")
        except Exception as e:
            self.log.error(f"Error in WorkThread: {e}")


    
    def conn(self):
        # Database connection and data processing
        try:
            server = self.server
            database = self.database
            username = self.username
            password = self.password
            driver = 'ODBC Driver 18 for SQL Server'

            connection_string = f'mssql+pyodbc://{username}:{password}@{server}/{database}?driver={driver}&TrustServerCertificate=yes'
            engine = create_engine(connection_string)
            self.log.info("connect success")
            return engine
        except Exception as e:
            self.log.error(f"Error connecting to database: {e}")   

    def queryDB(self, sql):
        try:
            conect = self.conn()
            # if data cout > 0 delete table
            with conect.begin() as connection:
                result = connection.execute(text(f"{sql}"))
                row_count = result.scalar()
                if row_count > 0:
                    self.log.info("Có dữ liệu trong bảng.")
                    
                    
                    with conect.begin() as connection:
                        connection.execute(text(f"DELETE FROM [{table}]") )
                        return
                else:
                    # self.log.info(f"The table '{table}' is empty.")
                    self.log.info("Không có dữ liệu")
                    return
        except Exception as e:
            self.log.error(f"error: {e}")