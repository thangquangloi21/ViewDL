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
            const response = await fetch(`/api/search/${this.tableId}/data?limit=10000`);
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
            if (this.currentPage > 1) this.performSearch(this.currentPage - 1);
        });

        this.dom.nextBtn?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) this.performSearch(this.currentPage + 1);
        });

        this.dom.pageSizeSel?.addEventListener('change', () => {
            this.pageSizeMode = this.dom.pageSizeSel.value;
            this.pageSize = Number(this.pageSizeMode) || 100;
            this.performSearch(1);
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
                const val = row.querySelector('.tx-val')?.value?.trim();
                if (col && val) {
                    conditions.push({ column: col, operator: op || 'contains', value: val });
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
                body: JSON.stringify({ conditions, limit: 10000 }),
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

        this.dom.conditionsDiv.querySelectorAll('.tx-val').forEach(i => { i.value = ''; });
        this.dom.conditionsDiv.querySelectorAll('.tx-col').forEach(s => { s.value = ''; });

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
