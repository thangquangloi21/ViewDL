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
const TRANSACTION_SEARCH_COLUMNS = [
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

const TRANSACTION_OPERATORS = [
    { value: 'contains',   label: 'contains'    },
    { value: 'equals',     label: 'equals'      },
    { value: 'startsWith', label: 'starts with' },
];

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------
const txDOM = {
    addConditionBtn: null,
    searchBtn:       null,
    clearBtn:        null,
    conditionsDiv:   null,
    thead:           null,
    tbody:           null,
    countEl:         null,
};

let txConditionCount = 0;
let txAllData        = [];

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------
function initTransactionSearch() {
    txDOM.addConditionBtn = document.getElementById('transactionAddConditionBtn');
    txDOM.searchBtn       = document.getElementById('transactionSearchBtn');
    txDOM.clearBtn        = document.getElementById('transactionClearAllBtn');
    txDOM.conditionsDiv   = document.getElementById('transactionSearchConditions');
    txDOM.thead           = document.getElementById('transactionTableHeaders');
    txDOM.tbody           = document.getElementById('transactionTableBody');
    txDOM.countEl         = document.getElementById('transactionCount');

    txDOM.addConditionBtn?.addEventListener('click', txAddCondition);
    txDOM.searchBtn?.addEventListener('click', txPerformSearch);
    txDOM.clearBtn?.addEventListener('click', txClearAll);

    // Start with one empty condition row
    if (txConditionCount === 0) txAddCondition();

    if (txDOM.countEl) {
        txDOM.countEl.textContent = 'Nhập điều kiện tìm kiếm và click "Search"';
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
    TRANSACTION_SEARCH_COLUMNS.forEach(col => {
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
async function txPerformSearch() {
    if (!txDOM.conditionsDiv) return;

    const conditions = [];
    txDOM.conditionsDiv.querySelectorAll('[id^="tx-condition-"]').forEach(row => {
        const col = row.querySelector('.tx-col')?.value?.trim();
        const op  = row.querySelector('.tx-op')?.value?.trim();
        const val = row.querySelector('.tx-val')?.value?.trim();
        if (col && val) {
            conditions.push({ column: col, operator: op || 'contains', value: val });
        }
    });

    // If no conditions, clear the table without calling the server
    if (conditions.length === 0) {
        txDisplayData([]);
        if (txDOM.countEl) txDOM.countEl.textContent = 'Nhập điều kiện tìm kiếm và click "Search"';
        return;
    }

    if (txDOM.countEl) txDOM.countEl.textContent = 'Đang tải...';
    if (txDOM.tbody)   txDOM.tbody.innerHTML = '';

    try {
        const response = await fetch('/api/transaction/search', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ conditions, limit: 200 }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();

        if (result.success) {
            txAllData = result.data;
            txDisplayData(result.data);
        } else {
            if (txDOM.countEl) txDOM.countEl.textContent = `Lỗi: ${result.error}`;
        }
    } catch (err) {
        console.error('Transaction search error:', err);
        if (txDOM.countEl) txDOM.countEl.textContent = `Lỗi kết nối: ${err.message}`;
    }
}

// ---------------------------------------------------------------------------
// Clear all conditions and results
// ---------------------------------------------------------------------------
function txClearAll() {
    if (!txDOM.conditionsDiv) return;

    txDOM.conditionsDiv.querySelectorAll('.tx-val').forEach(i => { i.value = ''; });
    txDOM.conditionsDiv.querySelectorAll('.tx-col').forEach(s => { s.value = ''; });

    if (txDOM.tbody) txDOM.tbody.innerHTML = '';
    if (txDOM.thead) {
        // Keep only the Index <th>; strip data columns added dynamically
        while (txDOM.thead.children.length > 1) {
            txDOM.thead.removeChild(txDOM.thead.lastChild);
        }
    }

    txAllData = [];
    if (txDOM.countEl) txDOM.countEl.textContent = 'Nhập điều kiện tìm kiếm và click "Search"';
}

// ---------------------------------------------------------------------------
// Render results into the table (uses DocumentFragment for performance)
// ---------------------------------------------------------------------------
function txDisplayData(data) {
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

    const columns = Object.keys(data[0]);

    // Build column headers only once
    if (txDOM.thead.children.length === 1) {
        const hFrag = document.createDocumentFragment();
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            hFrag.appendChild(th);
        });
        txDOM.thead.appendChild(hFrag);
    }

    // Build rows
    const frag = document.createDocumentFragment();
    data.forEach((row, index) => {
        const tr = document.createElement('tr');

        const idxTd = document.createElement('td');
        idxTd.textContent = index + 1;
        tr.appendChild(idxTd);

        columns.forEach(col => {
            const td = document.createElement('td');
            td.textContent = row[col] ?? '';
            tr.appendChild(td);
        });

        frag.appendChild(tr);
    });

    txDOM.tbody.appendChild(frag);

    if (txDOM.countEl) {
        txDOM.countEl.textContent = `Tìm thấy ${data.length} kết quả`;
    }
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Slight delay ensures other DOMContentLoaded handlers (script.js) run first
    setTimeout(initTransactionSearch, 100);
});
