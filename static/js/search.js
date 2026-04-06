/**
 * search.js
 * Generic search handler for all searchable views.
 * 
 * Usage in HTML:
 *   <div data-search-table="transaction" data-search-columns="col1,col2,col3">
 *     ... (form elements with specific IDs)
 *   </div>
 * 
 *   Then call: initSearch('transaction')
 */

// Global search instances (one per table)
const searchInstances = {};

const OPERATORS = [
    { value: 'contains',   label: 'contains'    },
    { value: 'equals',     label: 'equals'      },
    { value: 'startswith', label: 'starts with' },
];

/**
 * Initialize search handler for a specific table
 * @param {string} tableId - table identifier ('transaction', 'workorder', etc)
 * @param {array} columns - array of column names for this table
 */
function initSearch(tableId, columns) {
    const handler = new SearchHandler(tableId, columns);
    searchInstances[tableId] = handler;
    handler.init();
}

/**
 * SearchHandler class — encapsulates search logic for one table
 */
class SearchHandler {
    constructor(tableId, columns) {
        this.tableId = tableId;
        this.columns = columns || [];
        this.conditionCount = 0;
        this.allData = [];
        
        // DOM element IDs (derived from tableId)
        this.ids = this._buildIds();
        this.dom = {};
    }

    /**
     * Build ID selectors based on tableId
     * VD: tableId='transaction' → 'transactionSearchConditions', 'transactionSearchBtn', etc
     */
    _buildIds() {
        const prefix = this.tableId;
        return {
            conditions:           `${prefix}SearchConditions`,
            addConditionBtn:      `${prefix}AddConditionBtn`,
            searchBtn:            `${prefix}SearchBtn`,
            clearBtn:             `${prefix}ClearAllBtn`,
            tableHeaders:         `${prefix}TableHeaders`,
            tableBody:            `${prefix}TableBody`,
            countEl:              `${prefix}Count`,
        };
    }

    /**
     * Initialize DOM references and event listeners
     */
    init() {
        // Get DOM elements by ID
        this.dom.conditionsDiv = document.getElementById(this.ids.conditions);
        this.dom.addConditionBtn = document.getElementById(this.ids.addConditionBtn);
        this.dom.searchBtn = document.getElementById(this.ids.searchBtn);
        this.dom.clearBtn = document.getElementById(this.ids.clearBtn);
        this.dom.thead = document.getElementById(this.ids.tableHeaders);
        this.dom.tbody = document.getElementById(this.ids.tableBody);
        this.dom.countEl = document.getElementById(this.ids.countEl);

        // Attach event listeners
        this.dom.addConditionBtn?.addEventListener('click', () => this.addCondition());
        this.dom.searchBtn?.addEventListener('click', () => this.performSearch());
        this.dom.clearBtn?.addEventListener('click', () => this.clearAll());

        // Start with one empty condition row
        if (this.conditionCount === 0) {
            this.addCondition();
        }

        // Initial message
        if (this.dom.countEl) {
            this.dom.countEl.textContent = 'Nhập điều kiện tìm kiếm và click "Tìm kiếm"';
        }
    }

    /**
     * Add a search condition row
     */
    addCondition() {
        if (!this.dom.conditionsDiv) return;

        const id = this.conditionCount++;
        const row = document.createElement('div');
        row.id = `${this.tableId}-condition-${id}`;
        row.className = 'tx-condition';

        // Column select
        const colSel = document.createElement('select');
        colSel.className = 'tx-col';
        const defOpt = document.createElement('option');
        defOpt.value = '';
        defOpt.textContent = '-- Chọn cột --';
        colSel.appendChild(defOpt);

        this.columns.forEach(col => {
            const opt = document.createElement('option');
            opt.value = col;
            opt.textContent = col;
            colSel.appendChild(opt);
        });

        // Operator select
        const opSel = document.createElement('select');
        opSel.className = 'tx-op';
        OPERATORS.forEach(op => {
            const opt = document.createElement('option');
            opt.value = op.value;
            opt.textContent = op.label;
            opSel.appendChild(opt);
        });

        // Value input
        const valInput = document.createElement('input');
        valInput.type = 'text';
        valInput.className = 'tx-val';
        valInput.placeholder = 'Nhập giá trị...';
        valInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '−';
        removeBtn.className = 'btn btn-remove';
        removeBtn.setAttribute('aria-label', 'Xoá điều kiện');
        removeBtn.addEventListener('click', () => row.remove());

        row.append(colSel, opSel, valInput, removeBtn);
        this.dom.conditionsDiv.appendChild(row);
    }

    /**
     * Perform server-side search
     */
    async performSearch() {
        if (!this.dom.conditionsDiv) return;

        // Build conditions array from DOM
        const conditions = [];
        this.dom.conditionsDiv.querySelectorAll(`[id^="${this.tableId}-condition-"]`).forEach(row => {
            const col = row.querySelector('.tx-col')?.value?.trim();
            const op = row.querySelector('.tx-op')?.value?.trim();
            const val = row.querySelector('.tx-val')?.value?.trim();
            if (col && val) {
                conditions.push({ column: col, operator: op || 'contains', value: val });
            }
        });

        // No conditions → clear table
        if (conditions.length === 0) {
            this.displayData([]);
            if (this.dom.countEl) {
                this.dom.countEl.textContent = 'Nhập điều kiện tìm kiếm và click "Tìm kiếm"';
            }
            return;
        }

        // Show loading
        if (this.dom.countEl) this.dom.countEl.textContent = 'Đang tải...';
        if (this.dom.tbody) this.dom.tbody.innerHTML = '';

        try {
            // POST to /api/search/<tableId>
            const response = await fetch(`/api/search/${this.tableId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conditions, limit: 200 }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();

            if (result.success) {
                this.allData = result.data;
                this.displayData(result.data);
            } else {
                if (this.dom.countEl) {
                    this.dom.countEl.textContent = `Lỗi: ${result.error}`;
                }
            }
        } catch (err) {
            console.error(`Search error (${this.tableId}):`, err);
            if (this.dom.countEl) {
                this.dom.countEl.textContent = `Lỗi kết nối: ${err.message}`;
            }
        }
    }

    /**
     * Clear all conditions and results
     */
    clearAll() {
        if (!this.dom.conditionsDiv) return;

        this.dom.conditionsDiv.querySelectorAll('.tx-val').forEach(i => { i.value = ''; });
        this.dom.conditionsDiv.querySelectorAll('.tx-col').forEach(s => { s.value = ''; });

        if (this.dom.tbody) this.dom.tbody.innerHTML = '';
        if (this.dom.thead) {
            // Keep only the Index <th>
            while (this.dom.thead.children.length > 1) {
                this.dom.thead.removeChild(this.dom.thead.lastChild);
            }
        }

        this.allData = [];
        if (this.dom.countEl) {
            this.dom.countEl.textContent = 'Nhập điều kiện tìm kiếm và click "Tìm kiếm"';
        }
    }

    /**
     * Render results into the table
     */
    displayData(data) {
        if (!Array.isArray(data) || !this.dom.tbody) return;

        // Get column names from first row
        const columns = data.length > 0 ? Object.keys(data[0]) : [];

        // Update table headers
        this.dom.thead.innerHTML = '<th>Index</th>';
        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col;
            this.dom.thead.appendChild(th);
        });

        // Build rows using DocumentFragment (performance)
        const frag = document.createDocumentFragment();

        data.forEach((row, idx) => {
            const tr = document.createElement('tr');

            // Index column
            const tdIndex = document.createElement('td');
            tdIndex.textContent = idx + 1;
            tr.appendChild(tdIndex);

            // Data columns
            columns.forEach(col => {
                const td = document.createElement('td');
                td.textContent = row[col] ?? '';
                tr.appendChild(td);
            });

            frag.appendChild(tr);
        });

        // Append all at once
        this.dom.tbody.innerHTML = '';
        this.dom.tbody.appendChild(frag);

        // Update count
        if (this.dom.countEl) {
            this.dom.countEl.textContent = `Tìm thấy ${data.length} bản ghi`;
        }
    }
}
