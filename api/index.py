"""Vercel Serverless Entrypoint for PS17 Multi-Agent Municipal Redressal API."""

import sys
import os

# Ensure the backend directory is in sys.path for module resolution
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
