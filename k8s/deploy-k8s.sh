#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/gtcd"

# Source .env
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
else
  echo "No k8s/.env found. Copy gtcd/.env.example to k8s/.env and fill it in." >&2
  exit 1
fi

# Validate required vars
required_vars=(DOMAIN EMAIL IMAGE GOATCOUNTER_URL GOATCOUNTER_API_KEY REDIS_PASSWORD)
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing required env var: ${var}. Set it in the shell or k8s/.env." >&2
    exit 1
  fi
done

# The password goes into both redis.conf and gtcd's REDIS_URL, so keep it to
# characters that need no escaping in either.
if [[ ! "$REDIS_PASSWORD" =~ ^[A-Za-z0-9]{16,}$ ]]; then
  echo "REDIS_PASSWORD must be 16+ letters and digits (try: openssl rand -hex 32)." >&2
  exit 1
fi

# Refuse to replace an ephemeral Redis pod before its state has been migrated.
# See docs/REDIS_STATE.md; this check runs before any cluster mutations.
if kubectl get deployment redis >/dev/null 2>&1; then
  redis_claim="$(kubectl get deployment redis -o 'jsonpath={.spec.template.spec.volumes[?(@.name=="data")].persistentVolumeClaim.claimName}')"
  if [[ -z "$redis_claim" ]]; then
    echo "Redis still uses ephemeral storage. Back up and migrate its state to redis-data before deploying; see docs/REDIS_STATE.md." >&2
    exit 1
  fi
fi

# render_apply
render_apply() {
  if envsubst < "$1" | grep -q '\${'; then
    echo "Rendered ${1} still contains unsubstituted variables. Check your env values." >&2
    exit 1
  fi
  envsubst < "$1" | kubectl apply -f -
}

# Cluster prerequisites (skipped gracefully when CRDs are absent).
if kubectl api-resources --api-group=cert-manager.io 2>/dev/null | grep -q issuers; then
  render_apply "$SCRIPT_DIR/shared/clusterissuer.yaml"
else
  echo "  cert-manager CRDs not found - skipping ClusterIssuer. Install cert-manager first." >&2
fi

if kubectl api-resources --api-group=traefik.io 2>/dev/null | grep -q middlewares; then
  for mw in "$SCRIPT_DIR"/shared/middleware/*.yaml; do
    [[ -f "$mw" ]] && kubectl apply -f "$mw"
  done
else
  echo "  Traefik CRDs not found - skipping middlewares. Install Traefik first." >&2
fi

# adapter-node reads an empty XFF_DEPTH as NaN, so give it a value.
: "${XFF_DEPTH:=1}"

# Create/update the Secret from env vars. Secret keys are read by the pod at
# container start, so the deployment is rolled again after the apply below.
secret_name="gtcd-env"
secret_vars=(
  GOATCOUNTER_URL
  GOATCOUNTER_API_KEY
  GTCD_ADMIN_EMAILS
  GOATCOUNTER_ADMIN_URL
  REDIS_PASSWORD
  SMTP_HOST
  SMTP_PORT
  SMTP_SECURE
  SMTP_USER
  SMTP_PASSWORD
  SMTP_FROM
  GTCD_PUBLIC_URL
  TURNSTILE_SITE_KEY
  TURNSTILE_SECRET_KEY
  ADDRESS_HEADER
  XFF_DEPTH
)

echo "  Creating/updating Secret '$secret_name'..."
literal_args=()
for var in "${secret_vars[@]}"; do
  literal_args+=("--from-literal=${var}=${!var:-}")
done

kubectl create secret generic "$secret_name" \
  "${literal_args[@]}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Redis loads requirepass from this Secret, mounted as /run/secrets/redis.conf.
# The checksum annotation restarts Redis only when the config changes, so a
# routine deploy does not drop every session.
redis_conf="$(printf 'requirepass %s\nsave ""\nappendonly yes\nappendfsync always\ndir /data\n' "$REDIS_PASSWORD")"
echo "  Creating/updating Secret 'redis-config'..."
kubectl create secret generic redis-config \
  --from-literal=redis.conf="$redis_conf" \
  --dry-run=client -o yaml | kubectl apply -f -
if command -v sha256sum >/dev/null 2>&1; then
  REDIS_CONFIG_SHA="$(printf '%s' "$redis_conf" | sha256sum | cut -c1-16)"
else
  REDIS_CONFIG_SHA="$(printf '%s' "$redis_conf" | shasum -a 256 | cut -c1-16)"
fi
export REDIS_CONFIG_SHA

# Apply in dependency order.
apply_order=(services goatcounter redis deployment ingress)
for resource in "${apply_order[@]}"; do
  file="$APP_DIR/${resource}.yaml"
  [[ -f "$file" ]] && render_apply "$file"
done

# A Secret update alone never restarts pods; roll so pods pick up the
# current Secret values.
echo "  Restarting deployment/gtcd to pick up current Secret..."
kubectl rollout restart deployment/gtcd

echo ""
echo "  Done: gtcd deployed."
