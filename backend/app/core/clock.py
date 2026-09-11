"""Virtual Time-Travel Simulation Clock Service.
Provides synchronized virtual time offset for live SLA demonstration,
matching the specification in PS17 Section 6.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any


class ClockService:
    """Maintains a global virtual time offset for live SLA testing and demonstration."""
    _instance = None
    _offset_seconds: int = 0

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ClockService, cls).__new__(cls)
            cls._instance._offset_seconds = 0
        return cls._instance

    @classmethod
    def get_current_virtual_time(cls) -> datetime:
        """Returns the current simulated time (System UTC + Offset)."""
        offset = cls._offset_seconds
        return datetime.now(timezone.utc) + timedelta(seconds=offset)

    @classmethod
    def advance_virtual_clock(cls, hours: int) -> datetime:
        """Advances the virtual clock by the given number of hours."""
        cls._offset_seconds += int(hours * 3600)
        return cls.get_current_virtual_time()

    @classmethod
    def reset_virtual_clock(cls) -> datetime:
        """Resets the virtual clock to match the real system time."""
        cls._offset_seconds = 0
        return cls.get_current_virtual_time()

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """Returns current clock status and offsets."""
        now_real = datetime.now(timezone.utc)
        now_virtual = cls.get_current_virtual_time()
        return {
            "virtual_time": now_virtual,
            "real_time": now_real,
            "offset_seconds": cls._offset_seconds,
            "offset_hours": round(cls._offset_seconds / 3600, 2),
        }
