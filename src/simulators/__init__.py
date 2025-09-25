"""Test simulators for RadiusForge - TEST ONLY"""

import os

if os.getenv("ALLOW_SIMULATORS") != "1":
    raise ImportError("Simulators are test-only.")
