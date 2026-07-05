#!/usr/bin/env python3
"""Keep server alive by periodic health checks."""

import requests
import time
import sys

URL = "http://127.0.0.1:8000/scribe/health"
INTERVAL = 480  # 8 minutes (before 10-min timeout)

print(f"🔄 Keepalive: pinging {URL} every {INTERVAL}s")

while True:
    try:
        r = requests.get(URL, timeout=5)
        if r.status_code == 200:
            print(f"✅ {time.strftime('%H:%M:%S')} - Server alive")
        else:
            print(f"⚠️  {time.strftime('%H:%M:%S')} - Status {r.status_code}")
    except Exception as e:
        print(f"❌ {time.strftime('%H:%M:%S')} - Error: {e}")

    time.sleep(INTERVAL)
