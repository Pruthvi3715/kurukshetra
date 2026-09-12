# backend/app/db/__init__.py
# NagrikSewa AI — database package
# Exposes schema application and seed utilities.

from .db_schema import apply_schema
from .db_seed   import ALL_SEED_GROUPS, DEPARTMENTS, OFFICERS, SLA_POLICIES, PRIORITY_WEIGHTS, SOP_TEMPLATES

__all__ = [
    "apply_schema",
    "ALL_SEED_GROUPS",
    "DEPARTMENTS",
    "OFFICERS",
    "SLA_POLICIES",
    "PRIORITY_WEIGHTS",
    "SOP_TEMPLATES",
]
