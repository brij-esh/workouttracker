#Requires -Version 5.1
<#
.SYNOPSIS
  Expose local API gateway (port 8080) via Cloudflare quick tunnel and print the public URL.
.NOTES
  Keep this window open while the Vercel frontend needs the backend.
#>
$ErrorActionPreference = "Stop"

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    $candidates = @(
        "$env:ProgramFiles\cloudflared\cloudflared.exe",
        "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            $cloudflaredPath = $c
            break
        }
    }
    if (-not $cloudflaredPath) {
        throw "cloudflared not found. Install with: winget install Cloudflare.cloudflared"
    }
} else {
    $cloudflaredPath = $cloudflared.Source
}

Write-Host "Checking gateway at http://localhost:8080 ..."
try {
    Invoke-WebRequest -Uri "http://localhost:8080/actuator/health" -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
    throw "Gateway is not reachable on localhost:8080. Start the backend first (infrastructure\up.ps1)."
}

Write-Host "Starting Cloudflare tunnel -> http://localhost:8080"
Write-Host "Copy the https://*.trycloudflare.com URL when it appears."
Write-Host "Then set it as API_BASE_URL for the Vercel deploy (see infrastructure\deploy-frontend-vercel.ps1)."
Write-Host ""

& $cloudflaredPath tunnel --url http://localhost:8080
