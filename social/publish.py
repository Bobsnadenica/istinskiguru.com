"""Publish reviewed text from Codex, using AIPost247's private Facebook connection.

No generation or scheduler here. A durable reservation prevents duplicate writes
after a timeout or crash. Inspect Facebook before resolving an uncertain attempt.
"""
import argparse
import hashlib
import json
import os
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import requests
from dotenv import dotenv_values

ROOT = Path(os.environ.get("AIPOST_HOME", str(Path.home() / "Projects/autpost247/aipost247")))
PAGE_ID = "1249179151615395"
SOFIA = ZoneInfo("Europe/Sofia")


def connect():
    values = dotenv_values(ROOT / ".env")
    if values.get("FB_PAGE_ID") != PAGE_ID or not values.get("FB_PAGE_ACCESS_TOKEN"):
        raise ValueError("Connect the Istinskiguru.com Page in AIPost247 first.")
    session = requests.Session()
    session.headers["Authorization"] = "Bearer " + values["FB_PAGE_ACCESS_TOKEN"]
    return session, "https://graph.facebook.com/" + values.get("GRAPH_API_VERSION", "v25.0")


def ledger():
    os.umask(0o077)
    (ROOT / "data").mkdir(exist_ok=True)
    db = sqlite3.connect(ROOT / "data/istinskiguru-posts.sqlite", timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("CREATE TABLE IF NOT EXISTS posts (slot TEXT PRIMARY KEY, created TEXT, digest TEXT UNIQUE, message TEXT, link TEXT, status TEXT, post_id TEXT)")
    return db


def validate_draft(draft):
    message, link = draft.get("message", ""), draft.get("link", "")
    if not isinstance(message, str) or not 30 <= len(message.strip()) <= 1800:
        raise ValueError("Message must contain 30–1800 characters.")
    parsed = urlparse(link)
    if parsed.scheme != "https" or parsed.netloc != "www.istinskiguru.com" or parsed.query or parsed.fragment:
        raise ValueError("Use a direct HTTPS IstinskiGuru review or educational page link.")
    if not isinstance(draft.get("source_note"), str) or len(draft["source_note"].strip()) < 15:
        raise ValueError("Include a source_note explaining the factual basis of the draft.")
    return message.strip(), link


def publish(session, api, db, draft, slot):
    message, link = validate_draft(draft)
    now = datetime.now(SOFIA)
    manual = bool(re.fullmatch(r"manual-" + now.date().isoformat() + r"-[a-z0-9-]{3,60}", slot))
    if not manual and (not re.fullmatch(r"\d{4}-\d{2}-\d{2}-(09|14|19)", slot) or not slot.startswith(now.date().isoformat())):
        raise ValueError("Use today's Sofia slot YYYY-MM-DD-09, -14 or -19.")
    if not manual and abs(now.hour * 60 + now.minute - int(slot[-2:]) * 60) > 90:
        raise ValueError("Outside this slot's 90-minute window. Do not backfill missed posts.")
    digest = hashlib.sha256((message + "\n" + link).encode()).hexdigest()
    db.execute("BEGIN IMMEDIATE")
    if db.execute("SELECT 1 FROM posts WHERE status IN ('sending', 'uncertain')").fetchone():
        db.rollback()
        raise ValueError("Uncertain earlier write: inspect the Page before any further publishing.")
    try:
        db.execute("INSERT INTO posts VALUES (?, ?, ?, ?, ?, 'sending', NULL)", (slot, now.isoformat(), digest, message, link))
        db.commit()
    except sqlite3.IntegrityError:
        db.rollback()
        raise ValueError("This slot or exact post already has an attempt. No duplicate sent.")
    # Do not retry writes, including malformed successful responses.
    status, post_id = "uncertain", None
    try:
        response = session.post(api + "/" + PAGE_ID + "/feed", data={"message": message, "link": link}, timeout=30, allow_redirects=False)
        payload = response.json()
        if response.ok and re.fullmatch(r"[0-9]+_[0-9]+", str(payload.get("id", ""))):
            status, post_id = "published", payload["id"]
        elif 400 <= response.status_code < 500 and "error" in payload:
            status = "rejected"
    except (requests.RequestException, ValueError):
        pass
    db.execute("UPDATE posts SET status=?, post_id=? WHERE slot=?", (status, post_id, slot))
    db.commit()
    return {"status": status, "slot": slot, "post_id": post_id}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["status", "history", "check", "publish"])
    parser.add_argument("--file", type=Path)
    parser.add_argument("--slot")
    args = parser.parse_args()
    db = ledger()
    if args.command == "history":
        print(json.dumps([dict(row) for row in db.execute("SELECT * FROM posts ORDER BY created DESC LIMIT 40")], ensure_ascii=False))
        return
    if args.command in ("check", "publish"):
        if args.file is None:
            parser.error("--file is required")
        draft = json.loads(args.file.read_text())
        validate_draft(draft)
        if args.command == "check":
            print(json.dumps({"valid": True, "draft": draft}, ensure_ascii=False))
            return
    session, api = connect()
    response = session.get(api + "/" + PAGE_ID, params={"fields": "id,name"}, timeout=30, allow_redirects=False)
    if response.status_code != 200 or response.json().get("id") != PAGE_ID:
        raise ValueError("Facebook Page validation failed. Reconnect locally; no post sent.")
    if args.command == "status":
        print(json.dumps({"connected": True, "page": response.json(), "time": datetime.now(SOFIA).isoformat()}, ensure_ascii=False))
    else:
        result = publish(session, api, db, draft, args.slot or "")
        print(json.dumps(result))
        if result["status"] != "published":
            raise SystemExit(2)


if __name__ == "__main__":
    try:
        main()
    except (requests.RequestException, OSError, ValueError, sqlite3.Error) as error:
        # Never print network exception URLs or response bodies containing tokens.
        print(json.dumps({"error": str(error) if type(error) is ValueError else type(error).__name__}))
        raise SystemExit(1)
