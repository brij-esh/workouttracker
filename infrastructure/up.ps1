# Builds jars on the host (fast), packages runtime images, starts the stack.
# Usage: .\infrastructure\up.ps1

$ErrorActionPreference = "Stop"

$infra = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $infra
$backend = Join-Path $root "backend"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User")

Set-Location $infra
if (-not (Test-Path ".\.env")) {
    Copy-Item ".\.env.example" ".\.env"
    Write-Host "Created .env from .env.example"
}

Write-Host "Waiting for Docker engine..."
$deadline = (Get-Date).AddMinutes(3)
do {
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 3
} while ((Get-Date) -lt $deadline)
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Docker engine is not running. Start Docker Desktop, then re-run this script."
}

$services = @(
    "api-gateway",
    "user-service",
    "workout-service",
    "progress-service",
    "nutrition-service",
    "notification-service"
)

Write-Host "Building backend jars on host (one Maven pass)..."
Set-Location $backend
mvn -B -pl ($services -join ",") -am package -DskipTests
if ($LASTEXITCODE -ne 0) { throw "Maven package failed" }

$dist = Join-Path $backend "docker-dist"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
Get-ChildItem $dist -Filter *.jar -ErrorAction SilentlyContinue | Remove-Item -Force

foreach ($svc in $services) {
    $jar = Get-ChildItem (Join-Path $backend "$svc\target") -Filter "$svc-*.jar" |
        Where-Object { $_.Name -notmatch "plain" } |
        Select-Object -First 1
    if (-not $jar) { throw "Missing jar for $svc" }
    Copy-Item $jar.FullName (Join-Path $dist "$svc.jar") -Force
    Write-Host "  staged $svc <- $($jar.Name)"
}

Write-Host "Building images and starting stack..."
Set-Location $infra
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }

Write-Host ""
docker compose ps
Write-Host ""
Write-Host "Gateway:      http://localhost:8080"
Write-Host "Kafka UI:     http://localhost:8089"
Write-Host "Prometheus:   http://localhost:9090"
Write-Host "Grafana:      http://localhost:3000"
