from flask import Flask, render_template, jsonify

app = Flask(__name__)

# Dữ liệu mẫu cho hệ thống tra cứu
DATA = [
    {"id": 1, "name": "Nội dung 1", "status": "Hoạt động"},
    {"id": 2, "name": "Nội dung 2", "status": "Tạm dừng"},
    {"id": 3, "name": "Nội dung 3", "status": "Hoạt động"},
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
    app.run(debug=True, port=5000)
