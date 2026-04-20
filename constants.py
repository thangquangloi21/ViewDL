"""
Application-wide constants: shared data, enumerations, and allowed values.
"""
from enum import Enum


# ---------------------------------------------------------------------------
# Database table references & search configuration
# Each view has its own table definition with allowed search columns
# ---------------------------------------------------------------------------

ALLOWED_OPERATORS = frozenset([
    'equals', 'not_equals', 'contains', 'range',
    'startswith', 'greater_than', 'less_than',
    'is_null', 'is_not_null',
])

# Primary table (backward compatibility)
TRANSACTION_TABLE = "[Data_qad].[dbo].[Transaction History Browse (NRI)]"

# Multi-table search configuration (for generic search handler)
# table_id → { table_name, display_label, allowed_columns, view_id }
SEARCH_TABLES = {
    'transaction': {
        'table_name': '[Data_qad].[dbo].[Transaction History Browse (NRI)]',
        'label': 'Transaction History Browse (NRI)',
        'view_id': 'transactionView',
        'allowed_columns': None,
    },
    'workorder': {
        'table_name': '[Data_qad].[dbo].[Work Order Browse (NRI)]',
        'label': 'Work Order Browse (NRI)',
        'view_id': 'workorderView',
        'allowed_columns': None,
    },
    'workorderbill': {
        'table_name': '[Data_qad].[dbo].[Work Order Bill Browse]',
        'label': 'Work Order Bill Browse',
        'view_id': 'workorderbillView',
        'allowed_columns': None,
    },
    'unconfirmedposhipper': {
        'table_name': '[Data_qad].[dbo].[Unconfirmed PO Shipper Browse (NRI)]',
        'label': 'Unconfirmed PO Shipper Browse (NRI)',
        'view_id': 'unconfirmedposhipperView',
        'allowed_columns': None,
    },
    'salesorder': {
        'table_name': '[Data_qad].[dbo].[Sales Order Browse (NRI)]',
        'label': 'Sales Order Browse (NRI)',
        'view_id': 'salesorderView',
        'allowed_columns': None,
    },
    'qualityorderresult': {
        'table_name': '[Data_qad].[dbo].[Quality Order Result Browse(NRI)]',
        'label': 'Quality Order Result Browse(NRI)',
        'view_id': 'qualityorderresultView',
        'allowed_columns': None,
    },
    'qualitymodification': {
        'table_name': '[Data_qad].[dbo].[Quality Order Modification Browse(NRI)]',
        'label': 'Quality Order Modification Browse(NRI)',
        'view_id': 'qualitymodificationView',
        'allowed_columns': None,
    },
    'purchasereceipt': {
        'table_name': '[Data_qad].[dbo].[Purchase Receipt Browse (NRI)]',
        'label': 'Purchase Receipt Browse (NRI)',
        'view_id': 'purchasereceiptView',
        'allowed_columns': None,
    },
    'purchaseorder': {
        'table_name': '[Data_qad].[dbo].[Purchase Order Browse (NRI)]',
        'label': 'Purchase Order Browse (NRI)',
        'view_id': 'purchaseorderView',
        'allowed_columns': None,
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
