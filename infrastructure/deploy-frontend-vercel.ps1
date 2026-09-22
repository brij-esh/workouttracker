#Requires -Version 5.1
<#
.SYNOPSIS
  Build and deploy the Angular frontend to Vercel against a tunneled local API.
.PARAMETER ApiBaseUrl
  Public tunnel origin only, e.g. https://xxxx.trycloudflare.com (no /api suffix).
.EXAMPLE
  .\infrastructure\deploy-frontend-vercel.ps1 -ApiBaseUrl https://abc.trycloudflare.com
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$ApiBaseUrl
)

$ErrorActionPreference = "Stop"

$ApiBaseUrl = $ApiBaseUrl.Trim().TrimEnd('/')
if ($ApiBaseUrl -notmatch '^https?://') {
    throw "ApiBaseUrl must be an http(s) URL, got: $ApiBaseUrl"
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$web = Join-Path $root "frontend\web"

Set-Location $web
if (-not (Test-Path "node_modules")) {
    Write-Host "npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
}

$env:API_BASE_URL = $ApiBaseUrl
Write-Host "Building with API_BASE_URL=$ApiBaseUrl"
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

$vercel = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercel) {
    npm install -g vercel
    $vercel = Get-Command vercel -ErrorAction SilentlyContinue
}
if (-not $vercel) {
    throw "vercel CLI not found after install"
}

Write-Host "Deploying to Vercel (production)..."
& vercel --prod --yes
if ($LASTEXITCODE -ne 0) { throw "vercel deploy failed" }

Write-Host ""
Write-Host "Done. Add your Vercel domain in Firebase Console -> Authentication -> Settings -> Authorized domains."
Write-Host "Keep infrastructure\tunnel-api.ps1 running so the frontend can reach your local API."
