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
    { value: 'equals',       label: 'equals'      },
    { value: 'not_equals',   label: 'not equals'  },
    { value: 'contains',     label: 'contains'    },
    { value: 'range',        label: 'range'       },
    { value: 'startswith',   label: 'starts at'   },
    { value: 'greater_than', label: 'greater than'},
    { value: 'less_than',    label: 'less than'   },
    { value: 'is_null',      label: 'is null'     },
    { value: 'is_not_null',  label: 'is not null' },
];

function shFormatDateToDDMMYYYY(dateObj) {
    const dd = String(dateObj.getUTCDate()).padStart(2, '0');
    const mm = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = dateObj.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function shFormatDisplayValue(value, columnName) {
    if (value === null || value === undefined) return '';

    const col = String(columnName || '').toLowerCase();
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return shFormatDateToDDMMYYYY(value);
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
            return shFormatDateToDDMMYYYY(parsed);
        }
    }

    return value;
}

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
        this.dateColumns = new Set();
        this.conditionCount = 0;
        this.allData = [];
        this.currentPage = 1;
        this.pageSize = 100;
        this.pageSizeMode = '100';
        this.totalRows = 0;
        this.totalPages = 0;
        this.lastConditions = [];
        this.hasLoadedDefaultData = false;
        
        // DOM element IDs (derived from tableId)
        this.ids = this._buildIds();
        this.dom = {};
    }

    _getEffectivePageSize(totalRows) {
        if (this.pageSizeMode === 'all') {
            return Math.max(totalRows || 0, 1);
        }
        return this.pageSize;
    }

    _populateOperators(selectEl, operators) {
        selectEl.innerHTML = '';
        operators.forEach(op => {
            const opt = document.createElement('option');
            opt.value = op.value;
            opt.textContent = op.label;
            selectEl.appendChild(opt);
        });
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
    async init() {
        // Get DOM elements by ID
        this.dom.conditionsDiv = document.getElementById(this.ids.conditions);
        this.dom.addConditionBtn = document.getElementById(this.ids.addConditionBtn);
        this.dom.searchBtn = document.getElementById(this.ids.searchBtn);
        this.dom.clearBtn = document.getElementById(this.ids.clearBtn);
        this.dom.exportBtn = null;
        this.dom.thead = document.getElementById(this.ids.tableHeaders);
        this.dom.tbody = document.getElementById(this.ids.tableBody);
        this.dom.countEl = document.getElementById(this.ids.countEl);

        this._ensurePaginationControls();

        await this._loadColumns();

        // Attach event listeners
        this.dom.addConditionBtn?.addEventListener('click', () => this.addCondition());
        this.dom.searchBtn?.addEventListener('click', () => this.performSearch());
        this.dom.clearBtn?.addEventListener('click', () => this.clearAll());
        this._ensureExportButton();

        // Start with one empty condition row
        if (this.conditionCount === 0) {
            this.addCondition();
        }

        // Initial message
        if (this.dom.countEl) {
            this.dom.countEl.textContent = 'Nhập điều kiện tìm kiếm và click "Tìm kiếm"';
        }
        this._updatePaginationUI();
    }

    async ensureDefaultDataLoaded() {
        if (this.hasLoadedDefaultData) return;
        this.hasLoadedDefaultData = true;
        await this.loadDefaultData(1);
    }

    async loadDefaultData(targetPage = 1) {
        targetPage = Number.isFinite(Number(targetPage)) && Number(targetPage) > 0
            ? Number(targetPage)
            : 1;

        if (this.dom.countEl) this.dom.countEl.textContent = 'Đang tải dữ liệu...';
        if (this.dom.tbody) this.dom.tbody.innerHTML = '';

        try {
            const response = await fetch(`/api/search/${this.tableId}/data?limit=500`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();
            const data = result.data || result;
            this.allData = Array.isArray(data) ? data : [];
            this.lastConditions = [];

            this.totalRows = this.allData.length;
            const effectivePageSize = this._getEffectivePageSize(this.totalRows);
            this.totalPages = this.totalRows > 0 ? Math.ceil(this.totalRows / effectivePageSize) : 0;
            this.currentPage = this.totalPages > 0 ? Math.min(targetPage, this.totalPages) : 1;

            const startIdx = this.totalRows > 0 ? (this.currentPage - 1) * effectivePageSize : 0;
            const pageData = this.allData.slice(startIdx, startIdx + effectivePageSize);

            this.displayData(pageData, startIdx);
            this._updatePaginationUI();
        } catch (err) {
            console.error(`Default data load error (${this.tableId}):`, err);
            if (this.dom.countEl) {
                this.dom.countEl.textContent = `Lỗi tải dữ liệu: ${err.message}`;
            }
            this.currentPage = 1;
            this.totalRows = 0;
            this.totalPages = 0;
            this._updatePaginationUI();
        }
    }

    async _loadColumns() {
        try {
            const response = await fetch(`/api/search/${this.tableId}/columns`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();
            const cols = Array.isArray(result?.columns) ? result.columns : [];
            if (cols.length > 0) {
                this.columns = cols;
            }
            // Store date columns for input type switching
            const dateCols = Array.isArray(result?.date_columns) ? result.date_columns : [];
            this.dateColumns = new Set(dateCols);
        } catch (err) {
            console.warn(`Cannot load columns for ${this.tableId}, fallback to defaults:`, err);
        }
    }

    _ensurePaginationControls() {
        if (!this.dom.countEl) return;

        const summary = this.dom.countEl.closest('.search-summary');
        if (!summary || !summary.parentElement) return;

        let pager = document.querySelector(`#${this.tableId.toLowerCase()}View .pagination-controls`) || 
                     summary.parentElement.querySelector('.pagination-controls');
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
            summary.parentElement.insertBefore(pager, summary.nextSibling);
        }

        this.dom.pager = pager;
        this.dom.prevBtn = pager.querySelector('.pager-prev');
        this.dom.nextBtn = pager.querySelector('.pager-next');
        this.dom.pageInfo = pager.querySelector('.pager-info');
        this.dom.pageSizeSel = pager.querySelector('.pager-size');

        this.dom.prevBtn?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                if (this.lastConditions.length > 0) {
                    this.performSearch(this.currentPage - 1);
                } else {
                    this.loadDefaultData(this.currentPage - 1);
                }
            }
        });

        this.dom.nextBtn?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                if (this.lastConditions.length > 0) {
                    this.performSearch(this.currentPage + 1);
                } else {
                    this.loadDefaultData(this.currentPage + 1);
                }
            }
        });

        this.dom.pageSizeSel?.addEventListener('change', () => {
            this.pageSizeMode = this.dom.pageSizeSel.value;
            this.pageSize = Number(this.pageSizeMode) || 100;
            if (this.lastConditions.length > 0) {
                this.performSearch(1);
            } else {
                this.loadDefaultData(1);
            }
        });
    }

    _getRenderableColumns(sampleRow) {
        const dataColumns = Object.keys(sampleRow || {});
        let columns = this.columns.length > 0
            ? this.columns.filter(col => dataColumns.includes(col))
            : dataColumns;

        if (columns.length === 0) {
            columns = dataColumns;
        }
        return columns;
    }

    _exportToExcel() {
        if (typeof XLSX === 'undefined') {
            alert('Thiếu thư viện xuất Excel (XLSX)');
            return;
        }

        if (!Array.isArray(this.allData) || this.allData.length === 0) {
            alert('Không có dữ liệu để xuất');
            return;
        }

        const columns = this._getRenderableColumns(this.allData[0]);
        if (columns.length === 0) {
            alert('Không xác định được cột để xuất');
            return;
        }

        const header = ['Index', ...columns];
        const rows = [header];

        this.allData.forEach((row, idx) => {
            const values = [idx + 1];
            columns.forEach(col => values.push(shFormatDisplayValue(row[col], col)));
            rows.push(values);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        const sheetName = this.tableId.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Data');
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        XLSX.writeFile(wb, `${this.tableId}-${stamp}.xlsx`);
    }

    _ensureExportButton() {
        const actions = this.dom.clearBtn?.parentElement;
        if (!actions) return;

        let btn = document.getElementById(`${this.tableId}ExportBtn`);
        if (!btn) {
            btn = document.createElement('button');
            btn.id = `${this.tableId}ExportBtn`;
            btn.type = 'button';
            btn.className = 'btn secondary';
            btn.textContent = 'Xuất Excel';
            actions.appendChild(btn);
        }

        this.dom.exportBtn = btn;
        this.dom.exportBtn.addEventListener('click', () => this._exportToExcel());
    }

    _updatePaginationUI() {
        if (!this.dom.pageInfo || !this.dom.prevBtn || !this.dom.nextBtn) return;

        const current = this.totalPages > 0 ? this.currentPage : 0;
        this.dom.pageInfo.textContent = `Trang ${current}/${this.totalPages}`;
        this.dom.prevBtn.disabled = this.currentPage <= 1;
        this.dom.nextBtn.disabled = this.currentPage >= this.totalPages || this.totalPages === 0;
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
        this._populateOperators(opSel, OPERATORS);

        // Value input
        const valInput = document.createElement('input');
        valInput.type = 'text';
        valInput.className = 'tx-val';
        valInput.placeholder = '';
        valInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Clear value button
        const clearValBtn = document.createElement('button');
        clearValBtn.type = 'button';
        clearValBtn.className = 'btn-icon btn-clear-val';
        clearValBtn.innerHTML = '✕';
        clearValBtn.setAttribute('aria-label', 'Xoá giá trị');
        clearValBtn.addEventListener('click', () => {
            valInput.value = '';
            valInput2.value = '';
            valInput.focus();
        });

        // Range separator (hidden by default, shown for range operator)
        const rangeSep = document.createElement('span');
        rangeSep.className = 'tx-range-sep hidden';
        rangeSep.textContent = '-';

        // Second value input (for range, hidden by default)
        const valInput2 = document.createElement('input');
        valInput2.type = 'text';
        valInput2.className = 'tx-val2 hidden';
        valInput2.placeholder = '';
        valInput2.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Operator change handler — toggle inputs based on operator
        const updateInputVisibility = () => {
            const op = opSel.value;
            const isNullOp = (op === 'is_null' || op === 'is_not_null');
            const isRange = (op === 'range');

            valInput.disabled = isNullOp;
            valInput2.disabled = isNullOp;
            clearValBtn.disabled = isNullOp;

            rangeSep.classList.toggle('hidden', !isRange);
            valInput2.classList.toggle('hidden', !isRange);

            if (isNullOp) {
                valInput.value = '';
                valInput2.value = '';
            }
            if (!isRange) {
                valInput2.value = '';
            }
        };

        opSel.addEventListener('change', updateInputVisibility);

        // Column change handler — update placeholder for date columns
        const self = this;
        colSel.addEventListener('change', () => {
            const selectedCol = colSel.value;
            const isDate = self.dateColumns.has(selectedCol);
            valInput.placeholder = isDate ? 'dd/mm/yyyy' : '';
            valInput2.placeholder = isDate ? 'dd/mm/yyyy' : '';
            valInput.value = '';
            valInput2.value = '';
        });

        // Add condition button (+)
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn-icon btn-add-row';
        addBtn.innerHTML = '+';
        addBtn.setAttribute('aria-label', 'Thêm điều kiện');
        addBtn.addEventListener('click', () => this.addCondition());

        // Remove condition button (✕)
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-icon btn-remove-row';
        removeBtn.innerHTML = '✕';
        removeBtn.setAttribute('aria-label', 'Xoá điều kiện');
        removeBtn.addEventListener('click', () => {
            row.remove();
            this._updateRemoveButtons();
        });

        row.append(colSel, opSel, valInput, clearValBtn, rangeSep, valInput2, addBtn, removeBtn);
        this.dom.conditionsDiv.appendChild(row);
        this._updateRemoveButtons();
    }

    /**
     * Enable/disable remove buttons based on row count
     */
    _updateRemoveButtons() {
        const rows = this.dom.conditionsDiv.querySelectorAll('.search-condition');
        const only = rows.length <= 1;
        rows.forEach(r => {
            const btn = r.querySelector('.btn-remove-row');
            if (btn) btn.disabled = only;
        });
    }

    /**
     * Perform server-side search
     */
    async performSearch(targetPage = 1) {
        if (!this.dom.conditionsDiv) return;

        targetPage = Number.isFinite(Number(targetPage)) && Number(targetPage) > 0
            ? Number(targetPage)
            : 1;

        // Build conditions array from DOM when a new search starts,
        // keep the previous conditions when only navigating pages.
        let conditions = this.lastConditions;
        if (targetPage === 1 || this.lastConditions.length === 0) {
            conditions = [];
            this.dom.conditionsDiv.querySelectorAll(`[id^="${this.tableId}-condition-"]`).forEach(row => {
                const col = row.querySelector('.tx-col')?.value?.trim();
                const op = row.querySelector('.tx-op')?.value?.trim();
                const val = row.querySelector('.tx-val')?.value?.trim() || '';
                const val2 = row.querySelector('.tx-val2')?.value?.trim() || '';

                if (!col) return;

                // is_null / is_not_null don't need a value
                if (op === 'is_null' || op === 'is_not_null') {
                    conditions.push({ column: col, operator: op, value: '', value2: '' });
                } else if (val) {
                    const cond = { column: col, operator: op || 'contains', value: val };
                    if (op === 'range' && val2) cond.value2 = val2;
                    conditions.push(cond);
                }
            });
            this.lastConditions = conditions;
        }

        // No conditions → clear table
        if (conditions.length === 0) {
            await this.loadDefaultData(1);
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
                body: JSON.stringify({ conditions, limit: 500 }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const result = await response.json();

            if (result.success || Array.isArray(result)) {
                // Get data from success response or array
                const data = result.data || result;
                this.allData = Array.isArray(data) ? data : [];
                
                // Client-side pagination
                this.totalRows = this.allData.length;
                const effectivePageSize = this._getEffectivePageSize(this.totalRows);
                this.totalPages = this.totalRows > 0 ? Math.ceil(this.totalRows / effectivePageSize) : 0;
                this.currentPage = this.totalPages > 0 ? Math.min(targetPage, this.totalPages) : 1;
                
                const startIdx = this.totalRows > 0 ? (this.currentPage - 1) * effectivePageSize : 0;
                const pageData = this.allData.slice(startIdx, startIdx + effectivePageSize);
                
                this.displayData(pageData, startIdx);
                this._updatePaginationUI();
            } else {
                if (this.dom.countEl) {
                    this.dom.countEl.textContent = `Lỗi: ${result.error}`;
                }
                this.currentPage = 1;
                this.totalRows = 0;
                this.totalPages = 0;
                this._updatePaginationUI();
            }
        } catch (err) {
            console.error(`Search error (${this.tableId}):`, err);
            if (this.dom.countEl) {
                this.dom.countEl.textContent = `Lỗi kết nối: ${err.message}`;
            }
            this.currentPage = 1;
            this.totalRows = 0;
            this.totalPages = 0;
            this._updatePaginationUI();
        }
    }

    /**
     * Clear all conditions and results
     */
    clearAll() {
        if (!this.dom.conditionsDiv) return;

        this.dom.conditionsDiv.querySelectorAll('.tx-val').forEach(i => { i.value = ''; i.disabled = false; });
        this.dom.conditionsDiv.querySelectorAll('.tx-val2').forEach(i => { i.value = ''; i.disabled = false; i.classList.add('hidden'); });
        this.dom.conditionsDiv.querySelectorAll('.tx-range-sep').forEach(s => { s.classList.add('hidden'); });
        this.dom.conditionsDiv.querySelectorAll('.tx-col').forEach(s => { s.value = ''; });
        this.dom.conditionsDiv.querySelectorAll('.tx-op').forEach(s => { s.selectedIndex = 0; });

        this.lastConditions = [];
        this.loadDefaultData(1);
    }

    /**
     * Render results into the table
     */
    displayData(data, startIndex = 0) {
        if (!Array.isArray(data) || !this.dom.tbody) return;

        // Prefer DB metadata column order (this.columns) to keep search + display consistent
        const dataColumns = data.length > 0 ? Object.keys(data[0]) : [];
        let columns = data.length > 0 ? this._getRenderableColumns(data[0]) : [];

        if (columns.length === 0) {
            columns = dataColumns;
        }

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
            tdIndex.textContent = startIndex + idx + 1;
            tr.appendChild(tdIndex);

            // Data columns
            columns.forEach(col => {
                const td = document.createElement('td');
                td.textContent = shFormatDisplayValue(row[col], col);
                tr.appendChild(td);
            });

            frag.appendChild(tr);
        });

        // Append all at once
        this.dom.tbody.innerHTML = '';
        this.dom.tbody.appendChild(frag);

        // Update count
        if (this.dom.countEl) {
            if (this.totalRows > 0) {
                this.dom.countEl.textContent = `Tìm thấy ${this.totalRows} bản ghi`;
            } else {
                this.dom.countEl.textContent = 'Không tìm thấy kết quả';
            }
        }
    }
}

function ensureSearchViewLoaded(tableId) {
    const handler = searchInstances[tableId];
    if (handler) {
        handler.ensureDefaultDataLoaded();
    }
}

window.ensureSearchViewLoaded = ensureSearchViewLoaded;
