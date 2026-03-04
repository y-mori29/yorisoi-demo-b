<#
.SYNOPSIS
    Deploys the Yorisoi Medical application components to Google Cloud Run with 'hikari-' prefix.
.DESCRIPTION
    This script automates the build and deployment process using Cloud Build and Cloud Run.
    It handles backend URL retrieval and injection into frontend deployments.
.PARAMETER Target
    The component to deploy: "all", "backend", "frontend", "dashboard". Default is "all".
.PARAMETER ProjectId
    GCP Project ID. Default is "yorisoi-medical".
.PARAMETER Region
    GCP Region. Default is "asia-northeast1".
#>

param(
    [ValidateSet("all", "backend", "frontend", "dashboard")]
    [string]$Target = "all",

    [string]$ProjectId = "yorisoi-medical",
    [string]$Region = "asia-northeast1",
    
    [ValidateSet("demo-b")]
    [string]$Environment = "demo-b"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host -ForegroundColor Cyan "`n=== $Message ==="
}

function Write-Success {
    param([string]$Message)
    Write-Host -ForegroundColor Green "SUCCESS: $Message"
}

# --- Check Prerequisites ---
Write-Step "Checking Configuration"
$gcloudCheck = Get-Command gcloud -ErrorAction SilentlyContinue
if (-not $gcloudCheck) {
    Write-Error "Google Cloud SDK (gcloud) is not installed or not in PATH."
}
Write-Host "Target: $Target"
Write-Host "Project: $ProjectId"
Write-Host "Region: $Region"

# Ensure gcloud uses correct project
cmd /c "gcloud config set project $ProjectId"

# --- Set Environment Variables File ---
$EnvFile = "deploy_env_demo_b.yaml"

# --- Backend Deployment ---
if ($Target -eq "all" -or $Target -eq "backend") {
    Write-Step "Deploying Backend ($Environment-backend)"
    
    # Submit Build
    cmd /c "gcloud builds submit backend --tag gcr.io/$ProjectId/$Environment-backend --quiet"
    
    # Deploy to Cloud Run
    # Use environment-specific variables file
    cmd /c "gcloud run deploy $Environment-backend --image gcr.io/$ProjectId/$Environment-backend --platform managed --region $Region --allow-unauthenticated --port 8080 --env-vars-file $EnvFile --quiet"
    
    Write-Success "Backend Deployed"
}

# --- Retrieve Backend URL ---
Write-Step "Retrieving Backend URL"
$BackendUrl = cmd /c "gcloud run services describe $Environment-backend --platform managed --region $Region --format=""value(status.url)"""
if (-not $BackendUrl) {
    Write-Error "Failed to retrieve Backend URL. Is $Environment-backend deployed?"
}
Write-Host "Using Backend URL: $BackendUrl"


# --- Frontend Deployment ---
if ($Target -eq "all" -or $Target -eq "frontend") {
    Write-Step "Deploying Frontend ($Environment-frontend)"
    
    $cloudbuild = @"
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '--build-arg', 'NEXT_PUBLIC_API_BASE_URL=$BackendUrl', '-t', 'gcr.io/$ProjectId/$Environment-frontend', '.']
images:
- 'gcr.io/$ProjectId/$Environment-frontend'
"@
    $cloudbuild | Out-File -Encoding UTF8 frontend/cloudbuild.temp.yaml
    
    cmd /c "gcloud builds submit frontend --config frontend/cloudbuild.temp.yaml --quiet"
    Remove-Item frontend/cloudbuild.temp.yaml
    
    # Deploy
    cmd /c "gcloud run deploy $Environment-frontend --image gcr.io/$ProjectId/$Environment-frontend --platform managed --region $Region --allow-unauthenticated --port 8080 --quiet"
    
    Write-Success "Frontend Deployed"
}

# --- Dashboard Deployment ---
if ($Target -eq "all" -or $Target -eq "dashboard") {
    Write-Step "Deploying Dashboard ($Environment-dashboard)"
    
    $cloudbuild = @"
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '--build-arg', 'VITE_API_BASE_URL=${BackendUrl}/api', '-t', 'gcr.io/$ProjectId/$Environment-dashboard', '.']
images:
- 'gcr.io/$ProjectId/$Environment-dashboard'
"@
    $cloudbuild | Out-File -Encoding UTF8 dashboard/cloudbuild.temp.yaml

    cmd /c "gcloud builds submit dashboard --config dashboard/cloudbuild.temp.yaml --quiet"
    Remove-Item dashboard/cloudbuild.temp.yaml
    
    # Deploy
    cmd /c "gcloud run deploy $Environment-dashboard --image gcr.io/$ProjectId/$Environment-dashboard --platform managed --region $Region --allow-unauthenticated --port 8080 --quiet"
    
    Write-Success "Dashboard Deployed"
}

Write-Step "Deployment Complete"
Write-Host "Services are available at the URLs listed above."
