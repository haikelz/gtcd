#!/usr/bin/env bash
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Configuration ────────────────────────────────────────────────────────────

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"
COMPOSE_FILE="docker-compose.yaml"
CADDYFILE="Caddyfile"

# ─── Preflight ────────────────────────────────────────────────────────────────

if [ ! -f "$COMPOSE_FILE" ]; then
  error "docker-compose.yaml not found. Run this script from the project root."
  exit 1
fi

if ! command -v docker &>/dev/null; then
  error "docker is not installed."
  exit 1
fi

if ! docker compose version &>/dev/null; then
  error "docker compose (v2) is not available."
  exit 1
fi

# ─── Create .env if missing ───────────────────────────────────────────────────

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ENV_EXAMPLE" ]; then
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    info "Created .env from .env.example"
  else
    cat > "$ENV_FILE" <<'EOF'
DOMAIN=localhost
GOATCOUNTER_URL=http://goatcounter:8080
GOATCOUNTER_API_KEY=
REDIS_URL=redis://redis:6379
SESSION_SECRET=
EOF
    info "Created .env with defaults"
  fi
fi

# ─── Prompt for setup ────────────────────────────────────────────────────────

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  gtcd — Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${YELLOW}Tip:${NC} Use ${BLUE}localhost${NC} for local development"
echo -e "  or ${BLUE}analytics.example.com${NC} for production"
echo ""
read -rp "  Domain [localhost]: " GC_DOMAIN
GC_DOMAIN="${GC_DOMAIN:-localhost}"
echo ""
read -rp "  GoatCounter admin email: " GC_EMAIL
read -rsp "  GoatCounter admin password: " GC_PASS
echo ""

if [ -z "$GC_EMAIL" ] || [ -z "$GC_PASS" ]; then
  error "Email and password are required."
  exit 1
fi

# ─── Validate password length ────────────────────────────────────────────────

if [ ${#GC_PASS} -lt 8 ]; then
  error "Password must be at least 8 characters."
  exit 1
fi

# ─── Generate SESSION_SECRET if empty ─────────────────────────────────────────

source "$ENV_FILE" 2>/dev/null || true

if [ -z "${SESSION_SECRET:-}" ]; then
  SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 64)
  info "Generated SESSION_SECRET"
fi

# ─── For local development, use stats.localhost as GoatCounter vhost ──────────

# GoatCounter requires a domain with 2+ labels. For localhost, we use stats.localhost.
# Caddy will route all traffic to gtcd anyway, so GoatCounter's vhost doesn't matter.
if [ "$GC_DOMAIN" = "localhost" ]; then
  GC_VHOST="stats.localhost"
else
  GC_VHOST="$GC_DOMAIN"
fi

# ─── Stop any existing containers ─────────────────────────────────────────────

info "Stopping any existing containers..."
docker compose down -v 2>/dev/null || true

# ─── Generate Caddyfile ──────────────────────────────────────────────────────

info "Generating Caddyfile for domain: $GC_DOMAIN"

cat > "$CADDYFILE" <<CADDY
${GC_DOMAIN} {
	# GoatCounter tracking endpoint
	handle /count {
		reverse_proxy goatcounter:8080
	}

	# GoatCounter admin UI (optional)
	handle /admin/* {
		reverse_proxy goatcounter:8080
	}

	# Everything else → gtcd dashboard
	handle {
		reverse_proxy gtcd:3000
	}

	# Security headers
	header {
		X-Content-Type-Options nosniff
		X-Frame-Options DENY
		Referrer-Policy strict-origin-when-cross-origin
		-Server
	}

	# Enable compression
	encode gzip zstd
}
CADDY

ok "Caddyfile generated"

# ─── Start GoatCounter and Redis ─────────────────────────────────────────────

info "Starting GoatCounter and Redis..."
docker compose up -d goatcounter redis

# ─── Wait for GoatCounter to be ready ────────────────────────────────────────

info "Waiting for GoatCounter to be ready..."
MAX_WAIT=60
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
  if docker compose exec goatcounter wget -q -O /dev/null http://localhost:8080/ 2>/dev/null; then
    ok "GoatCounter is ready"
    break
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  echo -n "."
done

if [ $WAITED -ge $MAX_WAIT ]; then
  error "GoatCounter did not become ready within ${MAX_WAIT}s"
  docker compose logs goatcounter --tail 20
  exit 1
fi

echo ""

# ─── Create site ─────────────────────────────────────────────────────────────

info "Creating GoatCounter site and admin user..."

docker compose exec goatcounter goatcounter db create site \
  -vhost "$GC_VHOST" \
  -user.email "$GC_EMAIL" \
  -user.password "$GC_PASS" \
  -createdb \
  2>&1 || warn "Site may already exist (this is okay)"

ok "Site configured at $GC_VHOST"

# ─── Get user ID ─────────────────────────────────────────────────────────────

info "Looking up user ID..."

USER_ID=$(docker compose exec goatcounter goatcounter db show user \
  -find "$GC_EMAIL" \
  -format json 2>/dev/null \
  | grep -o '"user_id":[0-9]*' \
  | head -1 \
  | cut -d: -f2 || true)

if [ -z "$USER_ID" ]; then
  USER_ID=$(docker compose exec goatcounter goatcounter db show user \
    -find "$GC_EMAIL" \
    -format json 2>/dev/null \
    | grep -o '"id":[0-9]*' \
    | head -1 \
    | cut -d: -f2 || true)
fi

if [ -z "$USER_ID" ]; then
  error "Could not find user ID for $GC_EMAIL"
  USER_ID="1"
fi

ok "User ID: $USER_ID"

# ─── Create API token ────────────────────────────────────────────────────────

info "Creating API token..."

# Check if a token already exists
EXISTING_TOKEN=$(docker compose exec goatcounter goatcounter db show apitoken \
  -find 1 \
  -format json 2>/dev/null \
  | grep -o '"token":"[^"]*"' \
  | head -1 \
  | cut -d'"' -f4 || true)

if [ -n "$EXISTING_TOKEN" ]; then
  API_KEY="$EXISTING_TOKEN"
  ok "Using existing API token"
else
  # Create new API token with all permissions
  docker compose exec goatcounter goatcounter db create apitoken \
    -name "gtcd-dashboard" \
    -user "$USER_ID" \
    -perm "count,export,site_read,site_create,site_update" \
    2>&1 || warn "Token creation had warnings"

  # GoatCounter API requires 'stats' permission which the CLI doesn't expose.
  # Set all permission bits (127) directly in the database.
  docker compose exec goatcounter goatcounter db query \
    "UPDATE api_tokens SET permissions = '127' WHERE name = 'gtcd-dashboard'" \
    -format exec 2>/dev/null || true

  # Fetch the created token
  API_KEY=$(docker compose exec goatcounter goatcounter db show apitoken \
    -find 1 \
    -format json 2>/dev/null \
    | grep -o '"token":"[^"]*"' \
    | head -1 \
    | cut -d'"' -f4 || true)

  if [ -z "$API_KEY" ]; then
    error "Failed to create API token."
    warn "You can create one manually via the GoatCounter dashboard."
  else
    ok "API token created"
  fi
fi

# ─── Write final .env ────────────────────────────────────────────────────────

cat > "$ENV_FILE" <<EOF
DOMAIN=${GC_DOMAIN}
GOATCOUNTER_URL=http://goatcounter:8080
GOATCOUNTER_API_KEY=${API_KEY:-}
REDIS_URL=redis://redis:6379
SESSION_SECRET=${SESSION_SECRET}
EOF

ok ".env saved"

# ─── Start full stack ────────────────────────────────────────────────────────

info "Starting full stack (including Caddy reverse proxy)..."
docker compose up -d --build

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
if [ "$GC_DOMAIN" = "localhost" ]; then
  echo -e "  Dashboard:   ${BLUE}http://localhost${NC}"
  echo -e "  GoatCounter: ${BLUE}http://localhost:8080${NC}"
else
  echo -e "  Dashboard:   ${BLUE}https://${GC_DOMAIN}${NC}"
  echo -e "  Tracking:    ${BLUE}https://${GC_DOMAIN}/count${NC}"
  echo ""
  echo -e "  ${YELLOW}Point your DNS A record for ${GC_DOMAIN} to this server${NC}"
  echo -e "  ${YELLOW}Caddy will automatically provision TLS certificates${NC}"
fi
echo -e "  Login:       ${BLUE}${GC_EMAIL}${NC}"
echo ""
echo -e "  Credentials saved to ${YELLOW}.env${NC}"
echo ""
