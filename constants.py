"""
Application-wide constants: shared data, enumerations, and allowed values.
"""
from enum import Enum


# ---------------------------------------------------------------------------
# Database table reference
# ---------------------------------------------------------------------------
TRANSACTION_TABLE = "[Data_qad].[dbo].[Transaction History Browse (NRI)]"

# ---------------------------------------------------------------------------
# Security: column whitelist for dynamic search queries
# Only columns in this set are allowed to prevent SQL injection via column names
# ---------------------------------------------------------------------------
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

ALLOWED_OPERATORS = frozenset(['contains', 'equals', 'startswith'])


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
