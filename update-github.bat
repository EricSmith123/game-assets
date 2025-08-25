@echo off
echo ========================================
echo GitHub Repository Force Update
echo ========================================
echo.

echo Current directory: %CD%
echo.

echo Clearing Git cache...
git rm -r --cached .

echo.
echo Adding all files...
git add .

echo.
echo Committing changes...
git commit -m "feat: Update Bear Match-3 game complete code"

echo.
echo Pushing to GitHub...
git push

echo.
echo ========================================
echo Update completed successfully!
echo GitHub: https://github.com/EricSmith123/game-assets
echo Game: https://game-assets-del.pages.dev/
echo ========================================
echo.

pause
