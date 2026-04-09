/**
 * transaction.js
 * Handles the Transaction History Browse view:
 *   - dynamic search-condition builder
 *   - server-side search via POST /api/transaction/search
 *   - result rendering with DocumentFragment (performance)
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEFAULT_TRANSACTION_SEARCH_COLUMNS = [
    'pt_part_type', 'pt_prod_line', 'pt_um',
    'tr_curr',      'tr_date',      'tr_effdate',
    'tr_ex_rate',   'tr_ex_rate2',  'tr_line',
    'tr_loc',       'tr_lot',       'tr_nbr',
    'tr_part',      'tr_price',     'tr_program',
    'tr_qty_loc',   'tr_qty_req',   'tr_rmks',
    'tr_serial',    'tr_site',      'tr_status',
    'tr_time',      'tr_trnbr',     'tr_type',
    'tr_userid',
];

// Keep table columns in the same order as the SQL query requirement.
const TRANSACTION_VIEW_COLUMNS = [
    'tr_trnbr',
    'pt_prod_line',
    'pt_um',
    'pt_part_type',
    'tr_type',
    'tr_date',
    'tr_time',
    'tr_effdate',
    'tr_nbr',
    'tr_lot',
    'tr_line',
    'tr_site',
    'tr_loc',
    'tr_serial',
    'tr_part',
    'tr_qty_req',
    'tr_qty_loc',
    'tr_curr',
    'tr_price',
    'tr_userid',
    'tr_rmks',
    'tr_status',
    'tr_program',
    'tr_ex_rate2',
    'tr_ex_rate',
];

const TRANSACTION_OPERATORS = [
    { value: 'contains',   label: 'contains'    },
    { value: 'equals',     label: 'equals'      },
    { value: 'startswith', label: 'starts with' },
];

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------
const txDOM = {
    addConditionBtn: null,
    searchBtn:       null,
    clearBtn:        null,
    exportBtn:       null,
    conditionsDiv:   null,
    thead:           null,
    tbody:           null,
    countEl:         null,
    pager:           null,
    prevBtn:         null,
    nextBtn:         null,
    pageInfo:        null,
    pageSizeSel:     null,
};

let txConditionCount = 0;
let txAllData        = [];
let txCurrentPage    = 1;
let txPageSize       = 100;
let txPageSizeMode   = '100';
let txTotalRows      = 0;
let txTotalPages     = 0;
let txLastConditions = [];
let txSearchColumns  = [...DEFAULT_TRANSACTION_SEARCH_COLUMNS];

function txGetEffectivePageSize(totalRows) {
    if (txPageSizeMode === 'all') {
        return Math.max(totalRows || 0, 1);
    }
    return txPageSize;
}

function txGetRenderableColumns(sampleRow) {
    const dataColumns = Object.keys(sampleRow || {});
    let columns = txSearchColumns.length > 0
        ? txSearchColumns.filter(col => dataColumns.includes(col))
        : [];

    if (columns.length === 0) {
        columns = TRANSACTION_VIEW_COLUMNS.filter(col => dataColumns.includes(col));
    }
    if (columns.length === 0) {
        columns = dataColumns;
    }
    return columns;
}

function txExportToExcel() {
    if (typeof XLSX === 'undefined') {
        alert('Thiếu thư viện xuất Excel (XLSX)');
        return;
    }

    if (!Array.isArray(txAllData) || txAllData.length === 0) {
        alert('Không có dữ liệu để xuất');
        return;
    }

    const columns = txGetRenderableColumns(txAllData[0]);
    if (columns.length === 0) {
        alert('Không xác định được cột để xuất');
        return;
    }

    const header = ['Index', ...columns];
    const rows = [header];

    txAllData.forEach((row, idx) => {
        const values = [idx + 1];
        columns.forEach(col => values.push(txFormatDisplayValue(row[col], col)));
        rows.push(values);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transaction');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    XLSX.writeFile(wb, `transaction-history-${stamp}.xlsx`);
}

function txEnsureExportButton() {
    if (txDOM.exportBtn) return;

    const actions = txDOM.clearBtn?.parentElement;
    if (!actions) return;

    let btn = document.getElementById('transactionExportBtn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'transactionExportBtn';
        btn.type = 'button';
        btn.className = 'btn secondary';
        btn.textContent = 'Xuất Excel';
        actions.appendChild(btn);
    }

    txDOM.exportBtn = btn;
    txDOM.exportBtn.addEventListener('click', txExportToExcel);
}

function txFormatDateToDDMMYYYY(dateObj) {
    const dd = String(dateObj.getUTCDate()).padStart(2, '0');
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function txFormatDisplayValue(value, columnName) {
    if (value === null || value === undefined) return '';

    const col = String(columnName || '').toLowerCase();
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return txFormatDateToDDMMYYYY(value);
    }

    if (typeof value !== 'string') return value;

    const raw = value.trim();
    if (!raw) return '';

    const looksLikeDateColumn = col.includes('date') || col.endsWith('dt');
    const looksLikeDateValue =
        /^\d{4}-\d{2}-\d{2}/.test(raw) ||
        /^\d{4}\/\d{2}\/\d{2}/.test(raw) ||
        /^[A-Za-z]{3},\s\d{1,2}\s[A-Za-z]{3}\s\d{4}/.test(raw);

    if (looksLikeDateColumn || looksLikeDateValue) {
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
            return txFormatDateToDDMMYYYY(parsed);
        }
    }

    return value;
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------
async function initTransactionSearch() {
    txDOM.addConditionBtn = document.getElementById('transactionAddConditionBtn');
    txDOM.searchBtn       = document.getElementById('transactionSearchBtn');
    txDOM.clearBtn        = document.getElementById('transactionClearAllBtn');
    txDOM.conditionsDiv   = document.getElementById('transactionSearchConditions');
    txDOM.thead           = document.getElementById('transactionTableHeaders');
    txDOM.tbody           = document.getElementById('transactionTableBody');
    txDOM.countEl         = document.getElementById('transactionCount');

    txEnsurePaginationControls();

    txDOM.addConditionBtn?.addEventListener('click', txAddCondition);
    txDOM.searchBtn?.addEventListener('click', () => txPerformSearch(1));
    txDOM.clearBtn?.addEventListener('click', txClearAll);
    txEnsureExportButton();

    await txLoadSearchColumns();

    // Start with one empty condition row
    if (txConditionCount === 0) txAddCondition();

    if (txDOM.countEl) {
        txDOM.countEl.textContent = 'Đang tải dữ liệu Transaction...';
    }

    // Load the default grid data from Transaction History Browse (NRI)
    txLoadDefaultData(1);
}

async function txLoadSearchColumns() {
    try {
        const response = await fetch('/api/transaction/columns');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        const cols = Array.isArray(result?.columns) ? result.columns : [];

        if (cols.length > 0) {
            txSearchColumns = cols;
        } else {
            txSearchColumns = [...DEFAULT_TRANSACTION_SEARCH_COLUMNS];
        }
    } catch (err) {
        console.warn('Cannot load transaction columns from API, fallback to defaults:', err);
        txSearchColumns = [...DEFAULT_TRANSACTION_SEARCH_COLUMNS];
    }
}

function txEnsurePaginationControls() {
    if (!txDOM.countEl) {
        console.warn('txEnsurePaginationControls: countEl not found');
        return;
    }

    let pager = document.querySelector('#transactionView .pagination-controls');
    if (!pager) {
        pager = document.createElement('div');
        pager.className = 'pagination-controls';
        pager.innerHTML = `
            <button type="button" class="btn secondary pager-prev">Trang trước</button>
            <span class="pager-info">Trang 0/0</span>
            <button type="button" class="btn secondary pager-next">Trang sau</button>
            <label class="pager-size-wrap">
                <span>Hiển thị</span>
                <select class="pager-size">
                    <option value="50">50</option>
                    <option value="100" selected>100</option>
                    <option value="200">200</option>
                    <option value="all">All</option>
                </select>
            </label>
        `;
        
        // Insert after .search-summary element
        const summary = document.querySelector('#transactionView .search-summary');
        if (summary && summary.parentElement) {
            summary.parentElement.insertBefore(pager, summary.nextSibling);
        } else {
            console.warn('Could not find insertion point for pagination controls');
            return;
        }
    }

    txDOM.pager = pager;
    txDOM.prevBtn = pager.querySelector('.pager-prev');
    txDOM.nextBtn = pager.querySelector('.pager-next');
    txDOM.pageInfo = pager.querySelector('.pager-info');
    txDOM.pageSizeSel = pager.querySelector('.pager-size');

    txDOM.prevBtn?.addEventListener('click', () => {
        if (txCurrentPage > 1) {
            if (txLastConditions.length > 0) {
                txPerformSearch(txCurrentPage - 1);
            } else {
                txLoadDefaultData(txCurrentPage - 1);
            }
        }
    });

    txDOM.nextBtn?.addEventListener('click', () => {
        if (txCurrentPage < txTotalPages) {
            if (txLastConditions.length > 0) {
                txPerformSearch(txCurrentPage + 1);
            } else {
                txLoadDefaultData(txCurrentPage + 1);
            }
        }
    });

    txDOM.pageSizeSel?.addEventListener('change', () => {
        txPageSizeMode = txDOM.pageSizeSel.value;
        txPageSize = Number(txPageSizeMode) || 100;
        if (txLastConditions.length > 0) {
            txPerformSearch(1);
        } else {
            txLoadDefaultData(1);
        }
    });

    txUpdatePaginationUI();
}

function txUpdatePaginationUI() {
    if (!txDOM.pageInfo || !txDOM.prevBtn || !txDOM.nextBtn) return;

    const current = txTotalPages > 0 ? txCurrentPage : 0;
    txDOM.pageInfo.textContent = `Trang ${current}/${txTotalPages}`;
    txDOM.prevBtn.disabled = txCurrentPage <= 1;
    txDOM.nextBtn.disabled = txCurrentPage >= txTotalPages || txTotalPages === 0;
}

async function txLoadDefaultData(targetPage = 1) {
    targetPage = Number.isFinite(Number(targetPage)) && Number(targetPage) > 0
        ? Number(targetPage)
        : 1;

    if (txDOM.countEl) txDOM.countEl.textContent = 'Đang tải dữ liệu Transaction...';
    if (txDOM.tbody) txDOM.tbody.innerHTML = '';

    try {
        const response = await fetch(`/api/transaction?limit=10000`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        txAllData = Array.isArray(data) ? data : [];
        
        // Client-side pagination
        txTotalRows = txAllData.length;
        const effectivePageSize = txGetEffectivePageSize(txTotalRows);
        txTotalPages = txTotalRows > 0 ? Math.ceil(txTotalRows / effectivePageSize) : 0;
        txCurrentPage = txTotalPages > 0 ? Math.min(targetPage, txTotalPages) : 1;
        
        const startIdx = txTotalRows > 0 ? (txCurrentPage - 1) * effectivePageSize : 0;
        const pageData = txAllData.slice(startIdx, startIdx + effectivePageSize);
        
        txDisplayData(pageData, startIdx);
        txUpdatePaginationUI();
    } catch (err) {
        console.warn('Transaction load error:', err);
        if (txDOM.countEl) txDOM.countEl.textContent = `Lỗi tải dữ liệu: ${err.message}`;
        txCurrentPage = 1;
        txTotalRows = 0;
        txTotalPages = 0;
        txUpdatePaginationUI();
    }
}

// ---------------------------------------------------------------------------
// Add a search condition row
// ---------------------------------------------------------------------------
function txAddCondition() {
    if (!txDOM.conditionsDiv) return;

    const id  = txConditionCount++;
    const row = document.createElement('div');
    row.id        = `tx-condition-${id}`;
    row.className = 'tx-condition';

    // Column select
    const colSel = document.createElement('select');
    colSel.className = 'tx-col';
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = '-- Chọn cột --';
    colSel.appendChild(defOpt);
    txSearchColumns.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col;
        opt.textContent = col;
        colSel.appendChild(opt);
    });

    // Operator select
    const opSel = document.createElement('select');
    opSel.className = 'tx-op';
    TRANSACTION_OPERATORS.forEach(op => {
        const opt = document.createElement('option');
        opt.value = op.value;
        opt.textContent = op.label;
        opSel.appendChild(opt);
    });

    // Value input
    const valInput = document.createElement('input');
    valInput.type        = 'text';
    valInput.className   = 'tx-val';
    valInput.placeholder = 'Nhập giá trị...';

    // Allow search on Enter key
    valInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') txPerformSearch();
    });

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '−';
    removeBtn.className   = 'btn btn-remove';
    removeBtn.setAttribute('aria-label', 'Xoá điều kiện');
    removeBtn.addEventListener('click', () => row.remove());

    row.append(colSel, opSel, valInput, removeBtn);
    txDOM.conditionsDiv.appendChild(row);
}

// ---------------------------------------------------------------------------
// Perform server-side search
// ---------------------------------------------------------------------------
async function txPerformSearch(targetPage = 1) {
    if (!txDOM.conditionsDiv) return;

    targetPage = Number.isFinite(Number(targetPage)) && Number(targetPage) > 0
        ? Number(targetPage)
        : 1;

    let conditions = txLastConditions;
    if (targetPage === 1 || txLastConditions.length === 0) {
        conditions = [];
        txDOM.conditionsDiv.querySelectorAll('[id^="tx-condition-"]').forEach(row => {
            const col = row.querySelector('.tx-col')?.value?.trim();
            const op  = row.querySelector('.tx-op')?.value?.trim();
            const val = row.querySelector('.tx-val')?.value?.trim();
            if (col && val) {
                conditions.push({ column: col, operator: op || 'contains', value: val });
            }
        });
        txLastConditions = conditions;
    }

    // If no conditions, show default data with paging
    if (conditions.length === 0) {
        txLastConditions = [];
        txLoadDefaultData(1);
        return;
    }

    if (txDOM.countEl) txDOM.countEl.textContent = 'Đang tải...';
    if (txDOM.tbody)   txDOM.tbody.innerHTML = '';

    try {
        const response = await fetch('/api/transaction/search', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ conditions, limit: 10000 }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();

        if (result.success || Array.isArray(result)) {
            // Get data from success response or array
            const data = result.data || result;
            txAllData = Array.isArray(data) ? data : [];
            
            // Client-side pagination
            txTotalRows = txAllData.length;
            const effectivePageSize = txGetEffectivePageSize(txTotalRows);
            txTotalPages = txTotalRows > 0 ? Math.ceil(txTotalRows / effectivePageSize) : 0;
            txCurrentPage = txTotalPages > 0 ? Math.min(targetPage, txTotalPages) : 1;
            
            const startIdx = txTotalRows > 0 ? (txCurrentPage - 1) * effectivePageSize : 0;
            const pageData = txAllData.slice(startIdx, startIdx + effectivePageSize);
            
            txDisplayData(pageData, startIdx);
            txUpdatePaginationUI();
        } else {
            if (txDOM.countEl) txDOM.countEl.textContent = `Lỗi: ${result.error}`;
            txCurrentPage = 1;
            txTotalRows = 0;
            txTotalPages = 0;
            txUpdatePaginationUI();
        }
    } catch (err) {
        console.error('Transaction search error:', err);
        if (txDOM.countEl) txDOM.countEl.textContent = `Lỗi kết nối: ${err.message}`;
        txCurrentPage = 1;
        txTotalRows = 0;
        txTotalPages = 0;
        txUpdatePaginationUI();
    }
}

// ---------------------------------------------------------------------------
// Clear all conditions and results
// ---------------------------------------------------------------------------
function txClearAll() {
    if (!txDOM.conditionsDiv) return;

    txDOM.conditionsDiv.querySelectorAll('.tx-val').forEach(i => { i.value = ''; });
    txDOM.conditionsDiv.querySelectorAll('.tx-col').forEach(s => { s.value = ''; });

    txAllData = [];
    txLastConditions = [];
    txCurrentPage = 1;
    txLoadDefaultData(1);
}

// ---------------------------------------------------------------------------
// Render results into the table (uses DocumentFragment for performance)
// ---------------------------------------------------------------------------
function txDisplayData(data, startIndex = 0) {
    if (!txDOM.tbody || !txDOM.thead) return;

    txDOM.tbody.innerHTML = '';

    if (!data || data.length === 0) {
        // Reset data-column headers, keep Index column
        while (txDOM.thead.children.length > 1) {
            txDOM.thead.removeChild(txDOM.thead.lastChild);
        }
        if (txDOM.countEl) txDOM.countEl.textContent = 'Không tìm thấy kết quả';
        return;
    }

    const columns = txGetRenderableColumns(data[0]);

    // Build column headers only once
    while (txDOM.thead.children.length > 1) {
        txDOM.thead.removeChild(txDOM.thead.lastChild);
    }
    const hFrag = document.createDocumentFragment();
    columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        hFrag.appendChild(th);
    });
    txDOM.thead.appendChild(hFrag);

    // Build rows
    const frag = document.createDocumentFragment();
    data.forEach((row, index) => {
        const tr = document.createElement('tr');

        const idxTd = document.createElement('td');
        idxTd.textContent = startIndex + index + 1;
        tr.appendChild(idxTd);

        columns.forEach(col => {
            const td = document.createElement('td');
            td.textContent = txFormatDisplayValue(row[col], col);
            tr.appendChild(td);
        });

        frag.appendChild(tr);
    });

    txDOM.tbody.appendChild(frag);

    if (txDOM.countEl) {
        if (txTotalRows > 0) {
            txDOM.countEl.textContent = `Tìm thấy ${txTotalRows} kết quả`;
        } else {
            txDOM.countEl.textContent = 'Không tìm thấy kết quả';
        }
    }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Slight delay ensures other DOMContentLoaded handlers (script.js) run first
    setTimeout(initTransactionSearch, 100);
});
