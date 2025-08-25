@echo off
echo ========================================
echo GitHub Sync and Push Script
echo ========================================
echo.

echo Current directory: %CD%
echo.

echo Step 1: Fetch remote changes
git fetch origin
echo.

echo Step 2: Check status
git status
echo.

echo Step 3: Pull remote changes (merge)
echo Pulling remote changes...
git pull origin main --no-edit

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Pull failed! There might be conflicts.
    echo Please resolve conflicts manually and try again.
    pause
    exit /b 1
)

echo.
echo Step 4: Push to GitHub
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✓ Sync and push completed successfully!
    echo GitHub: https://github.com/EricSmith123/game-assets
    echo Game: https://game-assets-del.pages.dev/
    echo ========================================
) else (
    echo.
    echo ❌ Push failed!
    echo Please check the error messages above.
)

echo.
pause
