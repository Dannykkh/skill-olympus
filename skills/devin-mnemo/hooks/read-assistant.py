#!/usr/bin/env python3
"""Read only the final assistant text for one Devin CLI session from its local DB."""

import argparse
import json
import os
from pathlib import Path
import sqlite3


def default_db():
    if os.name == "nt":
        return Path(os.environ["APPDATA"]) / "devin" / "cli" / "sessions.db"
    data_home = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    for candidate in (data_home / "devin" / "cli" / "sessions.db", Path.home() / ".config" / "devin" / "cli" / "sessions.db"):
        if candidate.is_file():
            return candidate
    return data_home / "devin" / "cli" / "sessions.db"


def read_message(db_path, session_id, after_row, since):
    if not db_path.is_file():
        return None
    with sqlite3.connect(db_path.as_uri() + "?mode=ro", uri=True, timeout=1) as db:
        # Baseline is sampled when UserPromptSubmit fires. A later Stop may only
        # save rows created for this turn; never replay a previous assistant turn.
        rows = db.execute(
            "SELECT row_id, chat_message, created_at FROM message_nodes "
            "WHERE session_id = ? AND row_id > ? ORDER BY row_id DESC LIMIT 100",
            (session_id, after_row),
        )
        for row_id, raw, created_at in rows:
            if created_at < since - 2:
                continue
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if message.get("role") != "assistant":
                continue
            content = message.get("content")
            if isinstance(content, str) and content.strip():
                return {"row_id": row_id, "message_id": message.get("message_id"), "content": content}
    return None


def baseline(db_path, session_id):
    if not db_path.is_file():
        return 0
    with sqlite3.connect(db_path.as_uri() + "?mode=ro", uri=True, timeout=1) as db:
        return db.execute("SELECT COALESCE(MAX(row_id), 0) FROM message_nodes WHERE session_id = ?", (session_id,)).fetchone()[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("baseline", "assistant"))
    parser.add_argument("session_id")
    parser.add_argument("--after-row", type=int, default=0)
    parser.add_argument("--since", type=int, default=0)
    parser.add_argument("--db", type=Path, default=default_db())
    args = parser.parse_args()
    result = baseline(args.db, args.session_id) if args.mode == "baseline" else read_message(args.db, args.session_id, args.after_row, args.since)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
