"""
telegram_service.py
Telegram Bot integration for PMC NagrikSewa (Kurukshetra) Multi-Agent Grievance System.
Zero-cost, instant messaging for citizen grievance submission, status checks, and SLA escalation alerts.
"""

import os
import logging
import urllib.request
import urllib.parse
import json
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8945951584:AAG8lq56n1knLDLtvoNklPC0Ap-PqPDdHz8")
API_BASE = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"

# In-memory registry of active chat IDs for broadcasting demo alerts
_active_chat_ids = set()
_telegram_event_log = []


def register_chat_id(chat_id: int | str):
    """Keep track of chat IDs that have interacted with the bot."""
    _active_chat_ids.add(str(chat_id))


def get_active_chat_ids() -> List[str]:
    return list(_active_chat_ids)


def send_telegram_message(
    chat_id: int | str,
    text: str,
    parse_mode: str = "HTML",
    reply_markup: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """Send text message to a Telegram user or group."""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not configured.")
        return None

    register_chat_id(chat_id)
    url = f"{API_BASE}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            _telegram_event_log.append({
                "action": "send_message",
                "chat_id": str(chat_id),
                "ok": result.get("ok", False),
                "preview": text[:80]
            })
            return result
    except Exception as e:
        logger.error("Failed to send Telegram message to %s: %s", chat_id, e)
        _telegram_event_log.append({
            "action": "send_message_failed",
            "chat_id": str(chat_id),
            "error": str(e),
            "preview": text[:80]
        })
        return None


def broadcast_telegram_alert(text: str) -> int:
    """Broadcast an alert (e.g. Ward Escalation) to all connected demo Telegram users."""
    sent_count = 0
    for cid in list(_active_chat_ids):
        if send_telegram_message(cid, text):
            sent_count += 1
    return sent_count


def notify_complaint_received_tg(chat_id: int | str, complaint_id: str, category: str, priority: str, location: str):
    msg = (
        "🏛️ <b>PMC NagrikSewa — Grievance Registered</b>\n\n"
        f"🆔 <b>Ticket ID:</b> <code>{complaint_id}</code>\n"
        f"📂 <b>Category:</b> {category}\n"
        f"⚡ <b>Priority:</b> <b>{priority}</b>\n"
        f"📍 <b>Location:</b> {location}\n\n"
        f"Our AI Dispatcher has assigned the ward crew. Track anytime with:\n"
        f"<code>/status {complaint_id}</code>"
    )
    return send_telegram_message(chat_id, msg)


def notify_officer_assigned_tg(chat_id: int | str, complaint_id: str, category: str, priority: str, location: str, officer_name: str, officer_phone: str):
    msg = (
        "👷 <b>PMC Field Crew Assigned</b>\n\n"
        f"🆔 <b>Ticket:</b> <code>{complaint_id}</code>\n"
        f"👤 <b>Officer:</b> {officer_name} ({officer_phone})\n"
        f"📍 <b>Location:</b> {location}\n\n"
        "Officer has been dispatched with standard SOP checklist."
    )
    return send_telegram_message(chat_id, msg)


def notify_complaint_escalated_tg(chat_id: int | str, complaint_id: str, reason: str, tier: str = "Tier 2"):
    msg = (
        "🚨 <b>ESCALATION ALERT — PMC SLA BREACH</b>\n\n"
        f"🆔 <b>Ticket ID:</b> <code>{complaint_id}</code>\n"
        f"⚠️ <b>Escalation Level:</b> <b>{tier}</b>\n"
        f"📋 <b>Reason:</b> {reason}\n\n"
        "Incident has been automatically elevated to the Zonal Ward Commissioner under Maharashtra RTS Act."
    )
    return send_telegram_message(chat_id, msg)


def notify_complaint_resolved_tg(chat_id: int | str, complaint_id: str, resolution_notes: str):
    msg = (
        "✅ <b>PMC Grievance Resolved!</b>\n\n"
        f"🆔 <b>Ticket ID:</b> <code>{complaint_id}</code>\n"
        f"📝 <b>Work Done:</b> {resolution_notes}\n\n"
        "Please rate our resolution quality by replying with a number from <b>1</b> (Poor) to <b>5</b> (Excellent)."
    )
    return send_telegram_message(chat_id, msg)


def get_telegram_logs() -> List[Dict[str, Any]]:
    return list(_telegram_event_log)
