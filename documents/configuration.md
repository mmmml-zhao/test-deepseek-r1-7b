# 配置说明

## 环境变量配置

### 基础配置

```bash
# 服务端口
PORT=3000

# Ollama API地址
OLLAMA_API_BASE=http://localhost:11434

# 使用的模型名称
OLLAMA_MODEL=deepseek-r1:7b

# Redis连接配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 高级配置

```bash
# ChromaDB配置
CHROMA_HOST=localhost
CHROMA_PORT=8000

# 日志级别
LOG_LEVEL=info

# 最大并发连接数
MAX_CONNECTIONS=100

# 会话超时时间（毫秒）
SESSION_TIMEOUT=3600000
```

## 模型参数配置

### LLM参数

```javascript
const llmConfig = {
  // 温度参数，控制输出的随机性 (0.0-1.0)
  temperature: 0.7,
  
  // Top-p采样参数 (0.0-1.0)
  top_p: 0.9,
  
  // 上下文长度
  context_length: 4096,
  
  // 随机种子
  seed: Date.now(),
  
  // 重复惩罚
  repeat_penalty: 1.1,
  
  // 最大输出长度
  max_tokens: 2048
};
```

### RAG参数

```javascript
const ragConfig = {
  // 文本块大小
  chunkSize: 1000,
  
  // 块重叠大小
  overlap: 200,
  
  // 检索文档数量
  topK: 5,
  
  // 相似度阈值
  similarityThreshold: 0.7,
  
  // 批量处理大小
  batchSize: 10,
  
  // 向量维度
  embeddingDimension: 4096
};
```

## Redis配置

### 连接配置

```javascript
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  
  // 连接池配置
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxLoadingTimeout: 10000,
  
  // 重连配置
  retryDelayOnClusterDown: 300,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3
};
```

### 键名配置

```javascript
const redisKeys = {
  // 会话前缀
  sessionPrefix: 'mcp:session:',
  
  // 用户前缀
  userPrefix: 'mcp:user:',
  
  // 统计前缀
  statsPrefix: 'mcp:stats:',
  
  // 缓存前缀
  cachePrefix: 'mcp:cache:',
  
  // 锁前缀
  lockPrefix: 'mcp:lock:'
};
```

## ChromaDB配置

### 客户端配置

```javascript
const chromaConfig = {
  host: process.env.CHROMA_HOST || 'localhost',
  port: process.env.CHROMA_PORT || 8000,
  
  // 集合配置
  collectionName: 'rag_documents',
  
  // 元数据配置
  metadata: {
    description: 'RAG文档向量存储',
    version: '1.0.0',
    created: new Date().toISOString()
  }
};
```

### 向量化配置

```javascript
const embeddingConfig = {
  // 模型名称
  model: 'deepseek-r1:7b',
  
  // API基础URL
  baseUrl: process.env.OLLAMA_API_BASE || 'http://localhost:11434',
  
  // 超时时间
  timeout: 30000,
  
  // 重试次数
  maxRetries: 3,
  
  // 批量大小
  batchSize: 10
};
```

## 文件处理配置

### 支持的文件格式

```javascript
const supportedFormats = {
  // 文本文件
  text: ['.txt', '.md'],
  
  // 代码文件
  code: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.h'],
  
  // 配置文件
  config: ['.json', '.xml', '.yaml', '.yml'],
  
  // 网页文件
  web: ['.html', '.css', '.scss', '.less'],
  
  // 文档文件
  document: ['.doc', '.docx', '.pdf']
};
```

### 文件大小限制

```javascript
const fileLimits = {
  // 单个文件最大大小 (字节)
  maxFileSize: 10 * 1024 * 1024, // 10MB
  
  // 总文件大小限制
  maxTotalSize: 100 * 1024 * 1024, // 100MB
  
  // 最大文件数量
  maxFileCount: 1000,
  
  // 支持的目录深度
  maxDirectoryDepth: 10
};
```

## 安全配置

### 认证配置

```javascript
const authConfig = {
  // 是否启用认证
  enabled: false,
  
  // JWT密钥
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  
  // Token过期时间
  tokenExpiry: '24h',
  
  // 允许的域名
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com']
};
```

### 限流配置

```javascript
const rateLimitConfig = {
  // 窗口时间 (毫秒)
  windowMs: 15 * 60 * 1000, // 15分钟
  
  // 最大请求数
  max: 100,
  
  // 跳过成功的请求
  skipSuccessfulRequests: false,
  
  // 跳过失败的请求
  skipFailedRequests: false
};
```

## 日志配置

### 日志级别

```javascript
const logConfig = {
  // 日志级别
  level: process.env.LOG_LEVEL || 'info',
  
  // 日志格式
  format: 'combined',
  
  // 日志文件
  filename: 'logs/app.log',
  
  // 最大文件大小
  maxSize: '10m',
  
  // 保留天数
  maxFiles: '14d'
};
```

### 日志分类

```javascript
const logCategories = {
  // 系统日志
  system: 'system',
  
  // 用户操作日志
  user: 'user',
  
  // API访问日志
  api: 'api',
  
  // 错误日志
  error: 'error',
  
  // 性能日志
  performance: 'performance'
};
```

## 性能优化配置

### 缓存配置

```javascript
const cacheConfig = {
  // 缓存启用
  enabled: true,
  
  // 缓存时间 (秒)
  ttl: 3600,
  
  // 最大缓存条目
  maxEntries: 1000,
  
  // 缓存策略
  strategy: 'lru' // lru, fifo, random
};
```

### 连接池配置

```javascript
const poolConfig = {
  // 最小连接数
  min: 2,
  
  // 最大连接数
  max: 10,
  
  // 获取连接超时
  acquire: 30000,
  
  // 连接空闲时间
  idle: 10000
};
```

## 部署配置

### 生产环境配置

```javascript
const productionConfig = {
  // 环境标识
  NODE_ENV: 'production',
  
  // 端口配置
  PORT: process.env.PORT || 3000,
  
  // 数据库配置
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD
  },
  
  // 日志配置
  logging: {
    level: 'warn',
    filename: '/var/log/app.log'
  },
  
  // 安全配置
  security: {
    cors: {
      origin: ['https://yourdomain.com'],
      credentials: true
    }
  }
};
```

### Docker配置

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - CHROMA_HOST=chroma
    depends_on:
      - redis
      - chroma
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
```

## 监控配置

### 健康检查

```javascript
const healthCheckConfig = {
  // 检查间隔 (毫秒)
  interval: 30000,
  
  // 超时时间
  timeout: 5000,
  
  // 检查项目
  checks: [
    'redis',
    'chroma',
    'ollama',
    'disk',
    'memory'
  ]
};
```

### 指标收集

```javascript
const metricsConfig = {
  // 启用指标收集
  enabled: true,
  
  // 收集间隔
  interval: 60000,
  
  // 指标类型
  types: [
    'request_count',
    'response_time',
    'error_rate',
    'memory_usage',
    'cpu_usage'
  ]
};
``` 