#!/bin/bash

# 事件查询系统停止脚本
# 使用方法: ./stop.sh [选项]
# 选项:
#   --force              强制停止（跳过优雅停机）
#   --backend-only       只停止后端服务
#   --frontend-only      只停止前端服务
#   --clean              清理临时文件和缓存
#   --status             显示服务状态
#   --help              显示帮助信息

set -e  # 出错时立即退出

# 默认配置
FORCE_STOP=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
CLEAN_FILES=false
SHOW_STATUS=false

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_step() {
    echo -e "${CYAN}🔄 $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${PURPLE}🛑 $1${NC}"
}

# 显示帮助信息
show_help() {
    echo "事件查询系统停止脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --force              强制停止（跳过优雅停机）"
    echo "  --backend-only       只停止后端服务"
    echo "  --frontend-only      只停止前端服务"
    echo "  --clean              清理临时文件和缓存"
    echo "  --status             显示服务状态"
    echo "  --help               显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                   # 停止所有服务"
    echo "  $0 --backend-only    # 只停止后端"
    echo "  $0 --force --clean   # 强制停止并清理文件"
    echo "  $0 --status          # 只显示服务状态"
    exit 0
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE_STOP=true
                shift
                ;;
            --backend-only)
                BACKEND_ONLY=true
                shift
                ;;
            --frontend-only)
                FRONTEND_ONLY=true
                shift
                ;;
            --clean)
                CLEAN_FILES=true
                shift
                ;;
            --status)
                SHOW_STATUS=true
                shift
                ;;
            --help)
                show_help
                ;;
            *)
                print_error "未知选项: $1"
                echo "使用 --help 查看帮助信息"
                exit 1
                ;;
        esac
    done
}

# 检查服务状态
check_service_status() {
    local service=$1
    local port=$2
    local process_pattern=$3
    
    local status="停止"
    local pid=""
    local port_status="未占用"
    
    # 检查进程是否存在
    if pgrep -f "$process_pattern" > /dev/null 2>&1; then
        pid=$(pgrep -f "$process_pattern" | head -1)
        status="运行中"
    fi
    
    # 检查端口是否被占用
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        port_status="已占用"
        if [ -z "$pid" ]; then
            pid=$(lsof -ti :$port | head -1)
        fi
    fi
    
    printf "%-12s %-8s %-8s %-8s %-10s\n" "$service" "$status" "$port" "$port_status" "$pid"
}

# 显示所有服务状态
show_service_status() {
    print_info "服务状态检查："
    echo ""
    printf "%-12s %-8s %-8s %-8s %-10s\n" "服务" "状态" "端口" "端口状态" "进程ID"
    echo "=================================================="
    
    check_service_status "后端服务" "8000" "python.*main.py"
    check_service_status "前端服务" "3000" "pnpm.*start|npm.*start|yarn.*start"
    
    echo ""
}

# 优雅停止进程
graceful_stop() {
    local pids=$1
    local service_name=$2
    local timeout=${3:-10}
    
    if [ -z "$pids" ]; then
        return 0
    fi
    
    print_step "优雅停止 $service_name..."
    
    # 发送TERM信号
    for pid in $pids; do
        if kill -0 $pid 2>/dev/null; then
            kill -TERM $pid 2>/dev/null || true
        fi
    done
    
    # 等待进程退出
    local count=0
    while [ $count -lt $timeout ]; do
        local running_pids=""
        for pid in $pids; do
            if kill -0 $pid 2>/dev/null; then
                running_pids="$running_pids $pid"
            fi
        done
        
        if [ -z "$running_pids" ]; then
            print_success "$service_name 已优雅停止"
            return 0
        fi
        
        echo -n "."
        sleep 1
        count=$((count + 1))
    done
    
    echo ""
    print_warning "$service_name 优雅停止超时，将强制终止"
    
    # 强制停止
    for pid in $pids; do
        if kill -0 $pid 2>/dev/null; then
            kill -9 $pid 2>/dev/null || true
        fi
    done
    
    sleep 1
    print_success "$service_name 已强制停止"
}

# 强制停止进程
force_stop() {
    local pids=$1
    local service_name=$2
    
    if [ -z "$pids" ]; then
        return 0
    fi
    
    print_step "强制停止 $service_name..."
    
    for pid in $pids; do
        if kill -0 $pid 2>/dev/null; then
            kill -9 $pid 2>/dev/null || true
        fi
    done
    
    sleep 1
    print_success "$service_name 已强制停止"
}

# 停止后端服务
stop_backend() {
    print_step "检查后端服务..."
    
    # 查找所有后端进程
    local pids=$(pgrep -f "python.*main.py" 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        print_info "未找到运行中的后端服务"
        return 0
    fi
    
    print_info "发现后端进程: $pids"
    
    if [ "$FORCE_STOP" = true ]; then
        force_stop "$pids" "后端服务"
    else
        graceful_stop "$pids" "后端服务" 10
    fi
}

# 停止前端服务
stop_frontend() {
    print_step "检查前端服务..."
    
    # 查找所有前端进程
    local pnpm_pids=$(pgrep -f "pnpm.*start" 2>/dev/null || true)
    local npm_pids=$(pgrep -f "npm.*start" 2>/dev/null || true)
    local yarn_pids=$(pgrep -f "yarn.*start" 2>/dev/null || true)
    local all_pids="$pnpm_pids $npm_pids $yarn_pids"
    
    # 去除空格和重复
    all_pids=$(echo $all_pids | tr ' ' '\n' | sort -u | tr '\n' ' ')
    
    if [ -z "$all_pids" ] || [ "$all_pids" = " " ]; then
        print_info "未找到运行中的前端服务"
        return 0
    fi
    
    print_info "发现前端进程: $all_pids"
    
    if [ "$FORCE_STOP" = true ]; then
        force_stop "$all_pids" "前端服务"
    else
        graceful_stop "$all_pids" "前端服务" 15
    fi
}

# 清理端口占用
clean_ports() {
    local ports="8000 3000"
    
    print_step "检查端口清理..."
    
    for port in $ports; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_step "清理端口 $port 占用..."
            local pids=$(lsof -ti :$port)
            
            if [ "$FORCE_STOP" = true ]; then
                echo $pids | xargs kill -9 2>/dev/null || true
            else
                # 先尝试优雅停止
                echo $pids | xargs kill -TERM 2>/dev/null || true
                sleep 3
                if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                    echo $pids | xargs kill -9 2>/dev/null || true
                fi
            fi
            
            sleep 1
            if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                print_success "端口 $port 已清理"
            else
                print_warning "端口 $port 清理失败"
            fi
        fi
    done
}

# 清理临时文件
clean_temp_files() {
    print_step "清理临时文件..."
    
    local cleaned=false
    
    # 清理后端临时文件
    if [ -d "backend" ]; then
        cd backend
        if [ -f "__pycache__" ] || [ -d "__pycache__" ]; then
            rm -rf __pycache__
            print_info "已清理后端Python缓存"
            cleaned=true
        fi
        if [ -f "*.pyc" ]; then
            rm -f *.pyc
            print_info "已清理Python字节码文件"
            cleaned=true
        fi
        cd ..
    fi
    
    # 清理前端临时文件
    if [ -d "frontend" ]; then
        cd frontend
        if [ -d ".next" ]; then
            rm -rf .next
            print_info "已清理Next.js缓存"
            cleaned=true
        fi
        if [ -d "build" ]; then
            rm -rf build
            print_info "已清理React构建文件"
            cleaned=true
        fi
        cd ..
    fi
    
    # 清理日志文件
    if [ -f "*.log" ]; then
        rm -f *.log
        print_info "已清理日志文件"
        cleaned=true
    fi
    
    if [ "$cleaned" = false ]; then
        print_info "没有找到需要清理的临时文件"
    else
        print_success "临时文件清理完成"
    fi
}

# 验证停止结果
verify_stop() {
    print_step "验证停止结果..."
    
    local backend_running=false
    local frontend_running=false
    
    # 检查后端
    if [ "$FRONTEND_ONLY" != true ]; then
        if pgrep -f "python.*main.py" > /dev/null 2>&1; then
            backend_running=true
            print_warning "后端服务仍在运行"
        fi
    fi
    
    # 检查前端
    if [ "$BACKEND_ONLY" != true ]; then
        if pgrep -f "pnpm.*start|npm.*start|yarn.*start" > /dev/null 2>&1; then
            frontend_running=true
            print_warning "前端服务仍在运行"
        fi
    fi
    
    if [ "$backend_running" = false ] && [ "$frontend_running" = false ]; then
        print_success "所有服务已成功停止"
        return 0
    else
        print_error "部分服务停止失败"
        return 1
    fi
}

# 主函数
main() {
    # 解析命令行参数
    parse_args "$@"
    
    # 如果只是显示状态
    if [ "$SHOW_STATUS" = true ]; then
        show_service_status
        exit 0
    fi
    
    # 打印停止信息
    print_header "停止事件查询系统"
    echo "========================================"
    
    if [ "$FORCE_STOP" = true ]; then
        print_warning "使用强制停止模式"
    fi
    
    if [ "$BACKEND_ONLY" = true ]; then
        print_info "停止模式: 仅后端"
    elif [ "$FRONTEND_ONLY" = true ]; then
        print_info "停止模式: 仅前端"
    else
        print_info "停止模式: 所有服务"
    fi
    
    # 显示当前状态
    show_service_status
    
    # 停止服务
    if [ "$FRONTEND_ONLY" != true ]; then
        stop_backend
    fi
    
    if [ "$BACKEND_ONLY" != true ]; then
        stop_frontend
    fi
    
    # 清理端口占用
    clean_ports
    
    # 清理临时文件
    if [ "$CLEAN_FILES" = true ]; then
        clean_temp_files
    fi
    
    # 验证停止结果
    verify_stop
    
    echo "========================================"
    print_success "系统停止完成！"
    
    # 最终状态检查
    if [ "$SHOW_STATUS" != false ]; then
        echo ""
        print_info "最终状态："
        show_service_status
    fi
}

# 运行主函数
main "$@" 