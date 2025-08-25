@echo off
echo ========================================
echo GitHub Force Push Script
echo ========================================
echo.

echo Current directory: %CD%
echo.

echo Step 1: Check current status
git status
echo.

echo Step 2: Check local vs remote commits
git log --oneline -5
echo.

echo Step 3: Force push to GitHub (overwrite remote)
echo WARNING: This will overwrite remote repository!
set /p confirm="Are you sure? Type 'yes' to continue: "
if not "%confirm%"=="yes" (
    echo Operation cancelled.
    pause
    exit /b 1
)

echo.
echo Force pushing to GitHub...
git push --force-with-lease origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✓ Force push completed successfully!
    echo GitHub: https://github.com/EricSmith123/game-assets
    echo Game: https://game-assets-del.pages.dev/
    echo ========================================
) else (
    echo.
    echo ❌ Force push failed!
    echo Please check the error messages above.
)

echo.
pause
