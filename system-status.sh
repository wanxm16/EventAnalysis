#!/bin/bash

# 海曙区事件分析系统 - 完整状态检查脚本
# 使用方法: ./system-status.sh [选项]
# 选项:
#   --json       以JSON格式输出
#   --verbose    详细输出
#   --monitor    持续监控模式

set -e

# 默认配置
JSON_OUTPUT=false
VERBOSE=false
MONITOR_MODE=false

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 日志函数
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_header() { echo -e "${PURPLE}📊 $1${NC}"; }

# 加载配置
load_config() {
    if [ -f "config.env" ]; then
        source config.env
    fi
    BACKEND_PORT=${BACKEND_PORT:-8000}
    FRONTEND_PORT=${FRONTEND_PORT:-3000}
}

# 解析参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --json) JSON_OUTPUT=true; shift ;;
            --verbose) VERBOSE=true; shift ;;
            --monitor) MONITOR_MODE=true; shift ;;
            --help) show_help ;;
            *) echo "未知选项: $1"; exit 1 ;;
        esac
    done
}

# 检查服务状态
check_service() {
    local service=$1
    local port=$2
    local url=$3
    local process_pattern=$4
    
    local status="stopped"
    local response_time=""
    local pid=""
    local memory_usage=""
    local cpu_usage=""
    
    # 检查进程
    if pgrep -f "$process_pattern" > /dev/null 2>&1; then
        pid=$(pgrep -f "$process_pattern" | head -1)
        status="running"
        
        # 获取资源使用情况
        if [ "$VERBOSE" = true ] && [ ! -z "$pid" ]; then
            memory_usage=$(ps -p $pid -o rss= 2>/dev/null | awk '{print $1}' || echo "N/A")
            cpu_usage=$(ps -p $pid -o %cpu= 2>/dev/null | awk '{print $1}' || echo "N/A")
        fi
    fi
    
    # 检查HTTP响应
    if [ "$status" = "running" ] && [ ! -z "$url" ]; then
        local start_time=$(date +%s%N)
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            local end_time=$(date +%s%N)
            response_time=$(echo "scale=3; ($end_time - $start_time) / 1000000" | bc 2>/dev/null || echo "N/A")
            status="healthy"
        else
            status="unhealthy"
        fi
    fi
    
    # 输出结果
    if [ "$JSON_OUTPUT" = true ]; then
        echo "\"$service\": {"
        echo "  \"status\": \"$status\","
        echo "  \"port\": $port,"
        echo "  \"pid\": \"$pid\","
        echo "  \"response_time_ms\": \"$response_time\","
        echo "  \"memory_kb\": \"$memory_usage\","
        echo "  \"cpu_percent\": \"$cpu_usage\""
        echo "},"
    else
        printf "%-12s %-10s %-6s %-8s" "$service" "$status" "$port" "$pid"
        if [ "$VERBOSE" = true ]; then
            printf " %-10s %-8s %-12s" "${memory_usage}KB" "${cpu_usage}%" "${response_time}ms"
        fi
        echo ""
    fi
}

# 检查系统资源
check_system_resources() {
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    
    # macOS和Linux兼容的内存使用率检查
    local memory_usage=""
    if command -v free > /dev/null 2>&1; then
        # Linux系统
        memory_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
    else
        # macOS系统
        memory_usage=$(vm_stat | awk '
            /Pages active/ { active = $3 }
            /Pages inactive/ { inactive = $3 }
            /Pages speculative/ { speculative = $3 }
            /Pages wired down/ { wired = $4 }
            /Pages free/ { free = $3 }
            END {
                gsub(/[^0-9]/, "", active)
                gsub(/[^0-9]/, "", inactive) 
                gsub(/[^0-9]/, "", speculative)
                gsub(/[^0-9]/, "", wired)
                gsub(/[^0-9]/, "", free)
                used = active + inactive + speculative + wired
                total = used + free
                if (total > 0) printf "%.1f", used*100/total
                else printf "0.0"
            }
        ')
    fi
    
    local load_avg=$(uptime | awk -F'load average' '{print $2}' | awk '{print $1}' | sed 's/[:,]//g' | awk '{print $1}')
    
    if [ "$JSON_OUTPUT" = true ]; then
        echo "\"system\": {"
        echo "  \"disk_usage_percent\": $disk_usage,"
        echo "  \"memory_usage_percent\": $memory_usage,"
        echo "  \"load_average\": \"$load_avg\","
        echo "  \"timestamp\": \"$(date -Iseconds)\""
        echo "}"
    else
        echo ""
        print_header "系统资源状态"
        echo "磁盘使用率: ${disk_usage}%"
        echo "内存使用率: ${memory_usage}%"
        echo "系统负载: ${load_avg}"
        echo "检查时间: $(date)"
    fi
}

# 主状态检查
main_status_check() {
    if [ "$JSON_OUTPUT" = true ]; then
        echo "{"
    else
        print_header "海曙区事件分析系统 - 详细状态报告"
        echo "================================================"
        printf "%-12s %-10s %-6s %-8s" "服务" "状态" "端口" "进程ID"
        if [ "$VERBOSE" = true ]; then
            printf " %-10s %-8s %-12s" "内存使用" "CPU使用" "响应时间"
        fi
        echo ""
        echo "================================================"
    fi
    
    # 检查服务状态
    check_service "后端服务" "$BACKEND_PORT" "http://localhost:$BACKEND_PORT/docs" "python.*main.py"
    check_service "前端服务" "$FRONTEND_PORT" "http://localhost:$FRONTEND_PORT" "pnpm.*start|npm.*start|yarn.*start|node.*react-scripts"
    
    # 检查系统资源
    check_system_resources
    
    if [ "$JSON_OUTPUT" = true ]; then
        echo "}"
    fi
}

# 监控模式
monitor_mode() {
    print_info "启动监控模式（按 Ctrl+C 退出）"
    while true; do
        clear
        main_status_check
        sleep 5
    done
}

# 显示帮助
show_help() {
    echo "海曙区事件分析系统状态检查脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --json       以JSON格式输出状态信息"
    echo "  --verbose    显示详细信息（内存、CPU、响应时间）"
    echo "  --monitor    持续监控模式（5秒刷新）"
    echo "  --help       显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                  # 基本状态检查"
    echo "  $0 --verbose        # 详细状态检查"
    echo "  $0 --json           # JSON格式输出"
    echo "  $0 --monitor        # 持续监控"
    exit 0
}

# 主函数
main() {
    load_config
    parse_args "$@"
    
    if [ "$MONITOR_MODE" = true ]; then
        monitor_mode
    else
        main_status_check
    fi
}

# 运行主函数
main "$@" 