#!/usr/bin/env sh
# Smoke-test a built gtcd image: start it hardened (read-only root, no
# capabilities), wait for the login page, check /api/health, then confirm a
# clean exit on SIGTERM. Needs no GoatCounter or Redis; health reports
# "degraded" without them, which is expected here.
#
# Usage: scripts/smoke-image.sh <image> [platform]
set -eu

IMAGE="${1:?usage: scripts/smoke-image.sh <image> [platform]}"
PLATFORM="${2:-}"
NAME="gtcd-smoke-$$"
PORT="${SMOKE_PORT:-3399}"

cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach --name "$NAME" ${PLATFORM:+--platform "$PLATFORM"} \
  --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  --tmpfs /tmp:size=64m \
  --publish "127.0.0.1:${PORT}:3000" \
  --env GOATCOUNTER_URL=http://127.0.0.1:9 \
  --env GOATCOUNTER_API_KEY=smoke-test-placeholder \
  "$IMAGE" >/dev/null

# Emulated platforms start slowly; allow up to 60 seconds.
status=""
for _ in $(seq 1 60); do
  status="$(curl --silent --output /dev/null --write-out '%{http_code}' \
    "http://127.0.0.1:${PORT}/login" || true)"
  [ "$status" = "200" ] && break
  sleep 1
done

if [ "$status" != "200" ]; then
  echo "smoke: /login returned '${status}' (expected 200)" >&2
  docker logs "$NAME" >&2 || true
  exit 1
fi

health="$(curl --silent "http://127.0.0.1:${PORT}/api/health")"
case "$health" in
  *'"status"'*) ;;
  *)
    echo "smoke: unexpected /api/health response: ${health}" >&2
    exit 1
    ;;
esac

user="$(docker exec "$NAME" id -u)"
if [ "$user" = "0" ]; then
  echo "smoke: container runs as root" >&2
  exit 1
fi

docker stop --time 10 "$NAME" >/dev/null
exit_code="$(docker inspect --format '{{.State.ExitCode}}' "$NAME")"
if [ "$exit_code" != "0" ]; then
  echo "smoke: exit code ${exit_code} after SIGTERM (expected 0)" >&2
  docker logs "$NAME" >&2 || true
  exit 1
fi

echo "smoke: ${IMAGE}${PLATFORM:+ (${PLATFORM})} ok, health ${health}, uid ${user}"
