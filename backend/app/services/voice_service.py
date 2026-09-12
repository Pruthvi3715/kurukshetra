"""Voice Grievance Ingestion Service (PRD FR-A-2).
Transcribes citizen audio recordings and voice notes (Marathi / Hindi / English)
using local faster-whisper into canonical structured text for Agent A.
"""

import os
import tempfile
import time
from typing import Dict, Any, Optional

try:
    from faster_whisper import WhisperModel
    FASTER_WHISPER_AVAILABLE = True
except ImportError:
    FASTER_WHISPER_AVAILABLE = False


class VoiceService:
    """Local, offline Whisper ASR transcription engine."""
    
    _model: Optional[Any] = None
    _model_size: str = "base"

    @classmethod
    def get_model(cls):
        """Lazy-load the Whisper model singleton."""
        if cls._model is None and FASTER_WHISPER_AVAILABLE:
            # Load optimized int8 CPU model for lightning-fast inference
            cls._model = WhisperModel(cls._model_size, device="cpu", compute_type="int8")
        return cls._model

    @classmethod
    def transcribe_audio_file(cls, file_path: str) -> Dict[str, Any]:
        """Transcribes an audio file on disk and returns language and text."""
        start_t = time.perf_counter()
        model = cls.get_model()

        if model is None:
            return {
                "success": False,
                "error": "faster-whisper is not available in environment",
                "text": "",
                "language": "unknown"
            }

        try:
            # Transcribe with language detection enabled
            segments, info = model.transcribe(
                file_path,
                beam_size=5,
                vad_filter=True, # Voice Activity Detection filter
                vad_parameters=dict(min_silence_duration_ms=500)
            )

            segment_list = []
            full_text_parts = []
            for seg in segments:
                full_text_parts.append(seg.text.strip())
                segment_list.append({
                    "start": round(seg.start, 2),
                    "end": round(seg.end, 2),
                    "text": seg.text.strip()
                })

            transcription = " ".join(full_text_parts).strip()
            latency_ms = round((time.perf_counter() - start_t) * 1000, 2)

            lang_map = {
                "mr": "Marathi",
                "hi": "Hindi",
                "en": "English"
            }
            lang_name = lang_map.get(info.language, info.language.upper())

            return {
                "success": True,
                "transcribed_text": transcription,
                "detected_language": lang_name,
                "language_code": info.language,
                "language_probability": round(info.language_probability, 3),
                "duration_seconds": round(info.duration, 2),
                "latency_ms": latency_ms,
                "segments": segment_list
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "transcribed_text": "",
                "detected_language": "unknown"
            }

    @classmethod
    def transcribe_audio_bytes(cls, audio_bytes: bytes, file_ext: str = ".wav") -> Dict[str, Any]:
        """Writes audio bytes to a secure temporary file and executes Whisper transcription."""
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            result = cls.transcribe_audio_file(tmp_path)
            return result
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass
