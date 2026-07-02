#!/usr/bin/env bash
# Deploy the built SPA to the VPS as a static site (vps-static class) at atalaya.fasl-work.com.
# Prereq: the SSH key to the host (kept in the private CAOS_MANAGE vault, NOT in this repo). Pass its path via
#   ATALAYA_SSH_KEY=/path/to/hetzner_fasl_prod ./scripts/deploy.sh
# Idempotent: builds fresh, rsyncs dist, installs/reloads the nginx site, provisions the cert if missing.
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${ATALAYA_HOST:-root@91.99.199.70}"
KEY="${ATALAYA_SSH_KEY:?set ATALAYA_SSH_KEY to the vault SSH key path}"
DOMAIN="atalaya.fasl-work.com"
ROOT="/var/www/${DOMAIN}"

echo "[deploy] building the SPA (copy-data overlays committed artifacts)…"
( cd frontend && npm ci && npm run build )

echo "[deploy] rsync dist -> ${HOST}:${ROOT}"
ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" "mkdir -p ${ROOT}"
rsync -az --delete -e "ssh -i $KEY" frontend/dist/ "${HOST}:${ROOT}/"

echo "[deploy] install nginx site + reload"
scp -i "$KEY" deploy/${DOMAIN}.nginx "${HOST}:/etc/nginx/sites-available/${DOMAIN}"
ssh -i "$KEY" "$HOST" "ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/${DOMAIN} && nginx -t && systemctl reload nginx"

echo "[deploy] ensure TLS cert (certbot, idempotent)"
ssh -i "$KEY" "$HOST" "certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m fsantibanez@gmail.com --redirect || true; systemctl reload nginx"

echo "[deploy] done -> https://${DOMAIN}"
