#!/bin/bash

# 海曙区事件分析系统日志查看脚本
# 使用方法: ./logs.sh [选项]
# 选项:
#   --backend            显示后端日志
#   --frontend           显示前端日志
#   --follow             实时跟踪日志
#   --lines N            显示最近N行（默认50）
#   --all               显示所有日志
#   --clear             清理所有日志文件
#   --help              显示帮助信息

set -e

# 默认配置
SHOW_BACKEND=false
SHOW_FRONTEND=false
FOLLOW_MODE=false
SHOW_ALL=false
CLEAR_LOGS=false
LINES=50

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

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${PURPLE}📋 $1${NC}"
}

# 显示帮助信息
show_help() {
    echo "海曙区事件分析系统日志查看脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --backend            显示后端日志"
    echo "  --frontend           显示前端日志"
    echo "  --follow             实时跟踪日志（类似tail -f）"
    echo "  --lines N            显示最近N行（默认50）"
    echo "  --all               显示所有日志"
    echo "  --clear             清理所有日志文件"
    echo "  --help              显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                   # 显示所有日志（最近50行）"
    echo "  $0 --backend --follow # 实时跟踪后端日志"
    echo "  $0 --lines 100       # 显示最近100行日志"
    echo "  $0 --clear           # 清理所有日志文件"
    exit 0
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backend)
                SHOW_BACKEND=true
                shift
                ;;
            --frontend)
                SHOW_FRONTEND=true
                shift
                ;;
            --follow)
                FOLLOW_MODE=true
                shift
                ;;
            --lines)
                LINES="$2"
                if ! [[ "$LINES" =~ ^[0-9]+$ ]]; then
                    print_error "行数必须是数字: $LINES"
                    exit 1
                fi
                shift 2
                ;;
            --all)
                SHOW_ALL=true
                shift
                ;;
            --clear)
                CLEAR_LOGS=true
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

# 检查日志文件
check_log_file() {
    local file=$1
    local service=$2
    
    if [ -f "$file" ]; then
        local size=$(du -h "$file" | cut -f1)
        local lines=$(wc -l < "$file")
        print_info "$service 日志文件: $file (大小: $size, 行数: $lines)"
        return 0
    else
        print_warning "$service 日志文件不存在: $file"
        return 1
    fi
}

# 显示日志文件信息
show_log_info() {
    print_header "日志文件信息"
    echo "========================================"
    
    check_log_file "backend/backend.log" "后端"
    check_log_file "frontend/frontend.log" "前端"
    
    # 检查其他可能的日志文件
    local other_logs=$(find . -maxdepth 2 -name "*.log" -not -path "./backend/backend.log" -not -path "./frontend/frontend.log" 2>/dev/null)
    if [ -n "$other_logs" ]; then
        print_info "其他日志文件:"
        echo "$other_logs" | while read -r log; do
            local size=$(du -h "$log" | cut -f1)
            echo "  - $log ($size)"
        done
    fi
    
    echo "========================================"
}

# 显示后端日志
show_backend_log() {
    local log_file="backend/backend.log"
    
    if ! check_log_file "$log_file" "后端"; then
        return 1
    fi
    
    print_header "后端日志"
    echo "========================================"
    
    if [ "$FOLLOW_MODE" = true ]; then
        print_info "实时跟踪后端日志 (Ctrl+C 退出)..."
        echo ""
        tail -f "$log_file"
    else
        if [ "$SHOW_ALL" = true ]; then
            cat "$log_file"
        else
            print_info "显示最近 $LINES 行:"
            echo ""
            tail -n "$LINES" "$log_file"
        fi
    fi
}

# 显示前端日志
show_frontend_log() {
    local log_file="frontend/frontend.log"
    
    if ! check_log_file "$log_file" "前端"; then
        return 1
    fi
    
    print_header "前端日志"
    echo "========================================"
    
    if [ "$FOLLOW_MODE" = true ]; then
        print_info "实时跟踪前端日志 (Ctrl+C 退出)..."
        echo ""
        tail -f "$log_file"
    else
        if [ "$SHOW_ALL" = true ]; then
            cat "$log_file"
        else
            print_info "显示最近 $LINES 行:"
            echo ""
            tail -n "$LINES" "$log_file"
        fi
    fi
}

# 实时跟踪所有日志
follow_all_logs() {
    local backend_log="backend/backend.log"
    local frontend_log="frontend/frontend.log"
    local log_files=()
    
    # 检查哪些日志文件存在
    if [ -f "$backend_log" ]; then
        log_files+=("$backend_log")
    fi
    
    if [ -f "$frontend_log" ]; then
        log_files+=("$frontend_log")
    fi
    
    if [ ${#log_files[@]} -eq 0 ]; then
        print_warning "没有找到日志文件"
        return 1
    fi
    
    print_header "实时跟踪所有日志"
    echo "========================================"
    print_info "跟踪文件: ${log_files[*]}"
    print_info "按 Ctrl+C 退出"
    echo ""
    
    # 使用 tail -f 同时跟踪多个文件
    tail -f "${log_files[@]}"
}

# 清理日志文件
clear_logs() {
    print_header "清理日志文件"
    echo "========================================"
    
    local cleared_files=()
    
    # 清理后端日志
    if [ -f "backend/backend.log" ]; then
        rm -f "backend/backend.log"
        cleared_files+=("backend/backend.log")
    fi
    
    # 清理前端日志
    if [ -f "frontend/frontend.log" ]; then
        rm -f "frontend/frontend.log"
        cleared_files+=("frontend/frontend.log")
    fi
    
    # 清理其他日志文件
    local other_logs=$(find . -maxdepth 2 -name "*.log" 2>/dev/null)
    if [ -n "$other_logs" ]; then
        echo "$other_logs" | while read -r log; do
            rm -f "$log"
            cleared_files+=("$log")
        done
    fi
    
    if [ ${#cleared_files[@]} -gt 0 ]; then
        print_success "已清理日志文件: ${cleared_files[*]}"
    else
        print_info "没有找到需要清理的日志文件"
    fi
}

# 主函数
main() {
    # 解析命令行参数
    parse_args "$@"
    
    # 清理日志文件
    if [ "$CLEAR_LOGS" = true ]; then
        clear_logs
        exit 0
    fi
    
    # 显示日志文件信息
    show_log_info
    echo ""
    
    # 根据参数显示对应日志
    if [ "$SHOW_BACKEND" = true ] && [ "$SHOW_FRONTEND" = true ]; then
        # 同时显示两者
        if [ "$FOLLOW_MODE" = true ]; then
            follow_all_logs
        else
            show_backend_log
            echo ""
            show_frontend_log
        fi
    elif [ "$SHOW_BACKEND" = true ]; then
        # 只显示后端
        show_backend_log
    elif [ "$SHOW_FRONTEND" = true ]; then
        # 只显示前端
        show_frontend_log
    else
        # 默认显示所有
        if [ "$FOLLOW_MODE" = true ]; then
            follow_all_logs
        else
            # 静态显示所有日志
            if check_log_file "backend/backend.log" "后端" >/dev/null 2>&1; then
                show_backend_log
                echo ""
            fi
            
            if check_log_file "frontend/frontend.log" "前端" >/dev/null 2>&1; then
                show_frontend_log
            fi
        fi
    fi
}

# 运行主函数
main "$@" 