#!/bin/bash

# 事件查询系统一键启动脚本
# 使用方法: ./start.sh [--skip-install]

set -e  # 出错时立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 检查端口是否被占用
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 $port 已被占用，尝试停止占用进程..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 2
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_error "无法释放端口 $port，请手动停止占用进程"
            exit 1
        fi
        print_success "端口 $port 已释放"
    fi
}

# 等待服务启动
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    print_step "等待 $service_name 启动..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$service_name 启动成功！"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 1
    done
    
    print_error "$service_name 启动超时"
    return 1
}

# 清理函数
cleanup() {
    echo ""
    print_step "正在停止所有服务..."
    
    # 停止后端服务
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        kill $BACKEND_PID
        print_success "后端服务已停止"
    fi
    
    # 停止前端服务
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        kill $FRONTEND_PID
        print_success "前端服务已停止"
    fi
    
    # 清理可能残留的进程
    pkill -f "python.*main.py" 2>/dev/null || true
    pkill -f "pnpm.*start" 2>/dev/null || true
    
    print_success "服务清理完成"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

echo "🚀 启动事件查询系统..."
echo "========================================"

# 检查必要的命令
print_step "检查系统环境..."
check_command python3
check_command node

# 检查pnpm，如果没有则尝试安装
if ! command -v pnpm &> /dev/null; then
    print_warning "pnpm 未安装，正在安装..."
    npm install -g pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm 安装失败，请手动安装"
        exit 1
    fi
    print_success "pnpm 安装成功"
fi

print_success "系统环境检查完成"

# 检查是否跳过依赖安装
SKIP_INSTALL=false
if [[ "$1" == "--skip-install" ]]; then
    SKIP_INSTALL=true
    print_info "跳过依赖安装"
fi

# 安装依赖
if [ "$SKIP_INSTALL" = false ]; then
    print_step "安装Python依赖..."
    cd backend
    if [ ! -f ".deps_installed" ] || [ "requirements.txt" -nt ".deps_installed" ]; then
        pip3 install -r requirements.txt
        touch .deps_installed
        print_success "Python依赖安装完成"
    else
        print_info "Python依赖已是最新，跳过安装"
    fi
    cd ..

    print_step "安装前端依赖..."
    cd frontend
    if [ ! -f ".deps_installed" ] || [ "package.json" -nt ".deps_installed" ]; then
        pnpm install
        touch .deps_installed
        print_success "前端依赖安装完成"
    else
        print_info "前端依赖已是最新，跳过安装"
    fi
    cd ..
else
    print_info "已跳过依赖安装"
fi

# 检查端口占用
print_step "检查端口占用..."
check_port 8000 "后端服务"
check_port 3000 "前端服务"

# 启动后端服务
print_step "启动后端服务..."
cd backend
python3 main.py &
BACKEND_PID=$!
cd ..

# 等待后端服务启动
if ! wait_for_service "http://localhost:8000/" "后端服务"; then
    cleanup
    exit 1
fi

# 启动前端服务
print_step "启动前端服务..."
cd frontend
pnpm start &
FRONTEND_PID=$!
cd ..

# 等待前端服务启动
if ! wait_for_service "http://localhost:3000" "前端服务"; then
    cleanup
    exit 1
fi

echo ""
echo "========================================"
print_success "所有服务启动完成！"
echo ""
print_info "服务地址："
echo "  🌐 前端界面: http://localhost:3000"
echo "  🔧 后端API: http://localhost:8000"
echo "  📚 API文档: http://localhost:8000/docs"
echo ""
print_warning "按 Ctrl+C 停止所有服务"
echo "========================================"

# 保持脚本运行
wait 