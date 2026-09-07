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
required_vars=(DOMAIN EMAIL IMAGE GOATCOUNTER_URL GOATCOUNTER_API_KEY)
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing required env var: ${var}. Set it in the shell or k8s/.env." >&2
    exit 1
  fi
done

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

# Create/update the Secret from env vars. Secret keys are read by the pod at
# container start, so the deployment is rolled again after the apply below.
secret_name="gtcd-env"
secret_vars=(
  GOATCOUNTER_URL
  GOATCOUNTER_API_KEY
  GTCD_ADMIN_EMAILS
  GOATCOUNTER_ADMIN_URL
)

echo "  Creating/updating Secret '$secret_name'..."
literal_args=()
for var in "${secret_vars[@]}"; do
  literal_args+=("--from-literal=${var}=${!var:-}")
done

kubectl create secret generic "$secret_name" \
  "${literal_args[@]}" \
  --dry-run=client -o yaml | kubectl apply -f -

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
