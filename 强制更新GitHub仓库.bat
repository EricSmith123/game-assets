@echo off
chcp 65001 >nul
echo ========================================
echo 🚀 强制更新GitHub仓库脚本
echo ========================================
echo.

echo 📍 当前目录：%CD%
echo.

echo 🔍 第1步：检查Git状态
git status
echo.

echo 🧹 第2步：清理Git缓存（强制重新检测所有文件）
git rm -r --cached .
echo ✅ Git缓存已清理
echo.

echo 📁 第3步：重新添加所有文件
git add .
echo ✅ 所有文件已重新添加
echo.

echo 📊 第4步：检查将要提交的文件
git status
echo.

echo 💾 第5步：提交更改
set /p commit_msg="请输入提交信息（直接回车使用默认）: "
if "%commit_msg%"=="" set commit_msg=feat: 强制更新熊熊消消乐游戏完整代码

git commit -m "%commit_msg%"
echo ✅ 提交完成
echo.

echo 🚀 第6步：推送到GitHub
git push
echo ✅ 推送完成
echo.

echo 🎊 更新完成！请检查GitHub仓库
echo 📱 GitHub仓库地址：https://github.com/EricSmith123/game-assets
echo 🌐 游戏访问地址：https://game-assets-del.pages.dev/
echo.

pause
