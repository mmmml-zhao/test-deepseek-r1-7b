#!/bin/bash

# MCP协议服务启动脚本
# 包含RAG功能的完整启动流程

echo "🚀 启动MCP协议服务 (集成RAG功能)"
echo "=================================="

# 检查Node.js版本
echo "📋 检查环境..."
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

# 检查Redis (支持Docker Redis)
echo "🔍 检查Redis服务..."
if ! command -v redis-cli &> /dev/null && ! command -v docker &> /dev/null; then
    echo "⚠️  Redis未安装且Docker不可用，请先安装Redis或Docker"
    echo "   安装Redis: brew install redis (macOS) 或 sudo apt-get install redis-server (Ubuntu)"
    echo "   安装Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 尝试连接Redis
if ! redis-cli ping &> /dev/null; then
    echo "🔄 尝试启动Redis服务..."
    
    # 检查Docker Redis容器
    if command -v docker &> /dev/null; then
        echo "🐳 检查Docker Redis容器..."
        
        # 检查是否存在Redis容器（支持多种命名）
        REDIS_CONTAINER=$(docker ps -a --format "table {{.Names}}" | grep -E "(redis|local-redis|mcp-redis)" | head -1)
        if [ -n "$REDIS_CONTAINER" ]; then
            echo "📦 发现Redis容器: $REDIS_CONTAINER，启动中..."
            docker start "$REDIS_CONTAINER"
        else
            echo "📦 创建Redis容器..."
            docker run -d --name redis -p 6379:6379 redis:7-alpine
            REDIS_CONTAINER="redis"
        fi
        
        # 等待Redis启动
        echo "⏳ 等待Redis启动..."
        sleep 3
        
        # 测试连接
        if docker exec "$REDIS_CONTAINER" redis-cli ping &> /dev/null; then
            echo "✅ Docker Redis服务已启动 (容器: $REDIS_CONTAINER)"
        else
            echo "❌ Docker Redis启动失败"
            echo "   容器名称: $REDIS_CONTAINER"
            echo "   请检查容器状态: docker ps -a | grep redis"
            exit 1
        fi
    else
        # 尝试启动本地Redis
        if command -v brew &> /dev/null; then
            brew services start redis
        elif command -v systemctl &> /dev/null; then
            sudo systemctl start redis
        else
            redis-server --daemonize yes
        fi
        sleep 2
    fi
fi

# 最终测试Redis连接
if redis-cli ping &> /dev/null; then
    echo "✅ Redis服务已就绪"
elif command -v docker &> /dev/null; then
    # 尝试连接Docker Redis容器
    REDIS_CONTAINER=$(docker ps --format "table {{.Names}}" | grep -E "(redis|local-redis|mcp-redis)" | head -1)
    if [ -n "$REDIS_CONTAINER" ] && docker exec "$REDIS_CONTAINER" redis-cli ping &> /dev/null; then
        echo "✅ Docker Redis服务已就绪 (容器: $REDIS_CONTAINER)"
    else
        echo "❌ Redis连接失败，请检查Redis服务状态"
        echo "   可用容器:"
        docker ps -a | grep -E "(redis|local-redis|mcp-redis)" || echo "   未找到Redis容器"
        exit 1
    fi
else
    echo "❌ Redis连接失败，请检查Redis服务状态"
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

# 检查ChromaDB
echo "🔍 检查ChromaDB服务..."
if ! curl -s http://localhost:8000/api/v1/heartbeat &> /dev/null; then
    echo "🔄 启动ChromaDB服务..."
    if command -v docker &> /dev/null; then
        # 检查是否存在ChromaDB容器
        if docker ps -a --format "table {{.Names}}" | grep -q "chroma"; then
            echo "📦 发现ChromaDB容器，启动中..."
            docker start chroma 2>/dev/null || docker start $(docker ps -a --format "table {{.Names}}" | grep "chroma" | head -1)
        else
            echo "📦 创建ChromaDB容器..."
            docker run -d --name chroma -p 8000:8000 chromadb/chroma:latest
        fi
        sleep 5
    else
        echo "⚠️  Docker未安装，请手动启动ChromaDB"
        echo "    或安装Docker: https://docs.docker.com/get-docker/"
        echo "    然后运行: docker run -d --name chroma -p 8000:8000 chromadb/chroma:latest"
    fi
fi

if curl -s http://localhost:8000/api/v1/heartbeat &> /dev/null; then
    echo "✅ ChromaDB服务已启动"
else
    echo "⚠️  ChromaDB未启动，RAG功能可能不可用"
fi

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
echo "   Redis: localhost:6379 (Docker)"
echo "   Ollama: http://localhost:11434"
echo "   ChromaDB: http://localhost:8000 (Docker)"
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