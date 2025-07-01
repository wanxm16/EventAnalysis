#!/bin/bash

# 海曙区事件分析系统一键启动脚本
# 使用方法: ./start.sh [选项]
# 选项:
#   --skip-install        跳过依赖安装
#   --backend-only        只启动后端服务
#   --frontend-only       只启动前端服务
#   --dev                 开发模式（详细日志）
#   --prod                生产模式
#   --port-backend PORT   指定后端端口（默认8000）
#   --port-frontend PORT  指定前端端口（默认3000）
#   --help               显示帮助信息

set -e  # 出错时立即退出

# 加载配置文件
load_config() {
    if [ -f "config.env" ]; then
        print_info "加载配置文件: config.env"
        source config.env
    fi
}

# 默认配置
BACKEND_PORT=8000
FRONTEND_PORT=3000
SKIP_INSTALL=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
DEV_MODE=false
PROD_MODE=false

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_debug() {
    if [ "$DEV_MODE" = true ]; then
        echo -e "${PURPLE}🐛 [DEBUG] $1${NC}" >&2
    fi
}

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
    echo -e "${CYAN}🔄 $1${NC}"
}

print_header() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

# 显示帮助信息
show_help() {
    echo "海曙区事件分析系统启动脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --skip-install           跳过依赖安装"
    echo "  --backend-only           只启动后端服务"
    echo "  --frontend-only          只启动前端服务"
    echo "  --dev                    开发模式（详细日志）"
    echo "  --prod                   生产模式"
    echo "  --port-backend PORT      指定后端端口（默认8000）"
    echo "  --port-frontend PORT     指定前端端口（默认3000）"
    echo "  --status                 快速检查服务状态"
    echo "  --help                   显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                       # 启动完整系统"
    echo "  $0 --backend-only        # 只启动后端"
    echo "  $0 --dev --skip-install  # 开发模式，跳过安装"
    echo "  $0 --port-backend 8080   # 使用自定义后端端口"
    exit 0
}

# 快速状态检查
show_quick_status() {
    echo "海曙区事件分析系统 - 服务状态"
    echo "========================================"
    
    # 检查后端状态
    if curl -s --max-time 2 "http://localhost:${BACKEND_PORT:-8000}/docs" > /dev/null 2>&1; then
        print_success "后端服务: 运行中 (http://localhost:${BACKEND_PORT:-8000})"
    else
        print_error "后端服务: 未运行"
    fi
    
    # 检查前端状态  
    if curl -s --max-time 2 "http://localhost:${FRONTEND_PORT:-3000}" > /dev/null 2>&1; then
        print_success "前端服务: 运行中 (http://localhost:${FRONTEND_PORT:-3000})"
    else
        print_error "前端服务: 未运行"
    fi
    
    echo "========================================"
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-install)
                SKIP_INSTALL=true
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
            --dev)
                DEV_MODE=true
                shift
                ;;
            --prod)
                PROD_MODE=true
                shift
                ;;
            --port-backend)
                BACKEND_PORT="$2"
                shift 2
                ;;
            --port-frontend)
                FRONTEND_PORT="$2"
                shift 2
                ;;
            --status)
                show_quick_status
                exit 0
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

# 验证端口号
validate_port() {
    local port=$1
    local service=$2
    if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
        print_error "$service 端口号无效: $port"
        exit 1
    fi
}

# 检查命令是否存在
check_command() {
    local cmd=$1
    local required=${2:-true}
    
    if command -v "$cmd" &> /dev/null; then
        log_debug "$cmd 已安装: $(which $cmd)"
        return 0
    else
        if [ "$required" = true ]; then
            print_error "$cmd 未安装，请先安装 $cmd"
            exit 1
        else
            print_warning "$cmd 未安装"
            return 1
        fi
    fi
}

# 检查Python虚拟环境
check_python_env() {
    if [ -d "backend/venv" ]; then
        print_info "检测到Python虚拟环境，将自动激活"
        return 0
    elif [ -d "venv" ]; then
        print_info "检测到项目根目录虚拟环境，将自动激活"
        return 0
    else
        print_warning "未检测到虚拟环境，建议创建虚拟环境"
        return 1
    fi
}

# 激活Python虚拟环境
activate_python_env() {
    if [ -d "backend/venv" ]; then
        log_debug "激活backend/venv虚拟环境"
        source backend/venv/bin/activate
    elif [ -d "venv" ]; then
        log_debug "激活根目录venv虚拟环境"
        source venv/bin/activate
    fi
}

# 检查端口是否被占用
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 $port 已被占用，尝试停止占用进程..."
        local pid=$(lsof -ti :$port)
        log_debug "端口 $port 被进程 $pid 占用"
        
        # 尝试优雅停止
        if kill -TERM $pid 2>/dev/null; then
            sleep 3
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                # 如果优雅停止失败，强制停止
                kill -9 $pid 2>/dev/null || true
                sleep 2
            fi
        fi
        
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_error "无法释放端口 $port，请手动停止占用进程"
            print_info "可使用命令: lsof -ti :$port | xargs kill -9"
            exit 1
        fi
        print_success "端口 $port 已释放"
    else
        log_debug "端口 $port 可用"
    fi
}

# 健康检查
health_check() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=0
    
    print_step "等待 $service_name 启动..."
    while [ $attempt -lt $max_attempts ]; do
        if curl -s --max-time 2 "$url" > /dev/null 2>&1; then
            print_success "$service_name 启动成功！"
            return 0
        fi
        attempt=$((attempt + 1))
        if [ "$DEV_MODE" = true ]; then
            echo -n "[$attempt/$max_attempts]"
        else
            echo -n "."
        fi
        sleep 1
    done
    
    echo ""
    print_error "$service_name 启动超时"
    return 1
}

# 高级健康检查
advanced_health_check() {
    local service=$1
    local port=$2
    
    case $service in
        "backend")
            # 检查后端API是否正常
            if curl -s "http://localhost:$port/api/filter-options" | grep -q "towns"; then
                print_success "后端API功能正常"
                return 0
            else
                print_warning "后端API响应异常"
                return 1
            fi
            ;;
        "frontend")
            # 检查前端页面是否加载
            if curl -s "http://localhost:$port" | grep -q "海曙区事件分析系统\|React"; then
                print_success "前端页面加载正常"
                return 0
            else
                print_warning "前端页面加载异常"
                return 1
            fi
            ;;
    esac
}

# 安装依赖
install_dependencies() {
    local service=$1
    
    case $service in
        "backend")
            print_step "安装Python依赖..."
            cd backend
            
            # 检查requirements.txt是否存在
            if [ ! -f "requirements.txt" ]; then
                print_error "requirements.txt 文件不存在"
                cd ..
                return 1
            fi
            
            # 检查是否需要安装
            if [ ! -f ".deps_installed" ] || [ "requirements.txt" -nt ".deps_installed" ]; then
                activate_python_env
                pip3 install -r requirements.txt
                if [ $? -eq 0 ]; then
                    touch .deps_installed
                    print_success "Python依赖安装完成"
                else
                    print_error "Python依赖安装失败"
                    cd ..
                    return 1
                fi
            else
                print_info "Python依赖已是最新，跳过安装"
            fi
            cd ..
            ;;
        "frontend")
            print_step "安装前端依赖..."
            cd frontend
            
            # 检查package.json是否存在
            if [ ! -f "package.json" ]; then
                print_error "package.json 文件不存在"
                cd ..
                return 1
            fi
            
            # 选择包管理器
            local pkg_manager=""
            if command -v pnpm &> /dev/null; then
                pkg_manager="pnpm"
            elif command -v yarn &> /dev/null; then
                pkg_manager="yarn"
            else
                pkg_manager="npm"
            fi
            
            log_debug "使用包管理器: $pkg_manager"
            
            # 检查是否需要安装
            if [ ! -f ".deps_installed" ] || [ "package.json" -nt ".deps_installed" ]; then
                $pkg_manager install
                if [ $? -eq 0 ]; then
                    touch .deps_installed
                    print_success "前端依赖安装完成"
                else
                    print_error "前端依赖安装失败"
                    cd ..
                    return 1
                fi
            else
                print_info "前端依赖已是最新，跳过安装"
            fi
            cd ..
            ;;
    esac
}

# 启动后端服务
start_backend() {
    print_step "启动后端服务..."
    cd backend
    
    # 检查必要文件
    if [ ! -f "main.py" ]; then
        print_error "main.py 文件不存在"
        cd ..
        return 1
    fi
    
    # 激活虚拟环境
    activate_python_env
    
    # 设置环境变量
    export PORT=$BACKEND_PORT
    if [ "$DEV_MODE" = true ]; then
        export DEBUG=true
    fi
    
    # 启动服务
    if [ "$DEV_MODE" = true ]; then
        python3 main.py &
    else
        python3 main.py > /dev/null 2>&1 &
    fi
    
    BACKEND_PID=$!
    log_debug "后端进程ID: $BACKEND_PID"
    cd ..
    
    # 健康检查
    if health_check "http://localhost:$BACKEND_PORT/" "后端服务"; then
        if [ "$DEV_MODE" = true ]; then
            advanced_health_check "backend" $BACKEND_PORT
        fi
        return 0
    else
        return 1
    fi
}

# 启动前端服务
start_frontend() {
    print_step "启动前端服务..."
    cd frontend
    
    # 检查必要文件
    if [ ! -f "package.json" ]; then
        print_error "package.json 文件不存在"
        cd ..
        return 1
    fi
    
    # 选择包管理器和启动命令
    local start_cmd=""
    if command -v pnpm &> /dev/null; then
        start_cmd="pnpm start"
    elif command -v yarn &> /dev/null; then
        start_cmd="yarn start"
    else
        start_cmd="npm start"
    fi
    
    # 设置环境变量
    export PORT=$FRONTEND_PORT
    export REACT_APP_API_URL="http://localhost:$BACKEND_PORT"
    
    # 启动服务
    if [ "$DEV_MODE" = true ]; then
        $start_cmd &
    else
        $start_cmd > /dev/null 2>&1 &
    fi
    
    FRONTEND_PID=$!
    log_debug "前端进程ID: $FRONTEND_PID"
    cd ..
    
    # 健康检查
    if health_check "http://localhost:$FRONTEND_PORT" "前端服务"; then
        if [ "$DEV_MODE" = true ]; then
            advanced_health_check "frontend" $FRONTEND_PORT
        fi
        return 0
    else
        return 1
    fi
}

# 清理函数
cleanup() {
    echo ""
    print_step "正在停止所有服务..."
    
    # 停止后端服务
    if [ ! -z "$BACKEND_PID" ] && kill -0 $BACKEND_PID 2>/dev/null; then
        log_debug "停止后端进程: $BACKEND_PID"
        kill -TERM $BACKEND_PID 2>/dev/null || true
        sleep 2
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill -9 $BACKEND_PID 2>/dev/null || true
        fi
        print_success "后端服务已停止"
    fi
    
    # 停止前端服务
    if [ ! -z "$FRONTEND_PID" ] && kill -0 $FRONTEND_PID 2>/dev/null; then
        log_debug "停止前端进程: $FRONTEND_PID"
        kill -TERM $FRONTEND_PID 2>/dev/null || true
        sleep 2
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            kill -9 $FRONTEND_PID 2>/dev/null || true
        fi
        print_success "前端服务已停止"
    fi
    
    # 清理可能残留的进程
    pkill -f "python.*main.py" 2>/dev/null || true
    pkill -f "pnpm.*start" 2>/dev/null || true
    pkill -f "npm.*start" 2>/dev/null || true
    pkill -f "yarn.*start" 2>/dev/null || true
    
    print_success "服务清理完成"
    exit 0
}

# 主函数
main() {
    # 加载配置文件
    load_config
    
    # 解析命令行参数
    parse_args "$@"
    
    # 验证端口
    validate_port $BACKEND_PORT "后端"
    validate_port $FRONTEND_PORT "前端"
    
    # 打印启动信息
    print_header "启动海曙区事件分析系统"
    echo "========================================"
    
    if [ "$DEV_MODE" = true ]; then
        print_info "运行模式: 开发模式"
    elif [ "$PROD_MODE" = true ]; then
        print_info "运行模式: 生产模式"
    fi
    
    if [ "$BACKEND_ONLY" = true ]; then
        print_info "启动模式: 仅后端"
    elif [ "$FRONTEND_ONLY" = true ]; then
        print_info "启动模式: 仅前端"
    else
        print_info "启动模式: 完整系统"
    fi
    
    print_info "后端端口: $BACKEND_PORT"
    print_info "前端端口: $FRONTEND_PORT"
    
    # 检查系统环境
    print_step "检查系统环境..."
    
    if [ "$BACKEND_ONLY" != true ]; then
        check_command node
        # 检查包管理器
        if ! check_command pnpm false; then
            if ! check_command yarn false; then
                check_command npm
            fi
        fi
    fi
    
    if [ "$FRONTEND_ONLY" != true ]; then
        check_command python3
        check_python_env || true  # 不要因为虚拟环境不存在而退出
    fi
    
    print_success "系统环境检查完成"
    
    # 安装依赖
    if [ "$SKIP_INSTALL" = false ]; then
        if [ "$FRONTEND_ONLY" != true ]; then
            install_dependencies "backend" || exit 1
        fi
        
        if [ "$BACKEND_ONLY" != true ]; then
            install_dependencies "frontend" || exit 1
        fi
    else
        print_info "已跳过依赖安装"
    fi
    
    # 检查端口占用
    print_step "检查端口占用..."
    if [ "$FRONTEND_ONLY" != true ]; then
        check_port $BACKEND_PORT "后端服务"
    fi
    
    if [ "$BACKEND_ONLY" != true ]; then
        check_port $FRONTEND_PORT "前端服务"
    fi
    
    # 设置信号处理
    trap cleanup SIGINT SIGTERM
    
    # 启动服务
    if [ "$FRONTEND_ONLY" != true ]; then
        start_backend || {
            print_error "后端服务启动失败"
            cleanup
            exit 1
        }
    fi
    
    if [ "$BACKEND_ONLY" != true ]; then
        start_frontend || {
            print_error "前端服务启动失败"
            cleanup
            exit 1
        }
    fi
    
    # 显示成功信息
    echo ""
    echo "========================================"
    print_success "服务启动完成！"
    echo ""
    print_info "服务地址："
    
    if [ "$FRONTEND_ONLY" != true ]; then
        echo "  🔧 后端API: http://localhost:$BACKEND_PORT"
        echo "  📚 API文档: http://localhost:$BACKEND_PORT/docs"
    fi
    
    if [ "$BACKEND_ONLY" != true ]; then
        echo "  🌐 前端界面: http://localhost:$FRONTEND_PORT"
    fi
    
    echo ""
    print_warning "按 Ctrl+C 停止所有服务"
    echo "========================================"
    
    # 保持脚本运行
    wait
}

# 运行主函数
main "$@" 