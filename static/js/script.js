// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const sidebarToggle   = document.getElementById('sidebarToggle');
const sidebar         = document.getElementById('sidebar');
const menuItems       = document.querySelectorAll('.menu-item[data-view]');
const dashboardView   = document.getElementById('dashboardView');
const transactionView = document.getElementById('transactionView');
const otherView       = document.getElementById('otherView');
const otherSearchBtn  = document.getElementById('otherSearchBtn');
const otherViewTitle  = document.getElementById('otherViewTitle');
const sidebarYear     = document.getElementById('sidebarYear');

let sampleData = []; // populated silently on load, used by other views

// Mapping from sidebar data-view (camelCase) to viewId (used in HTML IDs)
const viewIdMap = {
    'dashboard':          'dashboard',
    'transaction':        'transaction',
    'workOrder':          'workorder',
    'workOrderBill':      'workorderbill',
    'unconfirmedPO':      'unconfirmedposhipper',
    'salesOrder':         'salesorder',
    'qualityResult':      'qualityorderresult',
    'qualityModification': 'qualitymodification',
    'purchaseReceipt':    'purchasereceipt',
    'purchaseOrder':      'purchaseorder',
};

// List of views with their own search partial
const searchViewIds = ['workorder', 'workorderbill', 'unconfirmedposhipper', 'salesorder', 
                       'qualityorderresult', 'qualitymodification', 'purchasereceipt', 'purchaseorder'];

// ---------------------------------------------------------------------------
// View metadata for "other" views
// ---------------------------------------------------------------------------
const viewMeta = {
    workOrder:           { title: 'Work Order Browse (NRI)' },
    workOrderBill:       { title: 'Work Order Bill Browse' },
    unconfirmedPO:       { title: 'Unconfirmed PO Shipper Browse (NRI)' },
    salesOrder:          { title: 'Sales Order Browse (NRI)' },
    qualityResult:       { title: 'Quality Order Result Browse (NRI)' },
    qualityModification: { title: 'Quality Order Modification Browse (NRI)' },
    purchaseReceipt:     { title: 'Purchase Receipt Browse (NRI)' },
    purchaseOrder:       { title: 'Purchase Order Browse (NRI)' },
};

// ---------------------------------------------------------------------------
// Sidebar toggle
// ---------------------------------------------------------------------------
function setSidebarState(collapsed) {
    sidebar.classList.toggle('collapsed', collapsed);
    // Sync the CSS grid column to match sidebar width
    document.documentElement.style.setProperty(
        '--sidebar-width', collapsed ? '60px' : '265px'
    );
    const arrow = sidebarToggle.querySelector('.arrow-icon');
    // Arrow points left (←) when expanded, right (→) when collapsed
    if (arrow) arrow.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    localStorage.setItem('sidebarCollapsed', collapsed ? 'true' : 'false');
}

sidebarToggle.addEventListener('click', () => {
    setSidebarState(!sidebar.classList.contains('collapsed'));
});

// ---------------------------------------------------------------------------
// View switching
// ---------------------------------------------------------------------------
function setActiveView(sidebarViewId) {
    // Convert sidebar viewId to internal viewId using map
    const viewId = viewIdMap[sidebarViewId] || sidebarViewId;

    // Hide all views with class 'view'
    document.querySelectorAll('.view').forEach(el => {
        el.classList.add('hidden');
    });

    // Hide dashboard and other
    dashboardView?.classList.add('hidden');
    otherView?.classList.add('hidden');

    // Show the selected view
    if (viewId === 'dashboard') {
        dashboardView?.classList.remove('hidden');
    } else if (viewId === 'transaction') {
        transactionView?.classList.remove('hidden');
    } else {
        // For all other views (workorder, workorderbill, etc)
        const viewEl = document.getElementById(`${viewId}View`);
        if (viewEl) {
            viewEl.classList.remove('hidden');
        }
    }

    // Lazy load default data when user opens a searchable non-transaction view
    if (searchViewIds.includes(viewId) && typeof window.ensureSearchViewLoaded === 'function') {
        window.ensureSearchViewLoaded(viewId);
    }

    // Update active menu item
    menuItems.forEach(item => item.classList.toggle('active', item.dataset.view === sidebarViewId));
}

menuItems.forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        const sidebarView = item.dataset.view || 'dashboard';
        const viewId = viewIdMap[sidebarView] || sidebarView;
        setActiveView(sidebarView);

        // Only render "other" view for views not in searchViewIds
        if (!searchViewIds.includes(viewId) && viewId !== 'dashboard' && viewId !== 'transaction') {
            renderOtherView(sidebarView);
        }
    });
});


// ---------------------------------------------------------------------------
// Dashboard function cards — click to navigate
// ---------------------------------------------------------------------------
document.querySelectorAll('.fn-card[data-view]').forEach(card => {
    card.addEventListener('click', () => {
        const sidebarView = card.dataset.view;
        const viewId = viewIdMap[sidebarView] || sidebarView;
        setActiveView(sidebarView);
        // Views with their own partial don't need renderOtherView()
        if (!searchViewIds.includes(viewId) && viewId !== 'dashboard' && viewId !== 'transaction') {
            renderOtherView(sidebarView);
        }
    });
});


// ---------------------------------------------------------------------------
// "Other" views — simple client-side filter over sample data
// ---------------------------------------------------------------------------
function renderOtherView(viewId) {
    const meta = viewMeta[viewId] || { title: 'Chức năng khác' };
    if (otherViewTitle) otherViewTitle.textContent = meta.title;
    renderOtherResults(sampleData);
}

function renderOtherResults(results) {
    const tbody    = document.getElementById('otherBody');
    const countEl  = document.getElementById('otherCount');
    const template = document.getElementById('tableRowTemplate');

    if (!tbody) return;
    tbody.innerHTML = '';

    if (!results || results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">Không tìm thấy kết quả.</td></tr>';
    } else {
        results.forEach(item => {
            const clone    = template.content.cloneNode(true);
            clone.querySelector('[data-field="id"]').textContent = item.id;
            clone.querySelector('[data-field="name"]').textContent = item.name;
            const statusEl = clone.querySelector('[data-field="status"]');
            statusEl.textContent = item.status;
            statusEl.classList.add(`status-${item.status}`);
            clone.querySelector('[data-field="description"]').textContent = item.description;
            tbody.appendChild(clone);
        });
    }

    if (countEl) countEl.textContent = `Tìm thấy ${results.length} kết quả`;
}

function performOtherSearch() {
    const id     = document.getElementById('otherSearchId')?.value.trim() || '';
    const name   = document.getElementById('otherSearchName')?.value.trim().toLowerCase() || '';
    const status = document.getElementById('otherSearchStatus')?.value.trim().toLowerCase() || '';

    const filtered = sampleData.filter(item =>
        (!id     || String(item.id).includes(id)) &&
        (!name   || item.name.toLowerCase().includes(name)) &&
        (!status || item.status.toLowerCase().includes(status))
    );
    renderOtherResults(filtered);
}

if (otherSearchBtn) {
    otherSearchBtn.addEventListener('click', performOtherSearch);
}

// ---------------------------------------------------------------------------
// Background data loader — populates sampleData for "other" views
// ---------------------------------------------------------------------------
async function loadApiData() {
    try {
        const response = await fetch('/api/data');
        const data     = await response.json();
        sampleData     = data || [];
    } catch (err) {
        console.warn('loadApiData: could not fetch sample data', err);
    }
}

// ---------------------------------------------------------------------------
// Bootstrap on DOMContentLoaded
// ---------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
    if (sidebarYear) sidebarYear.textContent = String(new Date().getFullYear());
    setSidebarState(localStorage.getItem('sidebarCollapsed') === 'true');
    setActiveView('dashboard');
    loadApiData();
});
