#!/bin/bash

# 海曙区社会治理中心事件分析系统一键启动脚本
# 使用方法: ./start.sh [选项]
# 选项:
#   --skip-install        跳过依赖安装
#   --backend-only        只启动后端服务
#   --frontend-only       只启动前端服务
#   --dev                 开发模式（详细日志）
#   --prod                生产模式
#   --port-backend PORT   指定后端端口（默认8000）
#   --port-frontend PORT  指定前端端口（默认3000）
#   # 已移除AI/向量相关选项
#   --no-browser          不自动打开浏览器
#   --help               显示帮助信息

set -e  # 出错时立即退出

# 加载配置文件
load_config() {
    if [ -f "config.env" ]; then
        print_info "加载配置文件: config.env"
        source config.env
    fi
    
    # 已移除: AI配置文件加载
}

# 默认配置
BACKEND_PORT=8000
FRONTEND_PORT=3000
SKIP_INSTALL=false
BACKEND_ONLY=false
FRONTEND_ONLY=false
DEV_MODE=false
PROD_MODE=false
INIT_VECTOR=false
NO_BROWSER=false

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

print_progress() {
    echo -e "${YELLOW}⏳ $1${NC}"
}

# 显示帮助信息
show_help() {
    echo "海曙区社会治理中心事件分析系统启动脚本"
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
    # 已移除AI/向量相关选项
    echo "  --no-browser             不自动打开浏览器"
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
    echo "海曙区社会治理中心事件分析系统 - 服务状态"
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
            # 已移除AI/向量相关参数
            --no-browser)
                NO_BROWSER=true
                shift
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

# 改进的虚拟环境检查和创建
setup_python_env() {
    print_step "检查Python虚拟环境..."
    
    # 检查项目根目录的虚拟环境
    if [ -d "venv" ]; then
        print_success "发现项目虚拟环境: venv/"
        VENV_PATH="venv"
        return 0
    fi
    
    # 检查backend目录的虚拟环境
    if [ -d "backend/venv" ]; then
        print_info "发现后端虚拟环境: backend/venv/"
        VENV_PATH="backend/venv"
        return 0
    fi
    
    # 如果没有虚拟环境，提示创建
    print_warning "未检测到Python虚拟环境"
    print_info "建议创建虚拟环境以确保依赖隔离"
    
    # 询问是否创建虚拟环境
    if [ "$PROD_MODE" = true ]; then
        # 生产模式自动创建
        create_virtual_env
    else
        print_info "是否创建虚拟环境？(推荐) [Y/n]"
        read -r response
        if [[ "$response" =~ ^[Nn]$ ]]; then
            print_warning "跳过虚拟环境创建，使用系统Python环境"
            VENV_PATH=""
        else
            create_virtual_env
        fi
    fi
}

# 创建虚拟环境
create_virtual_env() {
    print_step "创建Python虚拟环境..."
    
    # 在项目根目录创建虚拟环境
    if python3 -m venv venv; then
        print_success "虚拟环境创建成功: venv/"
        VENV_PATH="venv"
    else
        print_error "虚拟环境创建失败"
        exit 1
    fi
}

# 激活Python虚拟环境
activate_python_env() {
    if [ -n "$VENV_PATH" ] && [ -d "$VENV_PATH" ]; then
        log_debug "激活虚拟环境: $VENV_PATH"
        source "$VENV_PATH/bin/activate"
        
        # 验证虚拟环境是否激活成功
        if [ -n "$VIRTUAL_ENV" ]; then
            print_success "虚拟环境已激活: $VIRTUAL_ENV"
            log_debug "Python路径: $(which python3)"
            log_debug "pip路径: $(which pip)"
        else
            print_error "虚拟环境激活失败"
            exit 1
        fi
    else
        print_warning "使用系统Python环境"
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

# 改进的健康检查
health_check() {
    local url=$1
    local service_name=$2
    local max_attempts=60  # 增加到60秒
    local attempt=0
    
    print_progress "等待 $service_name 启动中..."
    
    # 显示进度条
    while [ $attempt -lt $max_attempts ]; do
        if curl -s --max-time 3 "$url" > /dev/null 2>&1; then
            echo ""  # 换行
            print_success "$service_name 启动成功！"
            return 0
        fi
        
        attempt=$((attempt + 1))
        
        # 更好的进度显示
        if [ "$DEV_MODE" = true ]; then
            printf "\r⏳ [$attempt/$max_attempts] 等待 $service_name 响应..."
        else
            # 显示旋转符号
            case $((attempt % 4)) in
                0) printf "\r⏳ 启动中 |" ;;
                1) printf "\r⏳ 启动中 /" ;;
                2) printf "\r⏳ 启动中 -" ;;
                3) printf "\r⏳ 启动中 \\" ;;
            esac
        fi
        
        sleep 1
    done
    
    echo ""
    print_error "$service_name 启动超时 (${max_attempts}秒)"
    return 1
}

# 高级健康检查
advanced_health_check() {
    local service=$1
    local port=$2
    
    case $service in
        "backend")
            print_step "检查后端API功能..."
            
            # 检查基础API端点
            if curl -s --max-time 5 "http://localhost:$port/docs" | grep -q "FastAPI\|OpenAPI"; then
                print_success "✓ API文档可访问"
            else
                print_warning "✗ API文档访问异常"
                return 1
            fi
            
            # 检查核心API端点
            if curl -s --max-time 5 "http://localhost:$port/api/filter-options" | grep -q "towns"; then
                print_success "✓ 数据API功能正常"
            else
                print_warning "✗ 数据API响应异常"
                return 1
            fi
            
            # 已移除: AI聊天API检查
            
            print_success "后端服务功能检查完成"
            return 0
            ;;
        "frontend")
            print_step "检查前端页面..."
            
            # 检查首页加载
            if curl -s --max-time 5 "http://localhost:$port" | grep -q "海曙区社会治理中心事件分析系统\|React"; then
                print_success "✓ 前端页面加载正常"
                return 0
            else
                print_warning "✗ 前端页面加载异常"
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
            
            # 激活虚拟环境
            if [ -n "$VENV_PATH" ]; then
                source "../$VENV_PATH/bin/activate"
                log_debug "后端依赖安装使用虚拟环境: $VIRTUAL_ENV"
            fi
            
            # 检查关键依赖是否已安装
            local key_deps=("fastapi" "uvicorn" "pandas" "pydantic" "dateutil" "openpyxl")
            local missing_deps=()
            
            for dep in "${key_deps[@]}"; do
                if ! python3 -c "import $dep" 2>/dev/null; then
                    missing_deps+=("$dep")
                fi
            done
            
            # 检查是否需要安装
            if [ ${#missing_deps[@]} -gt 0 ] || [ ! -f ".deps_installed" ] || [ "requirements.txt" -nt ".deps_installed" ]; then
                if [ ${#missing_deps[@]} -gt 0 ]; then
                    print_warning "发现缺失的依赖: ${missing_deps[*]}"
                fi
                
                print_progress "正在安装Python依赖包..."
                
                # 配置清华镜像站
                print_info "使用清华大学镜像站加速安装"
                pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple/
                pip config set global.trusted-host pypi.tuna.tsinghua.edu.cn
                
                # 升级pip
                pip install --upgrade pip
                
                # 安装依赖
                if pip install -r requirements.txt; then
                    touch .deps_installed
                    print_success "Python依赖安装完成"
                else
                    print_error "Python依赖安装失败"
                    # 显示详细错误信息
                    print_info "尝试逐个安装依赖以定位问题..."
                    while read -r requirement; do
                        if [ -n "$requirement" ] && [ "${requirement:0:1}" != "#" ]; then
                            print_info "安装: $requirement"
                            pip install "$requirement" || print_warning "安装失败: $requirement"
                        fi
                    done < requirements.txt
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
            
            # 检查node_modules是否存在
            local needs_install=false
            local ORIGINAL_REGISTRY=""
            if [ ! -d "node_modules" ] || [ ! -f ".deps_installed" ] || [ "package.json" -nt ".deps_installed" ]; then
                needs_install=true
            fi
            
            if [ "$needs_install" = true ]; then
                print_progress "正在安装前端依赖包 (使用 $pkg_manager)..."
                
                # 配置国内镜像站
                case $pkg_manager in
                    "pnpm")
                        print_info "配置pnpm使用淘宝镜像"
                        ORIGINAL_REGISTRY=$(pnpm config get registry 2>/dev/null || echo "")
                        pnpm config set registry https://registry.npmmirror.com/
                        ;;
                    "yarn")
                        print_info "配置yarn使用淘宝镜像"
                        ORIGINAL_REGISTRY=$(yarn config get registry 2>/dev/null || echo "")
                        yarn config set registry https://registry.npmmirror.com/
                        ;;
                    "npm")
                        print_info "配置npm使用淘宝镜像"
                        ORIGINAL_REGISTRY=$(npm config get registry 2>/dev/null || echo "")
                        npm config set registry https://registry.npmmirror.com/
                        ;;
                esac

                if $pkg_manager install; then
                    touch .deps_installed
                    print_success "前端依赖安装完成"
                else
                    print_warning "前端依赖安装失败，尝试使用官方源重新安装"

                    case $pkg_manager in
                        "pnpm")
                            pnpm config set registry https://registry.npmjs.org/
                            ;;
                        "yarn")
                            yarn config set registry https://registry.yarnpkg.com/
                            ;;
                        "npm")
                            npm config set registry https://registry.npmjs.org/
                            ;;
                    esac

                    if $pkg_manager install; then
                        touch .deps_installed
                        print_success "前端依赖安装完成"
                    else
                        print_error "前端依赖安装失败"
                        cd ..
                        return 1
                    fi
                fi

                # 还原 registry 配置，避免影响开发者全局配置
                if [ -n "$ORIGINAL_REGISTRY" ]; then
                    case $pkg_manager in
                        "pnpm")
                            pnpm config set registry "$ORIGINAL_REGISTRY" >/dev/null 2>&1 || true
                            ;;
                        "yarn")
                            yarn config set registry "$ORIGINAL_REGISTRY" >/dev/null 2>&1 || true
                            ;;
                        "npm")
                            npm config set registry "$ORIGINAL_REGISTRY" >/dev/null 2>&1 || true
                            ;;
                    esac
                fi

                # 清理临时变量，避免后续步骤误用
                unset ORIGINAL_REGISTRY
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
    if [ -n "$VENV_PATH" ]; then
        source "../$VENV_PATH/bin/activate"
        print_info "后端服务将在虚拟环境中运行: $VIRTUAL_ENV"
    else
        print_warning "后端服务将在系统Python环境中运行"
    fi
    
    # 设置环境变量
    export PORT=$BACKEND_PORT
    if [ "$DEV_MODE" = true ]; then
        export DEBUG=true
    fi
    
    # 已移除: AI配置环境变量导出
    
    # 启动服务并捕获输出
    print_progress "正在启动后端服务 (端口: $BACKEND_PORT)..."
    
    if [ "$DEV_MODE" = true ]; then
        # 开发模式显示详细输出
        python3 main.py &
        BACKEND_PID=$!
    else
        # 生产模式重定向输出但保留错误信息
        python3 main.py > backend.log 2>&1 &
        BACKEND_PID=$!
    fi
    
    log_debug "后端进程ID: $BACKEND_PID"
    cd ..
    
    # 等待一下让进程启动
    sleep 2
    
    # 检查进程是否还在运行
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "后端进程启动后立即退出，请检查日志"
        if [ -f "backend/backend.log" ]; then
            print_info "错误日志:"
            tail -10 backend/backend.log
        fi
        return 1
    fi
    
    # 健康检查
    if health_check "http://localhost:$BACKEND_PORT/" "后端服务"; then
        if [ "$DEV_MODE" = true ]; then
            advanced_health_check "backend" $BACKEND_PORT
        fi
        return 0
    else
        # 如果健康检查失败，显示日志
        if [ -f "backend/backend.log" ]; then
            print_error "后端启动失败，最近日志:"
            tail -20 backend/backend.log
        fi
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
    export BROWSER=none  # 禁用 React 自动打开浏览器

    # 启动服务
    print_progress "正在启动前端服务 (端口: $FRONTEND_PORT)..."
    
    if [ "$DEV_MODE" = true ]; then
        $start_cmd &
    else
        $start_cmd > frontend.log 2>&1 &
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
        # 如果健康检查失败，显示日志
        if [ -f "frontend/frontend.log" ]; then
            print_error "前端启动失败，最近日志:"
            tail -20 frontend/frontend.log
        fi
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
    
    # 删除服务运行标志文件
    rm -f .service_status
    
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
    print_header "启动海曙区社会治理中心事件分析系统"
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
        setup_python_env  # 改进的虚拟环境设置
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
    
    # 已移除: 向量数据库初始化
    
    # 设置信号处理
    trap cleanup SIGINT SIGTERM
    
    # 创建服务运行标志文件
    echo "running" > .service_status
    
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
        # 已移除: AI聊天健康检查链接
    fi
    
    if [ "$BACKEND_ONLY" != true ]; then
        echo "  🌐 前端界面: http://localhost:$FRONTEND_PORT"
    fi
    
    echo ""
    if [ "$DEV_MODE" = true ]; then
        echo "  📋 后端日志: tail -f backend/backend.log"
        echo "  📋 前端日志: tail -f frontend/frontend.log"
        echo ""
    fi
    
    # 已移除: 向量数据库状态与初始化提示
    
    print_warning "按 Ctrl+C 停止所有服务"
    echo "========================================"
    
    # 自动打开登录页面
    if [ "$BACKEND_ONLY" != true ] && [ "$NO_BROWSER" != true ]; then
        print_step "正在打开登录页面..."
        sleep 3  # 等待3秒确保服务完全启动
        
        # 检测操作系统并使用相应的命令打开浏览器
        case "$(uname -s)" in
            Darwin)  # macOS
                open "http://localhost:$FRONTEND_PORT/login" 2>/dev/null || true
                ;;
            Linux)   # Linux
                if command -v xdg-open &> /dev/null; then
                    xdg-open "http://localhost:$FRONTEND_PORT/login" 2>/dev/null || true
                elif command -v gnome-open &> /dev/null; then
                    gnome-open "http://localhost:$FRONTEND_PORT/login" 2>/dev/null || true
                fi
                ;;
            CYGWIN*|MINGW32*|MSYS*|MINGW*)  # Windows
                start "http://localhost:$FRONTEND_PORT/login" 2>/dev/null || true
                ;;
        esac
        
        print_success "登录页面已在浏览器中打开"
        print_info "登录地址: http://localhost:$FRONTEND_PORT/login"
        print_info "默认用户名: admin, 密码: admin"
    elif [ "$BACKEND_ONLY" != true ]; then
        print_info "登录地址: http://localhost:$FRONTEND_PORT/login"
        print_info "默认用户名: admin, 密码: admin"
    fi
    
    # 保持脚本运行
    wait
}

# 运行主函数
main "$@" 
