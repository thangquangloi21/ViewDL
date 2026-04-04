// Lấy các phần tử DOM cần thiết
const sidebarToggle = document.getElementById('sidebarToggle'); // Nút toggle sidebar
const sidebar = document.getElementById('sidebar'); // Phần tử sidebar
const container = document.getElementById('container'); // Container chính
const loadApiDataBtn = document.getElementById('loadApiData'); // Nút tải dữ liệu API
const apiDataList = document.getElementById('apiDataList'); // Danh sách hiển thị dữ liệu API
const apiCount = document.getElementById('apiCount'); // Hiển thị số lượng API

// Hàm thiết lập trạng thái sidebar (mở/đóng)
function setSidebarState(collapsed) {
    const width = collapsed ? '0px' : '260px'; // Chiều rộng sidebar: 0px khi đóng, 260px khi mở
    document.documentElement.style.setProperty('--sidebar-width', width); // Cập nhật biến CSS
    if (collapsed) {
        sidebar.classList.add('collapsed'); // Thêm class collapsed
    } else {
        sidebar.classList.remove('collapsed'); // Xóa class collapsed
    }
    const arrow = sidebarToggle.querySelector('.arrow-icon'); // Lấy icon mũi tên
    arrow.style.transform = collapsed ? 'rotate(0deg)' : 'rotate(180deg)'; // Xoay mũi tên
    localStorage.setItem('sidebarCollapsed', collapsed ? 'true' : 'false'); // Lưu trạng thái vào localStorage
}

// Sự kiện click nút toggle sidebar
sidebarToggle.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.contains('collapsed'); // Kiểm tra trạng thái hiện tại
    setSidebarState(!isCollapsed); // Đảo ngược trạng thái
});

// Sự kiện khi trang tải xong, khôi phục trạng thái sidebar từ localStorage
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('sidebarCollapsed'); // Lấy trạng thái đã lưu
    const collapsed = saved === 'true'; // Chuyển thành boolean
    setSidebarState(collapsed); // Áp dụng trạng thái
});

// Hàm tải dữ liệu từ API
async function loadApiData() {
    try {
        const response = await fetch('/api/data'); // Gọi API endpoint
        const data = await response.json(); // Chuyển response thành JSON
        apiDataList.innerHTML = ''; // Xóa nội dung cũ
        if (!data || data.length === 0) { // Nếu không có dữ liệu
            const li = document.createElement('li'); // Tạo phần tử li
            li.textContent = 'Không có dữ liệu API hiện tại.'; // Thông báo không có dữ liệu
            li.style.fontStyle = 'italic'; // In nghiêng
            apiDataList.appendChild(li); // Thêm vào danh sách
            apiCount.textContent = '0'; // Cập nhật số lượng
            return; // Thoát hàm
        }
        apiCount.textContent = data.length; // Cập nhật số lượng
        data.forEach((item) => { // Duyệt qua từng item
            const li = document.createElement('li'); // Tạo phần tử li
            li.textContent = `#${item.id} – ${item.name} (${item.status})`; // Hiển thị thông tin item
            apiDataList.appendChild(li); // Thêm vào danh sách
        });
    } catch (err) { // Xử lý lỗi
        apiDataList.innerHTML = '<li>Không tải được dữ liệu API.</li>'; // Thông báo lỗi
        console.error(err); // Log lỗi ra console
        apiCount.textContent = '0'; // Cập nhật số lượng
    }
}

// Sự kiện click nút tải dữ liệu API
loadApiDataBtn.addEventListener('click', loadApiData);
// Tự động tải dữ liệu khi trang load
loadApiData();
