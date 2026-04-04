from flask import Flask, render_template, jsonify
from log import Logger
from enum import Enum

log = Logger()

app = Flask(__name__)

class Status(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    COMPLETED = "completed"

# Dữ liệu mẫu cho hệ thống tra cứu
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

# Route chính: hiển thị trang dashboard
@app.route('/')
def index():
    return render_template('index.html', data=DATA)

# API endpoint: trả về dữ liệu JSON cho AJAX
@app.route('/api/data')
def api_data():
    return jsonify(DATA)

# Khởi chạy server Flask
if __name__ == '__main__':
    log.info("RUN SERVER FLASK")
    app.run(host='0.0.0.0', debug=True, port=5000)
    log.info("CLOSE SERVER FLASK")
