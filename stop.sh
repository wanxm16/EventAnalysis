#!/bin/bash

# 事件查询系统停止脚本

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "🛑 停止事件查询系统..."
echo "========================================"

print_step "停止所有相关进程..."

# 停止Python后端服务
if pkill -f "python.*main.py" 2>/dev/null; then
    print_success "Python后端服务已停止"
else
    print_warning "未找到运行中的Python后端服务"
fi

# 停止前端服务
if pkill -f "pnpm.*start" 2>/dev/null; then
    print_success "前端服务已停止"
else
    print_warning "未找到运行中的前端服务"
fi

# 也尝试停止npm start（以防使用了npm而不是pnpm）
pkill -f "npm.*start" 2>/dev/null || true

# 清理端口占用（如果有残留进程）
print_step "检查端口清理..."

# 检查8000端口
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_step "清理8000端口占用..."
    lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    sleep 1
    if ! lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_success "8000端口已清理"
    fi
fi

# 检查3000端口
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_step "清理3000端口占用..."
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    sleep 1
    if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_success "3000端口已清理"
    fi
fi

echo "========================================"
print_success "所有服务已停止！" 