"""
Application-wide constants: shared data, enumerations, and allowed values.
"""
from enum import Enum


# ---------------------------------------------------------------------------
# Database table references & search configuration
# Each view has its own table definition with allowed search columns
# ---------------------------------------------------------------------------

ALLOWED_OPERATORS = frozenset(['contains', 'equals', 'startswith'])

# Primary table (backward compatibility)
TRANSACTION_TABLE = "[Data_qad].[dbo].[Transaction History Browse (NRI)]"
TRANSACTION_ALLOWED_COLUMNS = frozenset([
    'pt_part_type', 'pt_prod_line', 'pt_um',
    'tr_curr',      'tr_date',      'tr_effdate',
    'tr_ex_rate',   'tr_ex_rate2',  'tr_line',
    'tr_loc',       'tr_lot',       'tr_nbr',
    'tr_part',      'tr_price',     'tr_program',
    'tr_qty_loc',   'tr_qty_req',   'tr_rmks',
    'tr_serial',    'tr_site',      'tr_status',
    'tr_time',      'tr_trnbr',     'tr_type',
    'tr_userid',
])

# Multi-table search configuration (for generic search handler)
# table_id → { table_name, display_label, allowed_columns, view_id }
SEARCH_TABLES = {
    'transaction': {
        'table_name': '[Data_qad].[dbo].[Transaction History Browse (NRI)]',
        'label': 'Transaction History Browse (NRI)',
        'view_id': 'transactionView',
        'allowed_columns': TRANSACTION_ALLOWED_COLUMNS,
    },
    'workorder': {
        'table_name': '[Data_qad].[dbo].[Work Order]',
        'label': 'Work Order',
        'view_id': 'workorderView',
        'allowed_columns': frozenset([
            'wo_number', 'wo_status', 'wo_date', 'wo_part', 'wo_qty',
            'wo_custpo', 'wo_duedt', 'wo_rmks', 'wo_type', 'wo_site',
        ]),
    },
    'workorderbill': {
        'table_name': '[Data_qad].[dbo].[Work Order Bill]',
        'label': 'Work Order Bill',
        'view_id': 'workorderbillView',
        'allowed_columns': frozenset([
            'wo_number', 'wo_bill_seq', 'wo_date', 'wo_amount', 'wo_status',
            'wo_rmks', 'wo_site', 'wo_userid', 'wo_quantity',
        ]),
    },
    'unconfirmedposhipper': {
        'table_name': '[Data_qad].[dbo].[Unconfirmed PO Shipper]',
        'label': 'Unconfirmed PO Shipper',
        'view_id': 'unconfirmedposhipperView',
        'allowed_columns': frozenset([
            'po_number', 'po_line', 'po_status', 'po_date', 'po_part',
            'po_qty', 'po_ship_date', 'po_amount', 'po_rmks', 'po_site',
        ]),
    },
    'salesorder': {
        'table_name': '[Data_qad].[dbo].[Sales Order]',
        'label': 'Sales Order',
        'view_id': 'salesorderView',
        'allowed_columns': frozenset([
            'so_number', 'so_line', 'so_status', 'so_date', 'so_part',
            'so_qty', 'so_ship_date', 'so_price', 'so_custpo', 'so_rmks',
        ]),
    },
    'qualityorderresult': {
        'table_name': '[Data_qad].[dbo].[Quality Order Result]',
        'label': 'Quality Order Result',
        'view_id': 'qualityorderresultView',
        'allowed_columns': frozenset([
            'qo_number', 'qo_part', 'qo_status', 'qo_date', 'qo_result',
            'qo_qty_tested', 'qo_qty_passed', 'qo_rmks', 'qo_site',
        ]),
    },
    'qualitymodification': {
        'table_name': '[Data_qad].[dbo].[Quality Modification]',
        'label': 'Quality Modification',
        'view_id': 'qualitymodificationView',
        'allowed_columns': frozenset([
            'qm_number', 'qm_part', 'qm_status', 'qm_date', 'qm_reason',
            'qm_action', 'qm_qty', 'qm_rmks', 'qm_site', 'qm_userid',
        ]),
    },
    'purchasereceipt': {
        'table_name': '[Data_qad].[dbo].[Purchase Receipt]',
        'label': 'Purchase Receipt',
        'view_id': 'purchasereceiptView',
        'allowed_columns': frozenset([
            'pr_number', 'pr_line', 'pr_date', 'pr_part', 'pr_qty_recv',
            'pr_qty_accept', 'pr_po_number', 'pr_status', 'pr_rmks', 'pr_site',
        ]),
    },
    'purchaseorder': {
        'table_name': '[Data_qad].[dbo].[Purchase Order]',
        'label': 'Purchase Order',
        'view_id': 'purchaseorderView',
        'allowed_columns': frozenset([
            'po_number', 'po_line', 'po_status', 'po_date', 'po_part',
            'po_qty', 'po_price', 'po_vendor', 'po_duedt', 'po_rmks',
        ]),
    },
}


# ---------------------------------------------------------------------------
# Status enumeration
# ---------------------------------------------------------------------------
class Status(Enum):
    ACTIVE    = "active"
    INACTIVE  = "inactive"
    PENDING   = "pending"
    COMPLETED = "completed"


# ---------------------------------------------------------------------------
# Sample / demo data for dashboard
# ---------------------------------------------------------------------------
SAMPLE_DATA = [
    {"id": 1,  "name": "Nội dung 1",  "status": Status.ACTIVE.value,   "description": "Mô tả chi tiết về nội dung 1"},
    {"id": 2,  "name": "Nội dung 2",  "status": Status.INACTIVE.value, "description": "Mô tả chi tiết về nội dung 2"},
    {"id": 3,  "name": "Nội dung 3",  "status": Status.ACTIVE.value,   "description": "Mô tả chi tiết về nội dung 3"},
    {"id": 4,  "name": "Nội dung 4",  "status": Status.ACTIVE.value,   "description": "Mô tả chi tiết về nội dung 4"},
    {"id": 5,  "name": "Nội dung 5",  "status": Status.INACTIVE.value, "description": "Mô tả chi tiết về nội dung 5"},
    {"id": 6,  "name": "Nội dung 6",  "status": Status.ACTIVE.value,   "description": "Mô tả chi tiết về nội dung 6"},
    {"id": 7,  "name": "Nội dung 7",  "status": Status.INACTIVE.value, "description": "Mô tả chi tiết về nội dung 7"},
    {"id": 8,  "name": "Nội dung 8",  "status": Status.ACTIVE.value,   "description": "Mô tả chi tiết về nội dung 8"},
    {"id": 9,  "name": "Nội dung 9",  "status": Status.ACTIVE.value,   "description": "Mô tả chi tiết về nội dung 9"},
    {"id": 10, "name": "Nội dung 10", "status": Status.INACTIVE.value, "description": "Mô tả chi tiết về nội dung 10"},
]
