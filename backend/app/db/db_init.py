"""
db_init.py — NagrikSewa AI (PS17)
One-shot migration + seed script.

Usage:
    python -m backend.app.db.db_init            # uses default DB path
    python -m backend.app.db.db_init --db /path/to/custom.db
    python -m backend.app.db.db_init --reset    # drops and recreates (DESTRUCTIVE — dev only)

What it does:
  1. Resolves the DB file path (env var DATABASE_PATH or default data/kurkshetra.db)
  2. Applies db_schema.apply_schema() — idempotent, safe on existing DB
  3. Seeds all reference tables from db_seed.ALL_SEED_GROUPS — INSERT OR IGNORE
  4. Prints a verification table of row counts for every table
  5. Exits 0 on success, 1 on any error
"""

import argparse
import os
import sqlite3
import sys
from pathlib import Path
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------

def resolve_db_path(override: str | None = None) -> Path:
    if override:
        return Path(override).resolve()
    env = os.getenv("DATABASE_PATH")
    if env:
        return Path(env).resolve()
    # Default: backend/app/data/kurkshetra.db
    here = Path(__file__).resolve().parent          # backend/app/db/
    default = here.parent / "data" / "kurkshetra.db"
    default.parent.mkdir(parents=True, exist_ok=True)
    return default


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_conn(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    return conn


def _drop_all_tables(conn: sqlite3.Connection) -> None:
    """Drops all application tables (--reset mode only)."""
    tables_to_drop = [
        # drop in reverse dependency order
        "capex_proposals", "closure_verifications", "officer_accounts",
        "media_assets", "sop_templates", "feedback_polls",
        "notification_log", "audit_logs", "escalations",
        "complaint_subscribers", "complaints", "citizens",
        "priority_weights", "sla_policies", "officers", "departments",
    ]
    conn.execute("PRAGMA foreign_keys = OFF")
    for t in tables_to_drop:
        conn.execute(f"DROP TABLE IF EXISTS {t}")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.commit()
    print("  [reset] all tables dropped.")


# ---------------------------------------------------------------------------
# Seed insertion
# ---------------------------------------------------------------------------

def _seed_table(conn: sqlite3.Connection, table: str, pk_col: str, rows: list[dict]) -> int:
    """
    Inserts rows into table using INSERT OR IGNORE (idempotent).
    Returns number of rows actually inserted.
    """
    if not rows:
        return 0

    # Sanitise None values for JSON columns  
    inserted = 0
    cursor = conn.cursor()
    for row in rows:
        cols   = list(row.keys())
        ph     = ", ".join(["?"] * len(cols))
        col_str = ", ".join(cols)
        vals   = [row[c] for c in cols]
        try:
            cursor.execute(
                f"INSERT OR IGNORE INTO {table} ({col_str}) VALUES ({ph})",
                vals,
            )
            if cursor.rowcount > 0:
                inserted += 1
        except sqlite3.Error as exc:
            print(f"  [WARN] {table}: failed to insert {row.get(pk_col,'?')}: {exc}")

    conn.commit()
    return inserted


# ---------------------------------------------------------------------------
# Verification report
# ---------------------------------------------------------------------------

_ALL_TABLES = [
    "departments", "officers", "sla_policies", "priority_weights",
    "citizens", "complaints", "complaint_subscribers",
    "escalations", "audit_logs", "notification_log",
    "feedback_polls", "sop_templates", "media_assets",
    "officer_accounts", "closure_verifications", "capex_proposals",
]

# Minimum expected rows after seeding (reference tables only)
_MIN_EXPECTED: dict[str, int] = {
    "departments":      5,
    "officers":         0,   # dynamic — just check > 0 below
    "sla_policies":     10,
    "priority_weights": 5,
    "sop_templates":    5,
    "officer_accounts": 0,   # dynamic
}


def _verify(conn: sqlite3.Connection) -> bool:
    print("\n" + "─" * 56)
    print(f"  {'TABLE':<30} {'ROWS':>8}  STATUS")
    print("─" * 56)

    ok = True
    for t in _ALL_TABLES:
        try:
            cur = conn.execute(f"SELECT COUNT(*) AS cnt FROM {t}")
            cnt = cur.fetchone()["cnt"]
        except sqlite3.OperationalError:
            print(f"  {t:<30} {'MISSING':>8}  ✗")
            ok = False
            continue

        min_exp = _MIN_EXPECTED.get(t, 0)
        if t in ("officers", "officer_accounts"):
            # expect at least 25 officers (5 wards × 5 depts + tier2 + tier3 + tier4)
            min_exp = 25

        if min_exp > 0 and cnt < min_exp:
            status = f"✗ (want ≥{min_exp})"
            ok = False
        else:
            status = "✓"
        print(f"  {t:<30} {cnt:>8}  {status}")

    print("─" * 56)
    return ok


# ---------------------------------------------------------------------------
# Main entrypoint
# ---------------------------------------------------------------------------

def run(db_path: Path, reset: bool = False) -> bool:
    print(f"\n{'='*56}")
    print(f"  NagrikSewa AI — Database Init")
    print(f"  Path : {db_path}")
    print(f"  Time : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"{'='*56}\n")

    conn = _get_conn(db_path)

    # ── Step 0: Optional reset ───────────────────────────────────────────
    if reset:
        print("  [step 0] RESET MODE — dropping all tables …")
        _drop_all_tables(conn)

    # ── Step 1: Apply schema ─────────────────────────────────────────────
    print("  [step 1] Applying schema …")
    try:
        from backend.app.db.db_schema import apply_schema
    except ModuleNotFoundError:
        # Allow running as a script from repo root too
        sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
        from backend.app.db.db_schema import apply_schema

    apply_schema(conn)
    print("          Schema applied (all tables + indices).")

    # ── Step 2: Seed reference data ──────────────────────────────────────
    print("  [step 2] Seeding reference data …")
    try:
        from backend.app.db.db_seed import ALL_SEED_GROUPS
    except ModuleNotFoundError:
        from backend.app.db.db_seed import ALL_SEED_GROUPS  # type: ignore

    total_inserted = 0
    for table, pk_col, rows in ALL_SEED_GROUPS:
        n = _seed_table(conn, table, pk_col, rows)
        total_inserted += n
        print(f"          {table:<30} +{n} row(s) inserted (of {len(rows)} attempted)")

    print(f"\n          Total new rows inserted: {total_inserted}")

    # ── Step 3: Verify ───────────────────────────────────────────────────
    print("\n  [step 3] Verification …")
    success = _verify(conn)

    conn.close()

    if success:
        print("\n  ✅  Database initialised successfully.\n")
    else:
        print("\n  ❌  One or more tables have fewer rows than expected. Check warnings above.\n")

    return success


def main() -> None:
    parser = argparse.ArgumentParser(description="NagrikSewa AI — DB init & migration")
    parser.add_argument("--db",    type=str,  default=None,  help="Path to SQLite database file")
    parser.add_argument("--reset", action="store_true",      help="Drop all tables before recreating (dev only!)")
    args = parser.parse_args()

    db_path = resolve_db_path(args.db)
    success = run(db_path, reset=args.reset)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
