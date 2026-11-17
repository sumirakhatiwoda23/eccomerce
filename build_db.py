#!/usr/bin/env python3
"""Build the ecommerce SQLite database from schema.sql + seed.sql."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

HERE = Path(__file__).resolve().parent


def build(db_path: Path, reset: bool = True) -> None:
    if reset and db_path.exists():
        db_path.unlink()

    schema = (HERE / "schema.sql").read_text()
    seed = (HERE / "seed.sql").read_text()

    con = sqlite3.connect(db_path)
    try:
        con.executescript(schema)
        con.executescript(seed)
        con.commit()

        problems = con.execute("PRAGMA foreign_key_check").fetchall()
        if problems:
            raise RuntimeError(f"foreign key violations: {problems}")

        print(f"Created {db_path}")
        for table in ("categories", "products", "customers", "orders",
                      "order_items", "payments", "reviews", "sessions"):
            count = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            print(f"  {table:<12} {count:>4} rows")
    finally:
        con.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(HERE / "ecommerce.db"),
                        help="output database file (default: ecommerce.db)")
    parser.add_argument("--keep", action="store_true",
                        help="do not delete an existing database first")
    args = parser.parse_args()
    build(Path(args.db), reset=not args.keep)
