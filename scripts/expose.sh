#!/usr/bin/env bash
# Run the Hit Factory locally and expose it on a public URL via a quick tunnel.
# Use this on YOUR machine (open outbound) — not inside the Claude Code sandbox,
# whose egress gateway blocks tunnels by design.
#
#   ./scripts/expose.sh            # dev server + cloudflared quick tunnel
#   TUNNEL=localtunnel ./scripts/expose.sh
set -euo pipefail
PORT="${PORT:-3000}"
cd "$(dirname "$0")/.."

[ -d node_modules ] || npm install
echo "▶ starting the app on http://localhost:$PORT …"
npm run web:dev >/tmp/hermes-web.log 2>&1 &
APP_PID=$!
trap 'kill $APP_PID 2>/dev/null || true' EXIT
# wait for it to answer
for i in $(seq 1 30); do
  curl -fsS "http://localhost:$PORT/hermes" >/dev/null 2>&1 && break || sleep 1
done
echo "▶ app is up. opening a public tunnel …"
echo "  (then open the printed URL + /hermes)"
if [ "${TUNNEL:-cloudflared}" = "localtunnel" ]; then
  npx --yes localtunnel --port "$PORT"
else
  npx --yes cloudflared tunnel --url "http://localhost:$PORT"
fi
