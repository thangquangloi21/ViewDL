// Lấy các phần tử DOM cần thiết
const sidebarToggle = document.getElementById('sidebarToggle'); // Nút toggle sidebar
const sidebar = document.getElementById('sidebar'); // Phần tử sidebar
const container = document.getElementById('container'); // Container chính
const loadApiDataBtn = document.getElementById('loadApiData'); // Nút tải dữ liệu API
const apiDataList = document.getElementById('apiDataList'); // Danh sách hiển thị dữ liệu API
const apiCount = document.getElementById('apiCount'); // Hiển thị số lượng API

const menuItems = document.querySelectorAll('.menu-item[data-view]'); // Các menu item chuyển view
const dashboardView = document.getElementById('dashboardView'); // View dashboard
const transactionView = document.getElementById('transactionView'); // View Transaction History
const otherView = document.getElementById('otherView'); // View placeholder cho các chức năng khác
const searchBtn = document.getElementById('searchTransactionBtn'); // Nút tìm kiếm Transaction History
const searchIdInput = document.getElementById('searchId');
const searchNameInput = document.getElementById('searchName');
const searchStatusInput = document.getElementById('searchStatus');
const transactionBody = document.getElementById('transactionBody');
const transactionCount = document.getElementById('transactionCount');
const otherViewTitle = document.getElementById('otherViewTitle');
const otherViewContent = document.getElementById('otherViewContent');
const otherSearchBtn = document.getElementById('otherSearchBtn'); // Nút tìm kiếm cho các view khác
const otherSearchIdInput = document.getElementById('otherSearchId');
const otherSearchNameInput = document.getElementById('otherSearchName');
const otherSearchStatusInput = document.getElementById('otherSearchStatus');
const otherBody = document.getElementById('otherBody');
const otherCount = document.getElementById('otherCount');
let transactionData = [];

// Metadata cho các view ngoài dashboard và transaction
const viewMeta = {
    workOrder: {
        title: 'Work Order Browse (NRI)',
    },
    workOrderBill: {
        title: 'Work Order Bill Browse',
    },
    unconfirmedPO: {
        title: 'Unconfirmed PO Shipper Browse (NRI)',
    },
    salesOrder: {
        title: 'Sales Order Browse (NRI)',
    },
    qualityResult: {
        title: 'Quality Order Result Browse (NRI)',
    },
    qualityModification: {
        title: 'Quality Order Modification Browse (NRI)',
    },
    purchaseReceipt: {
        title: 'Purchase Receipt Browse (NRI)',
    },
    purchaseOrder: {
        title: 'Purchase Order Browse (NRI)',
    },
};

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
    setActiveView('dashboard');
});

// Chuyển đổi giữa các view
function setActiveView(viewId) {
    const showDashboard = viewId === 'dashboard';
    const showTransaction = viewId === 'transaction';
    const showOther = viewId !== 'dashboard' && viewId !== 'transaction';

    dashboardView.classList.toggle('hidden', !showDashboard);
    transactionView.classList.toggle('hidden', !showTransaction);
    otherView.classList.toggle('hidden', !showOther);

    menuItems.forEach((item) => {
        item.classList.toggle('active', item.dataset.view === viewId);
    });
}

// Hiển thị nội dung placeholder cho các view khác
function renderOtherView(viewId) {
    const meta = viewMeta[viewId] || {
        title: 'Chức năng khác',
    };

    otherViewTitle.textContent = meta.title;
    renderOtherResults(transactionData); // Hiển thị toàn bộ dữ liệu ban đầu
}

// Hiển thị kết quả tìm kiếm cho các view khác
function renderOtherResults(results) {
    const tbody = document.getElementById('otherBody');
    tbody.innerHTML = '';
    if (!results || results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Không tìm thấy kết quả.</td></tr>';
    } else {
        const template = document.getElementById('tableRowTemplate');
        results.forEach((item) => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('[data-field="id"]').textContent = item.id;
            clone.querySelector('[data-field="name"]').textContent = item.name;
            const statusEl = clone.querySelector('[data-field="status"]');
            statusEl.textContent = item.status;
            statusEl.classList.add(`status-${item.status}`);
            clone.querySelector('[data-field="description"]').textContent = item.description;
            tbody.appendChild(clone);
        });
    }
    document.getElementById('otherCount').textContent = `Tìm thấy ${results.length} kết quả`;
}

// Tìm kiếm dữ liệu cho các view khác
function performOtherSearch() {
    const idValue = otherSearchIdInput.value.trim();
    const nameValue = otherSearchNameInput.value.trim().toLowerCase();
    const statusValue = otherSearchStatusInput.value.trim().toLowerCase();
    const filtered = transactionData.filter((item) => {
        const matchesId = !idValue || String(item.id).includes(idValue);
        const matchesName = !nameValue || item.name.toLowerCase().includes(nameValue);
        const matchesStatus = !statusValue || item.status.toLowerCase().includes(statusValue);
        return matchesId && matchesName && matchesStatus;
    });
    renderOtherResults(filtered);
}

// Hiển thị kết quả tìm kiếm Transaction History
function renderTransactionResults(results) {
    const tbody = document.getElementById('transactionBody');
    tbody.innerHTML = '';
    if (!results || results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Không tìm thấy kết quả.</td></tr>';
    } else {
        const template = document.getElementById('tableRowTemplate');
        results.forEach((item) => {
            const clone = template.content.cloneNode(true);
            clone.querySelector('[data-field="id"]').textContent = item.id;
            clone.querySelector('[data-field="name"]').textContent = item.name;
            const statusEl = clone.querySelector('[data-field="status"]');
            statusEl.textContent = item.status;
            statusEl.classList.add(`status-${item.status}`);
            clone.querySelector('[data-field="description"]').textContent = item.description;
            tbody.appendChild(clone);
        });
    }
    document.getElementById('transactionCount').textContent = `Tìm thấy ${results.length} kết quả`;
}

// Tìm kiếm dữ liệu Transaction History
function performSearch() {
    const idValue = searchIdInput.value.trim();
    const nameValue = searchNameInput.value.trim().toLowerCase();
    const statusValue = searchStatusInput.value.trim().toLowerCase();
    const filtered = transactionData.filter((item) => {
        const matchesId = !idValue || String(item.id).includes(idValue);
        const matchesName = !nameValue || item.name.toLowerCase().includes(nameValue);
        const matchesStatus = !statusValue || item.status.toLowerCase().includes(statusValue);
        return matchesId && matchesName && matchesStatus;
    });
    renderTransactionResults(filtered);
}

menuItems.forEach((item) => {
    item.addEventListener('click', (event) => {
        event.preventDefault();
        const view = item.dataset.view || 'dashboard';
        setActiveView(view);

        if (view === 'transaction') {
            renderTransactionResults(transactionData);
        } else if (view !== 'dashboard') {
            renderOtherView(view);
        }
    });
});

if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
}

if (otherSearchBtn) {
    otherSearchBtn.addEventListener('click', performOtherSearch);
}

// Hàm tải dữ liệu từ API
async function loadApiData() {
    const apiLoading = document.getElementById('apiLoading');
    const apiDataList = document.getElementById('apiDataList');
    const apiCount = document.getElementById('apiCount');

    apiLoading.classList.remove('hidden');
    apiDataList.innerHTML = '';

    try {
        const response = await fetch('/api/data'); // Gọi API endpoint
        const data = await response.json(); // Chuyển response thành JSON
        transactionData = data; // Lưu dữ liệu để dùng cho các view tìm kiếm
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
            li.textContent = `#${item.id} – ${item.name} (${item.status}) - ${item.description}`; // Hiển thị thông tin item
            apiDataList.appendChild(li); // Thêm vào danh sách
        });
    } catch (err) { // Xử lý lỗi
        apiDataList.innerHTML = '<li>Không tải được dữ liệu API.</li>'; // Thông báo lỗi
        console.error(err); // Log lỗi ra console
        apiCount.textContent = '0'; // Cập nhật số lượng
    } finally {
        apiLoading.classList.add('hidden');
    }
}

// Sự kiện click nút tải dữ liệu API
loadApiDataBtn.addEventListener('click', loadApiData);
// Tự động tải dữ liệu khi trang load
loadApiData();
