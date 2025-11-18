#!/bin/bash

# 事件分类系统启动脚本

echo "================================"
echo "事件分类系统启动脚本"
echo "================================"
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到 Python3，请先安装 Python 3.8+"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js 16+"
    exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "项目根目录: $PROJECT_ROOT"
echo ""

# 启动后端
echo "步骤 1/2: 启动后端服务..."
BACKEND_DIR="$SCRIPT_DIR/backend"
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo "首次运行，正在创建虚拟环境..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo "启动 FastAPI 后端 (端口 8002)..."
cd "$PROJECT_ROOT"
"$BACKEND_DIR/venv/bin/python" web/backend/main.py &
BACKEND_PID=$!
echo "后端进程 PID: $BACKEND_PID"
echo ""

# 等待后端启动
sleep 3

# 启动前端
echo "步骤 2/2: 启动前端服务..."
cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "首次运行，正在安装依赖..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo "创建环境配置文件..."
    cp .env.example .env
fi

echo "启动 React 前端 (端口 3002)..."
npm run dev &
FRONTEND_PID=$!
echo "前端进程 PID: $FRONTEND_PID"
echo ""

echo "================================"
echo "✅ 系统启动成功！"
echo "================================"
echo ""
echo "访问地址："
echo "  前端: http://localhost:3002"
echo "  后端: http://localhost:8002"
echo "  API文档: http://localhost:8002/docs"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo ""

# 保存进程ID到文件
echo "$BACKEND_PID" > "$SCRIPT_DIR/.backend_pid"
echo "$FRONTEND_PID" > "$SCRIPT_DIR/.frontend_pid"

# 等待用户中断
trap "echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f '$SCRIPT_DIR/.backend_pid' '$SCRIPT_DIR/.frontend_pid'; exit" INT TERM

wait
