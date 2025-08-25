# GitHub Repository Force Update Script
# PowerShell version with error handling

Write-Host "========================================" -ForegroundColor Green
Write-Host "GitHub Repository Force Update Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Current Directory: $PWD" -ForegroundColor Yellow
Write-Host ""

# Check if we're in a Git repository
if (-not (Test-Path ".git")) {
    Write-Host "Error: Not in a Git repository!" -ForegroundColor Red
    Write-Host "Please navigate to: D:\desktop\GitHubProjects\game-assets" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    Write-Host "Step 1: Checking Git status..." -ForegroundColor Cyan
    git status
    Write-Host ""

    Write-Host "Step 2: Clearing Git cache (force re-detect all files)..." -ForegroundColor Cyan
    git rm -r --cached .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Git cache cleared successfully" -ForegroundColor Green
    } else {
        throw "Failed to clear Git cache"
    }
    Write-Host ""

    Write-Host "Step 3: Re-adding all files..." -ForegroundColor Cyan
    git add .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ All files re-added successfully" -ForegroundColor Green
    } else {
        throw "Failed to add files"
    }
    Write-Host ""

    Write-Host "Step 4: Checking files to be committed..." -ForegroundColor Cyan
    git status
    Write-Host ""

    Write-Host "Step 5: Committing changes..." -ForegroundColor Cyan
    git commit -m "feat: Force update Bear Match-3 game complete code"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Commit completed successfully" -ForegroundColor Green
    } else {
        throw "Failed to commit changes"
    }
    Write-Host ""

    Write-Host "Step 6: Pushing to GitHub..." -ForegroundColor Cyan
    git push
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Push completed successfully" -ForegroundColor Green
    } else {
        throw "Failed to push to GitHub"
    }
    Write-Host ""

    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ Update completed successfully!" -ForegroundColor Green
    Write-Host "GitHub Repository: https://github.com/EricSmith123/game-assets" -ForegroundColor Yellow
    Write-Host "Game URL: https://game-assets-del.pages.dev/" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "❌ Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check the error message above and try again." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
