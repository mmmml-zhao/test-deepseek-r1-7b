#!/bin/bash

# Docker环境管理脚本
# 用于管理MCP协议服务的Docker容器

set -e

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

# 检查Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose未安装"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "🐳 MCP协议服务 Docker 管理脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start     启动所有Docker服务 (Redis + ChromaDB)"
    echo "  stop      停止所有Docker服务"
    echo "  restart   重启所有Docker服务"
    echo "  status    查看服务状态"
    echo "  logs      查看服务日志"
    echo "  clean     清理所有容器和数据"
    echo "  redis     仅管理Redis服务"
    echo "  chroma    仅管理ChromaDB服务"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start     # 启动所有服务"
    echo "  $0 status    # 查看状态"
    echo "  $0 logs      # 查看日志"
}

# 启动服务
start_services() {
    print_info "启动Docker服务..."
    
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml文件不存在"
        exit 1
    fi
    
    docker-compose up -d
    
    print_info "等待服务启动..."
    sleep 5
    
    # 检查Redis
    if docker exec mcp-redis redis-cli ping &> /dev/null; then
        print_success "Redis服务已启动"
    else
        print_error "Redis服务启动失败"
        docker-compose logs redis
        exit 1
    fi
    
    # 检查ChromaDB
    if curl -s http://localhost:8000/api/v1/heartbeat &> /dev/null; then
        print_success "ChromaDB服务已启动"
    else
        print_error "ChromaDB服务启动失败"
        docker-compose logs chroma
        exit 1
    fi
    
    print_success "所有Docker服务已启动"
}

# 停止服务
stop_services() {
    print_info "停止Docker服务..."
    docker-compose down
    print_success "Docker服务已停止"
}

# 重启服务
restart_services() {
    print_info "重启Docker服务..."
    docker-compose down
    docker-compose up -d
    print_success "Docker服务已重启"
}

# 查看状态
show_status() {
    print_info "Docker服务状态:"
    echo ""
    docker-compose ps
    echo ""
    
    # 检查Redis连接
    if docker exec mcp-redis redis-cli ping &> /dev/null; then
        print_success "Redis: 运行中"
    else
        print_error "Redis: 未运行"
    fi
    
    # 检查ChromaDB连接
    if curl -s http://localhost:8000/api/v1/heartbeat &> /dev/null; then
        print_success "ChromaDB: 运行中"
    else
        print_error "ChromaDB: 未运行"
    fi
}

# 查看日志
show_logs() {
    print_info "显示Docker服务日志..."
    echo ""
    echo "Redis日志:"
    docker-compose logs redis
    echo ""
    echo "ChromaDB日志:"
    docker-compose logs chroma
}

# 清理服务
clean_services() {
    print_warning "这将删除所有容器和数据，确定继续吗？(y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "清理Docker服务..."
        docker-compose down -v
        docker system prune -f
        print_success "清理完成"
    else
        print_info "取消清理操作"
    fi
}

# 管理Redis
manage_redis() {
    case "$2" in
        start)
            print_info "启动Redis服务..."
            docker-compose up -d redis
            ;;
        stop)
            print_info "停止Redis服务..."
            docker-compose stop redis
            ;;
        restart)
            print_info "重启Redis服务..."
            docker-compose restart redis
            ;;
        logs)
            print_info "Redis日志:"
            docker-compose logs redis
            ;;
        *)
            print_error "未知的Redis命令: $2"
            echo "可用命令: start, stop, restart, logs"
            exit 1
            ;;
    esac
}

# 管理ChromaDB
manage_chroma() {
    case "$2" in
        start)
            print_info "启动ChromaDB服务..."
            docker-compose up -d chroma
            ;;
        stop)
            print_info "停止ChromaDB服务..."
            docker-compose stop chroma
            ;;
        restart)
            print_info "重启ChromaDB服务..."
            docker-compose restart chroma
            ;;
        logs)
            print_info "ChromaDB日志:"
            docker-compose logs chroma
            ;;
        *)
            print_error "未知的ChromaDB命令: $2"
            echo "可用命令: start, stop, restart, logs"
            exit 1
            ;;
    esac
}

# 主函数
main() {
    check_docker
    
    case "$1" in
        start)
            start_services
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        clean)
            clean_services
            ;;
        redis)
            manage_redis "$@"
            ;;
        chroma)
            manage_chroma "$@"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@" 