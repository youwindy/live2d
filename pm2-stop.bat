@echo off
echo ========================================
echo   Live2D Editor - PM2 停止脚本
echo ========================================
echo.

echo 正在停止 Live2D 后端服务...
call npm run pm2:stop
echo.

echo ========================================
echo   服务已停止
echo ========================================
pause
