@echo off
echo ========================================
echo   Live2D Editor - PM2 启动脚本
echo ========================================
echo.

echo [1/3] 检查 PM2 是否已安装...
call pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo PM2 未安装，正在全局安装 PM2...
    call npm install -g pm2
    if %errorlevel% neq 0 (
        echo PM2 安装失败！请手动运行: npm install -g pm2
        pause
        exit /b 1
    )
    echo PM2 安装成功！
) else (
    echo PM2 已安装
)
echo.

echo [2/3] 检查后端依赖...
if not exist "server\node_modules" (
    echo 后端依赖未安装，正在安装...
    cd server
    call npm install
    cd ..
    echo 后端依赖安装完成！
) else (
    echo 后端依赖已安装
)
echo.

echo [3/3] 启动 Live2D 后端服务...
call npm run pm2:start
echo.

echo ========================================
echo   服务启动完成！
echo ========================================
echo.
echo 后端服务: http://localhost:3001
echo.
echo 常用命令:
echo   查看状态: npm run pm2:status
echo   查看日志: npm run pm2:logs
echo   重启服务: npm run pm2:restart
echo   停止服务: npm run pm2:stop
echo   监控面板: npm run pm2:monit
echo.
echo 前端开发服务器请运行: npm run dev
echo ========================================
pause
