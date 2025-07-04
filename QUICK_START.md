# 快速开始指南

## 🚀 5分钟快速上手

### 1. 环境准备

确保您的系统已安装以下软件：

- **Node.js 18+**: [下载地址](https://nodejs.org/)
- **Docker**: [下载地址](https://docs.docker.com/get-docker/)
- **Docker Compose**: [安装指南](https://docs.docker.com/compose/install/)
- **Ollama**: [下载地址](https://ollama.ai/download)

### 2. 启动方式选择

#### 方式一：Docker环境（推荐）

如果您使用Docker运行Redis，推荐使用Docker环境：

```bash
# 启动Docker服务
./docker-manager.sh start

# 启动完整服务
./start-docker.sh
```

#### 方式二：混合环境

如果您想使用Docker Redis但本地运行其他服务：

```bash
# 启动Docker服务
./docker-manager.sh start

# 启动应用服务
./start.sh
```

#### 方式三：完全本地环境

如果您所有服务都本地运行：

```bash
# 启动所有服务
./start.sh
```

### 3. 访问应用

打开浏览器访问：http://localhost:3000

## 🐳 Docker环境管理

### Docker服务管理

```bash
# 启动Docker服务
./docker-manager.sh start

# 查看服务状态
./docker-manager.sh status

# 查看服务日志
./docker-manager.sh logs

# 停止Docker服务
./docker-manager.sh stop

# 重启Docker服务
./docker-manager.sh restart

# 清理所有数据
./docker-manager.sh clean
```

### 单独管理服务

```bash
# 仅管理Redis
./docker-manager.sh redis start
./docker-manager.sh redis stop
./docker-manager.sh redis logs

# 仅管理ChromaDB
./docker-manager.sh chroma start
./docker-manager.sh chroma stop
./docker-manager.sh chroma logs
```

### Docker Compose直接操作

```bash
# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs

# 停止服务
docker-compose down
```

## 📖 使用RAG功能

### 第一步：添加文档

1. 在"RAG知识库管理"面板中
2. 输入文档路径，例如：`./documents`
3. 点击"添加文档"按钮
4. 等待处理完成

### 第二步：启用RAG

1. 确保RAG状态显示为"已启用"
2. 在上下文设置中添加：`"useRAG": true`

### 第三步：开始聊天

1. 点击"新建会话"
2. 输入您的问题
3. AI将基于您添加的文档回答，并使用重排序模型优化检索结果

## 🎯 重排序功能

系统集成了 `dengcao/Qwen3-Reranker-4B:Q4_K_M` 重排序模型，能够：

- **智能排序**: 根据查询相关性对检索结果重新排序
- **提升精度**: 将最相关的文档排在前面
- **自动优化**: 无需手动配置，自动应用于所有查询

### 测试重排序功能

```bash
# 测试重排序模型
node test_reranker.js

# 测试完整RAG系统（包含重排序）
node test_rag_with_reranker.js
```

## 🧪 测试RAG功能

运行测试脚本验证功能：

```bash
node test_rag.js
```

## 📁 示例文档

项目包含示例文档：

- `documents/README.md` - 项目概述
- `documents/api_guide.md` - API使用指南
- `documents/configuration.md` - 配置说明

## 🔧 常见问题

### Q: Docker Redis连接失败怎么办？

**A:** 检查Docker服务状态：

```bash
# 查看Docker服务状态
./docker-manager.sh status

# 查看Redis日志
./docker-manager.sh redis logs

# 重启Redis服务
./docker-manager.sh redis restart
```

### Q: 如何查看Docker容器状态？

**A:** 使用以下命令：

```bash
# 查看所有容器
docker ps -a

# 查看MCP相关容器
docker-compose ps

# 查看容器日志
docker-compose logs
```

### Q: 如何备份Docker数据？

**A:** Docker数据存储在命名卷中：

```bash
# 查看卷信息
docker volume ls

# 备份Redis数据
docker run --rm -v mcp_redis_data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .

# 备份ChromaDB数据
docker run --rm -v mcp_chroma_data:/data -v $(pwd):/backup alpine tar czf /backup/chroma-backup.tar.gz -C /data .
```

### Q: 如何清理Docker环境？

**A:** 使用清理命令：

```bash
# 清理容器和数据
./docker-manager.sh clean

# 或者手动清理
docker-compose down -v
docker system prune -f
```

### Q: 启动失败怎么办？

**A:** 检查以下服务是否正常运行：

```bash
# 检查Redis
docker exec mcp-redis redis-cli ping

# 检查ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# 检查Ollama
curl http://localhost:11434/api/tags
```

### Q: 如何添加自己的文档？

**A:** 将您的文档放在任意目录，然后在RAG面板中输入该目录的完整路径。

### Q: 支持哪些文件格式？

**A:** 支持 .txt, .md, .js, .ts, .py, .java, .cpp, .c, .h, .json, .xml, .html, .css 等格式。

### Q: 如何调整RAG参数？

**A:** 在 `rag/vector_store.js` 中修改：
- `chunkSize`: 文本块大小
- `overlap`: 重叠大小
- `topK`: 检索文档数量

## 📊 功能特性

### ✅ 已实现功能

- [x] 多格式文档支持
- [x] 智能文档分割
- [x] 向量化存储
- [x] 语义搜索
- [x] 增强回答生成
- [x] 知识库管理
- [x] 实时聊天界面
- [x] WebSocket通信
- [x] 会话持久化
- [x] Docker环境支持

### 🔄 工作流程

```
文档输入 → 文本分割 → 向量化 → 存储到ChromaDB
                                    ↓
用户问题 → 向量化 → 语义搜索 → 检索相关文档 → 增强提示 → LLM生成回答
```

## 🎯 使用场景

### 1. 企业知识问答
- 上传公司文档、手册、政策
- 员工可以快速获取准确信息

### 2. 代码库分析
- 上传项目代码
- 询问代码结构、功能实现

### 3. 技术支持
- 上传技术文档
- 提供自动化的技术支持

### 4. 学习助手
- 上传学习资料
- 基于资料回答问题

## 📈 性能优化

### 文档处理优化
- 批量处理文档
- 异步向量化
- 内存管理优化

### 检索优化
- 语义相似度计算
- 结果排序和过滤
- 缓存机制

## 🔐 安全考虑

- 文档存储在本地
- 向量数据本地化
- 无外部API依赖
- 支持私有部署
- Docker容器隔离

## 📞 获取帮助

如果遇到问题：

1. 查看控制台错误信息
2. 运行 `node test_rag.js` 诊断
3. 检查Docker服务状态
4. 查看详细文档

## 🎉 开始使用

现在您已经了解了基本使用方法，开始体验RAG功能吧！

```bash
# Docker环境启动
./docker-manager.sh start
./start-docker.sh

# 访问应用
open http://localhost:3000
```

祝您使用愉快！ 🚀 