# Deploy the built SPA to the VPS as a static site (vps-static class) at atalaya.fasl-work.com.
# .ps1 parity of deploy.sh (Felipe runs PowerShell). The SSH key lives in the private CAOS_MANAGE vault.
#   $env:ATALAYA_SSH_KEY = "D:\...\hetzner_fasl_prod" ; ./scripts/deploy.ps1
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not $env:ATALAYA_HOST) { throw "set ATALAYA_HOST to the deploy target, e.g. root@your.host" }
if (-not $env:ATALAYA_SSH_KEY) { throw "set ATALAYA_SSH_KEY to the vault SSH key path" }
if (-not $env:ATALAYA_CERTBOT_EMAIL) { throw "set ATALAYA_CERTBOT_EMAIL for the TLS certificate" }
$HostSpec = $env:ATALAYA_HOST
$Key = $env:ATALAYA_SSH_KEY
$Domain = "atalaya.fasl-work.com"
$Root = "/var/www/$Domain"

Write-Host "[deploy] building the SPA..."
Push-Location frontend; npm ci; npm run build; Pop-Location

Write-Host "[deploy] rsync dist -> ${HostSpec}:$Root"
& ssh -i $Key -o StrictHostKeyChecking=accept-new $HostSpec "mkdir -p $Root"
& rsync -az --delete -e "ssh -i $Key" frontend/dist/ "${HostSpec}:$Root/"

Write-Host "[deploy] install nginx site + reload"
& scp -i $Key "deploy/$Domain.nginx" "${HostSpec}:/etc/nginx/sites-available/$Domain"
& ssh -i $Key $HostSpec "ln -sf /etc/nginx/sites-available/$Domain /etc/nginx/sites-enabled/$Domain && nginx -t && systemctl reload nginx"

Write-Host "[deploy] ensure TLS cert"
& ssh -i $Key $HostSpec "certbot --nginx -d $Domain --non-interactive --agree-tos -m $env:ATALAYA_CERTBOT_EMAIL --redirect || true; systemctl reload nginx"

Write-Host "[deploy] done -> https://$Domain"
