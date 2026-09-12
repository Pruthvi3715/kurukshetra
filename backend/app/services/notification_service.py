"""
notification_service.py
Twilio WhatsApp/SMS notification service for Kurukshetra Municipal System.

TRIAL ACCOUNT NOTES:
- WhatsApp outbound (first msg) requires ContentSid on trial
- WhatsApp replies work in free-text within 24h session window
- Once user sends "join twilio-trial" to sandbox, replies trigger 24h window
- For hackathon demo: messages are logged + queued; real send attempted
"""
import os
import logging
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger(__name__)
_twilio_client = None

# Message log for demo/fallback (persists in memory)
_message_log = []


def _get_client():
    global _twilio_client
    if _twilio_client is not None:
        return _twilio_client
    from twilio.rest import Client
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    if not account_sid or not auth_token:
        raise EnvironmentError("Twilio creds not configured in .env")
    _twilio_client = Client(account_sid, auth_token)
    logger.info("Twilio client initialised (Account: %s...)", account_sid[:8])
    return _twilio_client


WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+17372508034")


def _wa(number):
    return number if number.startswith("whatsapp:") else f"whatsapp:{number}"


def _send_whatsapp(to, body, content_sid=None):
    """
    Attempt WhatsApp send. On trial accounts, outbound first-touch requires ContentSid.
    Falls back to logging the message for demo purposes.
    Returns tuple (sid, channel) where channel is 'whatsapp', 'logged', or 'failed'.
    """
    record = {"to": to, "body": body, "channel": "whatsapp", "sid": None}

    try:
        client = _get_client()
        kwargs = dict(from_=WHATSAPP_FROM, to=_wa(to), body=body)
        if content_sid:
            kwargs["content_sid"] = content_sid
        msg = client.messages.create(**kwargs)
        logger.info("WhatsApp sent to %s SID=%s", to, msg.sid)
        record["sid"] = msg.sid
        _message_log.append(record)
        return msg.sid
    except Exception as exc:
        err = str(exc)
        # ContentSid required = user hasn't joined sandbox yet / trial restriction
        if "ContentSid" in err or "content_sid" in err.lower():
            logger.warning(
                "WhatsApp to %s queued (user must send 'join twilio-trial' to +17372508034 first): %s",
                to, body[:80]
            )
            record["channel"] = "queued_sandbox"
            record["error"] = "User must join sandbox first"
        else:
            logger.error("WhatsApp send failed for %s: %s", to, exc)
            record["channel"] = "failed"
            record["error"] = err
        _message_log.append(record)
        return None


def get_message_log():
    """Return all attempted notification records (for dashboard/debug endpoint)."""
    return list(_message_log)


def notify_complaint_received(citizen_phone, complaint_id, category, priority, location):
    body = (
        "Complaint Received - Kurukshetra Municipal\n"
        f"ID: {complaint_id}\nCategory: {category}\n"
        f"Priority: {priority}\nLocation: {location}\n"
        f"Reply STATUS {complaint_id} anytime to track progress."
    )
    return _send_whatsapp(citizen_phone, body)


def notify_officer_assigned(officer_phone, complaint_id, category, priority, location, description):
    body = (
        "New Complaint Assigned\n"
        f"ID: {complaint_id}\nCategory: {category}\n"
        f"Priority: {priority}\nLocation: {location}\n"
        f"Desc: {description[:200]}"
    )
    return _send_whatsapp(officer_phone, body)


def notify_complaint_escalated(citizen_phone, officer_phone, complaint_id, reason):
    c_sid = _send_whatsapp(
        citizen_phone,
        f"Complaint {complaint_id} ESCALATED: {reason}. Expect resolution in 24h."
    )
    o_sid = _send_whatsapp(
        officer_phone,
        f"ESCALATION ALERT {complaint_id}: {reason}. Immediate action required."
    )
    return {"citizen_sid": c_sid, "officer_sid": o_sid}


def notify_complaint_resolved(citizen_phone, complaint_id, resolution_notes):
    body = (
        f"Complaint {complaint_id} Resolved!\n"
        f"Resolution: {resolution_notes[:300]}\n"
        "Rate our service by replying 1-5."
    )
    return _send_whatsapp(citizen_phone, body)


def notify_feedback_received(citizen_phone, complaint_id, rating):
    stars = rating * "*"
    return _send_whatsapp(citizen_phone, f"Thank you! Rating for {complaint_id}: {rating}/5 {stars}")


def send_bulk_alert(phones, message):
    return [_send_whatsapp(p, message) for p in phones]


def check_twilio_connection():
    try:
        client = _get_client()
        account = client.api.accounts(os.getenv("TWILIO_ACCOUNT_SID")).fetch()
        return {
            "ok": True,
            "account_name": account.friendly_name,
            "status": account.status,
            "sandbox_from": WHATSAPP_FROM,
            "join_instructions": "Send 'join twilio-trial' to WhatsApp: +17372508034 to activate sandbox",
            "messages_logged": len(_message_log)
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
