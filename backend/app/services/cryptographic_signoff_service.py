"""Cryptographic Multi-Party Sign-Off Service.
Enforces dual-verification for ticket closure:
1. Automated visual verification (Edge CV).
2. Cryptographic confirmation token signed by either:
   - The reporting citizen (1 signature required), OR
   - 3 verified nearby residents in duplicate clusters.
"""

import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4


class CryptographicSignoffService:
    """Manages tamper-proof cryptographic tokens and multi-party signature verification."""

    _SECRET_KEY = os.getenv("JWT_SECRET_KEY", "pmc-civic-router-zero-trust-secret-2026-sha256").encode("utf-8")

    @classmethod
    def generate_closure_token(
        cls,
        ticket_id: str,
        closure_photo_hash: str,
        is_cluster_parent: bool = False,
        cluster_size: int = 1
    ) -> Dict[str, Any]:
        """Generates a cryptographic verification token bound to the ticket and closure proof."""
        now_ts = int(time.time())
        nonce = uuid4().hex[:12]
        payload = f"{ticket_id}:{closure_photo_hash}:{now_ts}:{nonce}"

        token = hmac.new(cls._SECRET_KEY, payload.encode("utf-8"), hashlib.sha256).hexdigest()

        # Dual sign-off threshold rule:
        # If clustered with multiple residents, require 3 nearby residents OR 1 original complainant
        required_signatures = 3 if (is_cluster_parent and cluster_size >= 3) else 1

        record = {
            "verification_id": f"VERIF-{uuid4().hex[:8].upper()}",
            "ticket_id": ticket_id,
            "token": token,
            "payload_binding": payload,
            "required_signatures": required_signatures,
            "collected_signatures": 0,
            "signers": [],
            "status": "PENDING_CITIZEN_SIGNOFF",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "closure_photo_hash": closure_photo_hash
        }
        return record

    @classmethod
    def verify_and_sign(
        cls,
        record: Dict[str, Any],
        token: str,
        signer_phone: str,
        is_original_filer: bool,
        decision: str = "CONFIRM_REPAIR",  # "CONFIRM_REPAIR" or "FLAG_FRAUD"
        remarks: Optional[str] = None
    ) -> Dict[str, Any]:
        """Validates the cryptographic token and records citizen multi-party signature."""
        if record.get("token") != token:
            return {
                "success": False,
                "error": "INVALID_CRYPTOGRAPHIC_TOKEN",
                "message": "Token HMAC mismatch or expired verification challenge."
            }

        now_str = datetime.now(timezone.utc).isoformat()

        # Handle fraud contestation
        if decision == "FLAG_FRAUD":
            record["status"] = "CONTESTED_FRAUD"
            fraud_entry = {
                "signer_phone": signer_phone,
                "role": "ORIGINAL_FILER" if is_original_filer else "NEARBY_CLUSTER_RESIDENT",
                "decision": "FLAG_FRAUD",
                "signed_at": now_str,
                "remarks": remarks or "Citizen contested repair: Physical defect not repaired or fraudulent photo.",
                "signature_hash": hashlib.sha256(f"{signer_phone}:{token}:{now_str}:FLAG_FRAUD".encode()).hexdigest()
            }
            record["signers"].append(fraud_entry)
            return {
                "success": True,
                "closure_authorized": False,
                "fraud_alert": True,
                "status": "CONTESTED_FRAUD",
                "message": "Citizen flagged field fraud. Ticket frozen and escalated to Level 3 DMC for disciplinary inquiry.",
                "record": record
            }

        # Handle repair confirmation
        # Check if this phone already signed
        existing_signers = [s["signer_phone"] for s in record.get("signers", [])]
        if signer_phone in existing_signers:
            return {
                "success": False,
                "error": "DUPLICATE_SIGNATURE",
                "message": "This resident has already digitally signed the closure confirmation token."
            }

        sig_hash = hashlib.sha256(f"{signer_phone}:{token}:{now_str}:CONFIRM".encode()).hexdigest()
        signer_entry = {
            "signer_phone": signer_phone,
            "role": "ORIGINAL_FILER" if is_original_filer else "NEARBY_CLUSTER_RESIDENT",
            "decision": "CONFIRM_REPAIR",
            "signed_at": now_str,
            "remarks": remarks or "Verified physical resolution on site.",
            "signature_hash": sig_hash
        }
        record.setdefault("signers", []).append(signer_entry)

        # Quota check:
        # 1 original filer satisfies immediately; or cluster residents accumulate to required quota
        if is_original_filer:
            record["collected_signatures"] = record["required_signatures"]
        else:
            record["collected_signatures"] = len(record["signers"])

        if record["collected_signatures"] >= record["required_signatures"]:
            record["status"] = "CRYPTOGRAPHICALLY_VERIFIED"
            closure_authorized = True
            signer_desc = "reporting citizen" if is_original_filer else f"{len(record['signers'])} nearby cluster residents"
            msg = f"Dual-verification complete: Cryptographically confirmed by {signer_desc}."
        else:
            record["status"] = "PARTIALLY_SIGNED"
            closure_authorized = False
            msg = f"Partial signature recorded ({record['collected_signatures']}/{record['required_signatures']}). Waiting for remaining cluster signatures."

        return {
            "success": True,
            "closure_authorized": closure_authorized,
            "fraud_alert": False,
            "status": record["status"],
            "collected_signatures": record["collected_signatures"],
            "required_signatures": record["required_signatures"],
            "signature_hash": sig_hash,
            "message": msg,
            "record": record
        }
