#!/bin/bash

# MCP协议服务启动脚本 (Docker版本)
# 使用Docker Compose管理Redis和ChromaDB服务

echo "🐳 启动MCP协议服务 (Docker版本)"
echo "================================"

# 检查Docker
echo "📋 检查Docker环境..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    echo "   访问: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    echo "   访问: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker版本: $(docker --version)"
echo "✅ Docker Compose版本: $(docker-compose --version)"

# 检查Node.js版本
echo "📋 检查Node.js环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js版本过低，需要18+，当前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"

# 启动Docker服务
echo "🐳 启动Docker服务..."
echo "   启动Redis和ChromaDB容器..."

# 检查docker-compose.yml文件
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml文件不存在"
    exit 1
fi

# 启动服务
docker-compose up -d

# 等待服务启动
echo "⏳ 等待Docker服务启动..."
sleep 5

# 检查Redis服务
echo "🔍 检查Redis服务..."
if docker exec mcp-redis redis-cli ping &> /dev/null; then
    echo "✅ Redis服务已启动"
else
    echo "❌ Redis服务启动失败"
    echo "   查看日志: docker-compose logs redis"
    exit 1
fi

# 检查ChromaDB服务
echo "🔍 检查ChromaDB服务..."
if curl -s http://localhost:8000/api/v1/heartbeat &> /dev/null; then
    echo "✅ ChromaDB服务已启动"
else
    echo "❌ ChromaDB服务启动失败"
    echo "   查看日志: docker-compose logs chroma"
    exit 1
fi

# 检查Ollama
echo "🔍 检查Ollama服务..."
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama未安装，请先安装Ollama"
    echo "    访问: https://ollama.ai/download"
    exit 1
fi

# 检查Ollama服务状态
if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "🔄 启动Ollama服务..."
    ollama serve &
    sleep 3
fi

if curl -s http://localhost:11434/api/tags &> /dev/null; then
    echo "✅ Ollama服务已启动"
else
    echo "❌ Ollama启动失败，请手动启动Ollama服务"
    exit 1
fi

# 检查模型
echo "🔍 检查deepseek-r1:7b模型..."
if ! ollama list | grep -q "deepseek-r1:7b"; then
    echo "📥 下载deepseek-r1:7b模型..."
    ollama pull deepseek-r1:7b
    if [ $? -ne 0 ]; then
        echo "❌ 模型下载失败"
        exit 1
    fi
fi

echo "✅ deepseek-r1:7b模型已就绪"

# 检查嵌入模型
echo "🔍 检查Qwen3-Embedding-4B量化模型..."
if ! ollama list | grep -q "dengcao/Qwen3-Embedding-4B:Q4_K_M"; then
    echo "📥 下载Qwen3-Embedding-4B量化模型..."
    ollama pull dengcao/Qwen3-Embedding-4B:Q4_K_M
    if [ $? -ne 0 ]; then
        echo "❌ 嵌入模型下载失败"
        exit 1
    fi
fi

echo "✅ Qwen3-Embedding-4B量化模型已就绪"

# 安装依赖
echo "📦 安装Node.js依赖..."
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
fi

echo "✅ 依赖安装完成"

# 创建必要的目录
echo "📁 创建必要目录..."
mkdir -p logs
mkdir -p documents

# 显示配置信息
echo ""
echo "📋 服务配置信息:"
echo "   服务地址: http://localhost:3000"
echo "   Redis: localhost:6379 (Docker容器: mcp-redis)"
echo "   ChromaDB: http://localhost:8000 (Docker容器: mcp-chroma)"
echo "   Ollama: http://localhost:11434"
echo ""
echo "🐳 Docker容器状态:"
docker-compose ps
echo ""

# 启动应用
echo "🚀 启动MCP协议服务..."
echo "   按 Ctrl+C 停止服务"
echo ""

# 设置环境变量
export NODE_ENV=development
export PORT=3000
export OLLAMA_API_BASE=http://localhost:11434
export OLLAMA_MODEL=deepseek-r1:7b

# 启动服务
node server.js 