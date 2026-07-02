# Deploy the built SPA to the VPS as a static site (vps-static class) at atalaya.fasl-work.com.
# .ps1 parity of deploy.sh (Felipe runs PowerShell). The SSH key lives in the private CAOS_MANAGE vault.
#   $env:ATALAYA_SSH_KEY = "D:\...\hetzner_fasl_prod" ; ./scripts/deploy.ps1
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$HostSpec = if ($env:ATALAYA_HOST) { $env:ATALAYA_HOST } else { "root@91.99.199.70" }
if (-not $env:ATALAYA_SSH_KEY) { throw "set ATALAYA_SSH_KEY to the vault SSH key path" }
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
& ssh -i $Key $HostSpec "certbot --nginx -d $Domain --non-interactive --agree-tos -m fsantibanez@gmail.com --redirect || true; systemctl reload nginx"

Write-Host "[deploy] done -> https://$Domain"
