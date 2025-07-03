#!/bin/bash

# Ollama Docker管理脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置
OLLAMA_CONTAINER="mcp-ollama"
OLLAMA_BASE_URL="http://localhost:11434"
REQUIRED_MODELS=(
    "deepseek-r1:7b"
    "Qwen3-Embedding-4B:Q4_K_M"
    "Qwen3-Reranker-4B:Q4_K_M"
)

# 检查Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行，请启动 Docker"
        exit 1
    fi
}

# 启动Ollama容器
start_ollama() {
    log_info "启动 Ollama 容器..."
    
    if docker ps -q -f name=$OLLAMA_CONTAINER | grep -q .; then
        log_warning "Ollama 容器已在运行"
        return 0
    fi
    
    if docker ps -aq -f name=$OLLAMA_CONTAINER | grep -q .; then
        log_info "启动现有 Ollama 容器..."
        docker start $OLLAMA_CONTAINER
    else
        log_info "创建新的 Ollama 容器..."
        docker run -d \
            --name $OLLAMA_CONTAINER \
            --restart unless-stopped \
            -p 11434:11434 \
            -v ollama_data:/root/.ollama \
            -v /var/lib/ollama:/var/lib/ollama \
            -e OLLAMA_HOST=0.0.0.0 \
            -e OLLAMA_ORIGINS=* \
            --memory=8g \
            ollama/ollama:latest
    fi
    
    # 等待服务启动
    log_info "等待 Ollama 服务启动..."
    for i in {1..30}; do
        if curl -s $OLLAMA_BASE_URL/api/tags &> /dev/null; then
            log_success "Ollama 服务已启动"
            return 0
        fi
        sleep 2
    done
    
    log_error "Ollama 服务启动超时"
    return 1
}

# 停止Ollama容器
stop_ollama() {
    log_info "停止 Ollama 容器..."
    if docker ps -q -f name=$OLLAMA_CONTAINER | grep -q .; then
        docker stop $OLLAMA_CONTAINER
        log_success "Ollama 容器已停止"
    else
        log_warning "Ollama 容器未运行"
    fi
}

# 重启Ollama容器
restart_ollama() {
    log_info "重启 Ollama 容器..."
    stop_ollama
    sleep 2
    start_ollama
}

# 检查Ollama服务状态
check_ollama_status() {
    if docker ps -q -f name=$OLLAMA_CONTAINER | grep -q .; then
        if curl -s $OLLAMA_BASE_URL/api/tags &> /dev/null; then
            log_success "Ollama 容器运行正常"
            return 0
        else
            log_warning "Ollama 容器运行但服务未响应"
            return 1
        fi
    else
        log_warning "Ollama 容器未运行"
        return 1
    fi
}

# 查看Ollama日志
show_ollama_logs() {
    log_info "显示 Ollama 容器日志..."
    docker logs $OLLAMA_CONTAINER --tail=50 -f
}

# 下载模型
download_model() {
    local model_name=$1
    log_info "下载模型: $model_name"
    
    if ! check_ollama_status; then
        log_error "Ollama 服务未运行，无法下载模型"
        return 1
    fi
    
    docker exec $OLLAMA_CONTAINER ollama pull $model_name
    if [ $? -eq 0 ]; then
        log_success "模型下载完成: $model_name"
    else
        log_error "模型下载失败: $model_name"
        return 1
    fi
}

# 下载所有必需模型
download_all_models() {
    log_info "下载所有必需模型..."
    
    for model in "${REQUIRED_MODELS[@]}"; do
        download_model "$model"
    done
    
    log_success "所有模型下载完成"
}

# 列出已安装模型
list_models() {
    log_info "已安装的模型:"
    if check_ollama_status; then
        docker exec $OLLAMA_CONTAINER ollama list
    else
        log_error "Ollama 服务未运行"
    fi
}

# 测试模型
test_model() {
    local model_name=$1
    log_info "测试模型: $model_name"
    
    if ! check_ollama_status; then
        log_error "Ollama 服务未运行"
        return 1
    fi
    
    # 测试嵌入模型
    if [[ $model_name == *"embedding"* ]]; then
        log_info "测试嵌入模型..."
        curl -X POST "$OLLAMA_BASE_URL/api/embeddings" \
            -H "Content-Type: application/json" \
            -d "{\"model\": \"$model_name\", \"prompt\": \"test\"}" | jq '.embedding | length'
    else
        log_info "测试生成模型..."
        docker exec $OLLAMA_CONTAINER ollama run $model_name "Hello, this is a test."
    fi
}

# 清理Ollama数据
clean_ollama() {
    log_warning "清理 Ollama 数据..."
    read -p "确定要删除所有 Ollama 数据吗？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        stop_ollama
        docker rm -f $OLLAMA_CONTAINER 2>/dev/null || true
        docker volume rm ollama_data 2>/dev/null || true
        log_success "Ollama 数据已清理"
    else
        log_info "取消清理操作"
    fi
}

# 显示容器信息
show_container_info() {
    log_info "Ollama 容器信息:"
    docker ps -f name=$OLLAMA_CONTAINER --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    if check_ollama_status; then
        log_info "Ollama API 信息:"
        curl -s "$OLLAMA_BASE_URL/api/tags" | jq '.models[] | {name: .name, size: .size, modified_at: .modified_at}' 2>/dev/null || echo "无法获取模型信息"
    fi
}

# 主函数
main() {
    check_docker
    
    case "${1:-help}" in
        "start")
            start_ollama
            ;;
        "stop")
            stop_ollama
            ;;
        "restart")
            restart_ollama
            ;;
        "status")
            check_ollama_status
            ;;
        "logs")
            show_ollama_logs
            ;;
        "download")
            if [ -n "$2" ]; then
                download_model "$2"
            else
                download_all_models
            fi
            ;;
        "list")
            list_models
            ;;
        "test")
            if [ -n "$2" ]; then
                test_model "$2"
            else
                log_error "请指定要测试的模型名称"
            fi
            ;;
        "clean")
            clean_ollama
            ;;
        "info")
            show_container_info
            ;;
        "help"|*)
            echo "Ollama Docker 管理脚本"
            echo ""
            echo "用法: $0 [命令] [参数]"
            echo ""
            echo "命令:"
            echo "  start              - 启动 Ollama 容器"
            echo "  stop               - 停止 Ollama 容器"
            echo "  restart            - 重启 Ollama 容器"
            echo "  status             - 检查 Ollama 状态"
            echo "  logs               - 查看 Ollama 日志"
            echo "  download [模型名]   - 下载模型（不指定则下载所有必需模型）"
            echo "  list               - 列出已安装模型"
            echo "  test <模型名>       - 测试指定模型"
            echo "  clean              - 清理 Ollama 数据"
            echo "  info               - 显示容器信息"
            echo "  help               - 显示此帮助信息"
            echo ""
            echo "必需模型:"
            printf "  %s\n" "${REQUIRED_MODELS[@]}"
            ;;
    esac
}

main "$@" 