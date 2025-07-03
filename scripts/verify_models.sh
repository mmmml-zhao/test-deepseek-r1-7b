#!/bin/bash

# 模型验证脚本
# 用于验证 Ollama 模型是否正确安装和配置

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

# 检查 Ollama 服务
check_ollama_service() {
    log_info "检查 Ollama 服务状态..."
    if curl -s http://localhost:11434/api/tags > /dev/null; then
        log_success "Ollama 服务运行正常"
        return 0
    else
        log_error "Ollama 服务未运行"
        return 1
    fi
}

# 检查模型列表
check_models() {
    log_info "检查已安装的模型..."
    
    local models_found=0
    
    # 检查 LLM 模型
    if ollama list | grep -q "deepseek-r1:7b"; then
        log_success "✅ DeepSeek-R1-7B 模型已安装"
        models_found=$((models_found + 1))
    else
        log_warning "⚠️  DeepSeek-R1-7B 模型未安装"
    fi
    
    # 检查嵌入模型
    if ollama list | grep -q "dengcao/Qwen3-Embedding-4B:Q4_K_M"; then
        log_success "✅ Qwen3-Embedding-4B 量化模型已安装"
        models_found=$((models_found + 1))
    else
        log_warning "⚠️  Qwen3-Embedding-4B 量化模型未安装"
    fi
    
    echo ""
    log_info "已安装模型数量: $models_found/2"
    
    if [ $models_found -eq 2 ]; then
        log_success "所有必需模型都已安装"
        return 0
    else
        log_warning "部分模型未安装"
        return 1
    fi
}

# 测试嵌入模型
test_embedding_model() {
    log_info "测试嵌入模型..."
    
    local model_name="dengcao/Qwen3-Embedding-4B:Q4_K_M"
    local test_text="Hello, this is a test for embedding model."
    
    # 创建临时测试文件
    cat > /tmp/test_embedding.json << EOF
{
    "model": "$model_name",
    "prompt": "$test_text"
}
EOF
    
    # 发送测试请求
    local response=$(curl -s -X POST http://localhost:11434/api/embeddings \
        -H "Content-Type: application/json" \
        -d @/tmp/test_embedding.json)
    
    # 清理临时文件
    rm -f /tmp/test_embedding.json
    
    # 检查响应
    if echo "$response" | grep -q "embedding"; then
        local embedding_length=$(echo "$response" | jq -r '.embedding | length' 2>/dev/null || echo "0")
        log_success "✅ 嵌入模型测试成功 - 维度: $embedding_length"
        return 0
    else
        log_error "❌ 嵌入模型测试失败"
        echo "响应: $response"
        return 1
    fi
}

# 测试 LLM 模型
test_llm_model() {
    log_info "测试 LLM 模型..."
    
    local model_name="deepseek-r1:7b"
    local test_message="Hello, how are you?"
    
    # 创建临时测试文件
    cat > /tmp/test_llm.json << EOF
{
    "model": "$model_name",
    "messages": [
        {
            "role": "user",
            "content": "$test_message"
        }
    ],
    "stream": false
}
EOF
    
    # 发送测试请求
    local response=$(curl -s -X POST http://localhost:11434/api/chat \
        -H "Content-Type: application/json" \
        -d @/tmp/test_llm.json)
    
    # 清理临时文件
    rm -f /tmp/test_llm.json
    
    # 检查响应
    if echo "$response" | grep -q "message"; then
        log_success "✅ LLM 模型测试成功"
        return 0
    else
        log_error "❌ LLM 模型测试失败"
        echo "响应: $response"
        return 1
    fi
}

# 显示模型详细信息
show_model_details() {
    log_info "模型详细信息:"
    echo ""
    
    # 显示所有模型
    ollama list
    
    echo ""
    log_info "模型配置信息:"
    echo "  LLM 模型: deepseek-r1:7b"
    echo "  嵌入模型: dengcao/Qwen3-Embedding-4B:Q4_K_M"
    echo "  API 地址: http://localhost:11434"
    echo ""
}

# 主函数
main() {
    echo "🔍 Ollama 模型验证脚本"
    echo "========================"
    echo ""
    
    local all_tests_passed=true
    
    # 检查 Ollama 服务
    if ! check_ollama_service; then
        all_tests_passed=false
    fi
    
    # 检查模型
    if ! check_models; then
        all_tests_passed=false
    fi
    
    # 测试嵌入模型
    if ! test_embedding_model; then
        all_tests_passed=false
    fi
    
    # 测试 LLM 模型
    if ! test_llm_model; then
        all_tests_passed=false
    fi
    
    # 显示详细信息
    show_model_details
    
    # 总结
    echo "================================"
    if [ "$all_tests_passed" = true ]; then
        log_success "🎉 所有测试通过！模型配置正确"
        exit 0
    else
        log_error "❌ 部分测试失败，请检查模型配置"
        exit 1
    fi
}

# 运行主函数
main "$@" 