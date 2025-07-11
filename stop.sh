#!/bin/bash

# 海曙区事件分析系统停止脚本
# 使用方法: ./stop.sh [选项]
# 选项:
#   --force              强制停止（跳过优雅停机）
#   --backend-only       只停止后端服务
#   --frontend-only      只停止前端服务
#   --clean              清理临时文件和缓存
#   --status             显示服务状态
#   --logs               显示最近日志
#   --help              显示帮助信息

set -e  # 出错时立即退出

# 默认配置
FORCE_STOP=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
CLEAN_FILES=false
SHOW_STATUS=false
SHOW_LOGS=false

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

print_progress() {
    echo -e "${YELLOW}⏳ $1${NC}"
}

# 显示帮助信息
show_help() {
    echo "海曙区事件分析系统停止脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --force              强制停止（跳过优雅停机）"
    echo "  --backend-only       只停止后端服务"
    echo "  --frontend-only      只停止前端服务"
    echo "  --clean              清理临时文件和缓存"
    echo "  --status             显示服务状态"
    echo "  --logs               显示最近日志"
    echo "  --help               显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                   # 停止所有服务"
    echo "  $0 --backend-only    # 只停止后端"
    echo "  $0 --force --clean   # 强制停止并清理文件"
    echo "  $0 --status          # 只显示服务状态"
    echo "  $0 --logs            # 显示服务日志"
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
            --logs)
                SHOW_LOGS=true
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

# 检查虚拟环境
detect_virtual_env() {
    local venv_path=""
    local venv_info=""
    
    if [ -d "venv" ]; then
        venv_path="venv"
        venv_info="项目虚拟环境"
    elif [ -d "backend/venv" ]; then
        venv_path="backend/venv"
        venv_info="后端虚拟环境"
    fi
    
    if [ -n "$venv_path" ]; then
        print_info "发现虚拟环境: $venv_info ($venv_path)"
        echo "$venv_path"
    else
        print_info "未检测到虚拟环境"
        echo ""
    fi
}

# 改进的进程检测
find_backend_processes() {
    local processes=""
    local venv_path=$(detect_virtual_env)
    
    # 查找Python main.py进程
    if [ -n "$venv_path" ]; then
        # 查找运行在特定虚拟环境中的进程
        processes=$(ps aux | grep -E "python.*main\.py" | grep -v grep | awk '{print $2}' || true)
    else
        # 查找所有Python main.py进程
        processes=$(pgrep -f "python.*main\.py" 2>/dev/null || true)
    fi
    
    echo "$processes"
}

# 查找前端进程
find_frontend_processes() {
    local pnpm_pids=$(pgrep -f "pnpm.*start" 2>/dev/null || true)
    local npm_pids=$(pgrep -f "npm.*start" 2>/dev/null || true)
    local yarn_pids=$(pgrep -f "yarn.*start" 2>/dev/null || true)
    local node_pids=$(pgrep -f "node.*react-scripts" 2>/dev/null || true)
    local webpack_pids=$(pgrep -f "webpack.*serve" 2>/dev/null || true)
    
    # 合并所有进程ID并去重
    local all_pids="$pnpm_pids $npm_pids $yarn_pids $node_pids $webpack_pids"
    echo $all_pids | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/[[:space:]]*$//'
}

# 检查进程详细信息
get_process_info() {
    local pid=$1
    if kill -0 $pid 2>/dev/null; then
        local cmd=$(ps -p $pid -o comm= 2>/dev/null || echo "unknown")
        local args=$(ps -p $pid -o args= 2>/dev/null | cut -c1-50 || echo "unknown")
        local cpu=$(ps -p $pid -o %cpu= 2>/dev/null || echo "0")
        local mem=$(ps -p $pid -o %mem= 2>/dev/null || echo "0")
        printf "%-8s %-15s %-8s %-8s %s\n" "$pid" "$cmd" "${cpu}%" "${mem}%" "$args"
        return 0
    else
        return 1
    fi
}

# 检查服务状态
check_service_status() {
    local service=$1
    local port=$2
    local process_finder=$3
    
    local status="停止"
    local pids=""
    local port_status="未占用"
    local process_count=0
    
    # 查找进程
    case $process_finder in
        "backend")
            pids=$(find_backend_processes)
            ;;
        "frontend")
            pids=$(find_frontend_processes)
            ;;
    esac
    
    if [ -n "$pids" ] && [ "$pids" != " " ]; then
        process_count=$(echo "$pids" | wc -w)
        status="运行中"
    fi
    
    # 检查端口是否被占用
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        port_status="已占用"
        if [ -z "$pids" ]; then
            local port_pid=$(lsof -ti :$port | head -1)
            pids="$port_pid"
            process_count=1
        fi
    fi
    
    printf "%-12s %-8s %-8s %-8s %-8s %s\n" "$service" "$status" "$port" "$port_status" "$process_count" "$pids"
}

# 显示进程详细信息
show_process_details() {
    local service=$1
    local pids=$2
    
    if [ -n "$pids" ] && [ "$pids" != " " ]; then
        echo ""
        print_info "$service 进程详情:"
        printf "%-8s %-15s %-8s %-8s %s\n" "PID" "命令" "CPU%" "内存%" "参数"
        echo "================================================================"
        for pid in $pids; do
            get_process_info $pid || echo "$pid - 进程已退出"
        done
    fi
}

# 显示所有服务状态
show_service_status() {
    print_info "服务状态检查："
    echo ""
    printf "%-12s %-8s %-8s %-8s %-8s %s\n" "服务" "状态" "端口" "端口状态" "进程数" "进程ID"
    echo "========================================================================"
    
    check_service_status "后端服务" "8000" "backend"
    check_service_status "前端服务" "3000" "frontend"
    
    # 显示详细进程信息
    if [ "$SHOW_STATUS" = true ]; then
        local backend_pids=$(find_backend_processes)
        local frontend_pids=$(find_frontend_processes)
        
        show_process_details "后端服务" "$backend_pids"
        show_process_details "前端服务" "$frontend_pids"
    fi
    
    echo ""
}

# 显示日志
show_service_logs() {
    print_header "显示服务日志"
    echo "========================================"
    
    # 显示后端日志
    if [ -f "backend/backend.log" ]; then
        print_info "后端服务日志 (最近20行):"
        echo "----------------------------------------"
        tail -20 backend/backend.log
        echo ""
    else
        print_warning "未找到后端日志文件"
    fi
    
    # 显示前端日志
    if [ -f "frontend/frontend.log" ]; then
        print_info "前端服务日志 (最近20行):"
        echo "----------------------------------------"
        tail -20 frontend/frontend.log
        echo ""
    else
        print_warning "未找到前端日志文件"
    fi
    
    echo "========================================"
}

# 优雅停止进程
graceful_stop() {
    local pids=$1
    local service_name=$2
    local timeout=${3:-10}
    
    if [ -z "$pids" ] || [ "$pids" = " " ]; then
        print_info "$service_name 没有运行中的进程"
        return 0
    fi
    
    print_step "优雅停止 $service_name (进程: $pids)..."
    
    # 发送TERM信号
    for pid in $pids; do
        if kill -0 $pid 2>/dev/null; then
            print_info "发送TERM信号到进程 $pid"
            kill -TERM $pid 2>/dev/null || true
        fi
    done
    
    # 等待进程退出，显示进度
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
        
        # 显示等待进度
        printf "\r⏳ 等待进程退出... [%d/%d] 剩余进程: %s" $count $timeout "$running_pids"
        sleep 1
        count=$((count + 1))
    done
    
    echo ""
    print_warning "$service_name 优雅停止超时，将强制终止"
    
    # 强制停止
    for pid in $pids; do
        if kill -0 $pid 2>/dev/null; then
            print_info "强制终止进程 $pid"
            kill -9 $pid 2>/dev/null || true
        fi
    done
    
    sleep 2
    print_success "$service_name 已强制停止"
}

# 强制停止进程
force_stop() {
    local pids=$1
    local service_name=$2
    
    if [ -z "$pids" ] || [ "$pids" = " " ]; then
        print_info "$service_name 没有运行中的进程"
        return 0
    fi
    
    print_step "强制停止 $service_name (进程: $pids)..."
    
    for pid in $pids; do
        if kill -0 $pid 2>/dev/null; then
            print_info "强制终止进程 $pid"
            kill -9 $pid 2>/dev/null || true
        fi
    done
    
    sleep 2
    print_success "$service_name 已强制停止"
}

# 停止后端服务
stop_backend() {
    print_step "检查后端服务..."
    
    local pids=$(find_backend_processes)
    
    if [ -z "$pids" ] || [ "$pids" = " " ]; then
        print_info "未找到运行中的后端服务"
        return 0
    fi
    
    print_info "发现后端进程: $pids"
    
    if [ "$FORCE_STOP" = true ]; then
        force_stop "$pids" "后端服务"
    else
        graceful_stop "$pids" "后端服务" 15
    fi
}

# 停止前端服务
stop_frontend() {
    print_step "检查前端服务..."
    
    local pids=$(find_frontend_processes)
    
    if [ -z "$pids" ] || [ "$pids" = " " ]; then
        print_info "未找到运行中的前端服务"
        return 0
    fi
    
    print_info "发现前端进程: $pids"
    
    if [ "$FORCE_STOP" = true ]; then
        force_stop "$pids" "前端服务"
    else
        graceful_stop "$pids" "前端服务" 20
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
            print_info "端口 $port 被进程占用: $pids"
            
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
        else
            print_info "端口 $port 未被占用"
        fi
    done
}

# 改进的临时文件清理
clean_temp_files() {
    print_step "清理临时文件和缓存..."
    
    local cleaned=false
    local cleaned_items=()
    
    # 清理后端临时文件
    if [ -d "backend" ]; then
        cd backend
        
        # Python缓存
        if [ -d "__pycache__" ]; then
            rm -rf __pycache__
            cleaned_items+=("Python __pycache__")
            cleaned=true
        fi
        
        # Python字节码文件
        local pyc_files=$(find . -name "*.pyc" 2>/dev/null)
        if [ -n "$pyc_files" ]; then
            find . -name "*.pyc" -delete
            cleaned_items+=("Python字节码文件")
            cleaned=true
        fi
        
        # 日志文件
        if [ -f "backend.log" ]; then
            rm -f backend.log
            cleaned_items+=("后端日志文件")
            cleaned=true
        fi
        
        cd ..
    fi
    
    # 清理前端临时文件
    if [ -d "frontend" ]; then
        cd frontend
        
        # React构建文件
        if [ -d "build" ]; then
            rm -rf build
            cleaned_items+=("React构建文件")
            cleaned=true
        fi
        
        # Next.js缓存
        if [ -d ".next" ]; then
            rm -rf .next
            cleaned_items+=("Next.js缓存")
            cleaned=true
        fi
        
        # 前端日志
        if [ -f "frontend.log" ]; then
            rm -f frontend.log
            cleaned_items+=("前端日志文件")
            cleaned=true
        fi
        
        cd ..
    fi
    
    # 清理项目根目录日志
    local log_files=$(find . -maxdepth 1 -name "*.log" 2>/dev/null)
    if [ -n "$log_files" ]; then
        rm -f *.log
        cleaned_items+=("项目日志文件")
        cleaned=true
    fi
    
    # 清理临时测试文件
    if [ -f "test_*.tmp" ]; then
        rm -f test_*.tmp
        cleaned_items+=("临时测试文件")
        cleaned=true
    fi
    
    if [ "$cleaned" = true ]; then
        print_success "已清理: ${cleaned_items[*]}"
    else
        print_info "没有找到需要清理的临时文件"
    fi
}

# 验证停止结果
verify_stop() {
    print_step "验证停止结果..."
    
    local backend_running=false
    local frontend_running=false
    local issues=()
    
    # 检查后端
    if [ "$FRONTEND_ONLY" != true ]; then
        local backend_pids=$(find_backend_processes)
        if [ -n "$backend_pids" ] && [ "$backend_pids" != " " ]; then
            backend_running=true
            issues+=("后端服务仍在运行 (PID: $backend_pids)")
        fi
    fi
    
    # 检查前端
    if [ "$BACKEND_ONLY" != true ]; then
        local frontend_pids=$(find_frontend_processes)
        if [ -n "$frontend_pids" ] && [ "$frontend_pids" != " " ]; then
            frontend_running=true
            issues+=("前端服务仍在运行 (PID: $frontend_pids)")
        fi
    fi
    
    # 检查端口占用
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        issues+=("端口8000仍被占用")
    fi
    
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        issues+=("端口3000仍被占用")
    fi
    
    if [ ${#issues[@]} -eq 0 ]; then
        print_success "所有服务已成功停止"
        return 0
    else
        print_warning "发现以下问题:"
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
        return 1
    fi
}

# 主函数
main() {
    # 解析命令行参数
    parse_args "$@"
    
    # 如果只是显示日志
    if [ "$SHOW_LOGS" = true ]; then
        show_service_logs
        exit 0
    fi
    
    # 如果只是显示状态
    if [ "$SHOW_STATUS" = true ]; then
        show_service_status
        exit 0
    fi
    
    # 打印停止信息
    print_header "停止海曙区事件分析系统"
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
    
    # 检测虚拟环境
    detect_virtual_env > /dev/null
    
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
    echo ""
    print_info "最终状态："
    show_service_status
}

# 运行主函数
main "$@" 