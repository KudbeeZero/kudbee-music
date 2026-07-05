#!/bin/bash
# Start server and keepalive together
export SCRIBE_MOCK=1
python3 server.py --port 8000 &
SERVER_PID=$!
echo "Server started: PID $SERVER_PID"
sleep 2
python3 keepalive.py &
KEEPALIVE_PID=$!
echo "Keepalive started: PID $KEEPALIVE_PID"
wait
