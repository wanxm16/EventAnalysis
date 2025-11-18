#!/bin/bash

# 事件分类系统停止脚本

echo "正在停止事件分类系统..."

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 读取进程ID
if [ -f "$SCRIPT_DIR/.backend_pid" ]; then
    BACKEND_PID=$(cat "$SCRIPT_DIR/.backend_pid")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "停止后端服务 (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
    fi
    rm -f "$SCRIPT_DIR/.backend_pid"
fi

if [ -f "$SCRIPT_DIR/.frontend_pid" ]; then
    FRONTEND_PID=$(cat "$SCRIPT_DIR/.frontend_pid")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "停止前端服务 (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
    fi
    rm -f "$SCRIPT_DIR/.frontend_pid"
fi

# 额外清理：停止所有可能的 uvicorn 和 vite 进程
pkill -f "uvicorn.*main:app" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo "✅ 所有服务已停止"
