#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
HEALTH_PATH="${HEALTH_PATH:-/api/status}"
TUNNEL_CMD="${TUNNEL_CMD:-}"

echo "[restart] myks-app gateway recovery in $ROOT"

echo "[restart] stopping stale gateway processes..."
pkill -f "node.*${ROOT}" 2>/dev/null || true
pkill -f "cloudflared.*tunnel" 2>/dev/null || true
sleep 1

if [[ -f package.json ]]; then
  echo "[restart] starting gateway (npm start)..."
  nohup npm start > /tmp/myks-app-gateway.log 2>&1 &
  GATEWAY_PID=$!
  echo "[restart] gateway pid=$GATEWAY_PID log=/tmp/myks-app-gateway.log"
else
  echo "[restart] package.json not found — start your server manually from $ROOT"
  exit 1
fi

if [[ -n "$TUNNEL_CMD" ]]; then
  echo "[restart] starting tunnel: $TUNNEL_CMD"
  nohup bash -lc "$TUNNEL_CMD" > /tmp/myks-app-tunnel.log 2>&1 &
  echo "[restart] tunnel log=/tmp/myks-app-tunnel.log"
elif command -v cloudflared >/dev/null 2>&1 && [[ -f .env ]]; then
  if grep -q '^CLOUDFLARE_TUNNEL_TOKEN=' .env 2>/dev/null; then
    TOKEN="$(grep '^CLOUDFLARE_TUNNEL_TOKEN=' .env | cut -d= -f2- | tr -d '"' | tr -d "'")"
    echo "[restart] starting cloudflared quick tunnel token from .env"
    nohup cloudflared tunnel run --token "$TOKEN" > /tmp/myks-app-tunnel.log 2>&1 &
    echo "[restart] tunnel log=/tmp/myks-app-tunnel.log"
  fi
fi

echo "[restart] waiting for local health..."
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${PORT}${HEALTH_PATH}" >/dev/null 2>&1; then
    echo "[restart] OK local gateway responding on :${PORT}"
    exit 0
  fi
  sleep 1
done

echo "[restart] WARN gateway did not become healthy within 30s"
echo "[restart] tail gateway log:"
tail -n 40 /tmp/myks-app-gateway.log || true
exit 1
