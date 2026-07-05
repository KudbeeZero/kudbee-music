#!/bin/bash
export SCRIBE_MOCK=1
exec python3 server.py --port 8000
