# Docker环境配置指南

## 概述

本项目支持Docker环境部署，使用Docker Compose管理Redis和ChromaDB服务。Docker环境提供了更好的隔离性、一致性和可移植性。

## 系统要求

### 必需软件
- **Docker**: 版本 20.10+
- **Docker Compose**: 版本 2.0+
- **Node.js**: 版本 18+
- **Ollama**: 最新版本

### 推荐配置
- **内存**: 8GB+ (用于运行大语言模型)
- **存储**: 20GB+ 可用空间
- **CPU**: 4核心+

## 快速开始

### 1. 安装Docker

#### macOS
```bash
# 使用Homebrew安装
brew install --cask docker

# 或从官网下载
# https://docs.docker.com/desktop/install/mac-install/
```

#### Ubuntu/Debian
```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

#### Windows
```bash
# 下载Docker Desktop
# https://docs.docker.com/desktop/install/windows-install/
```

### 2. 验证安装
```bash
# 检查Docker版本
docker --version

# 检查Docker Compose版本
docker-compose --version

# 启动Docker服务
docker info
```

### 3. 启动Docker服务
```bash
# 启动Redis和ChromaDB
./docker-manager.sh start

# 验证服务状态
./docker-manager.sh status
```

### 4. 启动应用
```bash
# 使用Docker环境启动脚本
./start-docker.sh
```

## Docker Compose配置

### 服务配置

项目使用 `docker-compose.yml` 文件定义服务：

```yaml
version: '3.8'

services:
  # Redis服务
  redis:
    image: redis:7-alpine
    container_name: mcp-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ChromaDB向量数据库
  chroma:
    image: chromadb/chroma:latest
    container_name: mcp-chroma
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    restart: unless-stopped
    environment:
      - CHROMA_SERVER_HOST=0.0.0.0
      - CHROMA_SERVER_HTTP_PORT=8000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_data:
    driver: local
  chroma_data:
    driver: local

networks:
  default:
    name: mcp-network
```

### 配置说明

#### Redis配置
- **镜像**: `redis:7-alpine` - 轻量级Redis镜像
- **端口**: 6379 - 标准Redis端口
- **数据卷**: `redis_data` - 持久化数据存储
- **配置**: 启用AOF持久化
- **健康检查**: 每30秒检查一次连接

#### ChromaDB配置
- **镜像**: `chromadb/chroma:latest` - 最新版本ChromaDB
- **端口**: 8000 - ChromaDB API端口
- **数据卷**: `chroma_data` - 向量数据持久化
- **环境变量**: 配置服务器地址和端口
- **健康检查**: 检查API心跳

#### 网络配置
- **网络名称**: `mcp-network` - 自定义网络
- **网络模式**: bridge - 默认桥接模式

## 数据管理

### 数据卷

Docker使用命名卷来持久化数据：

```bash
# 查看数据卷
docker volume ls

# 查看卷详细信息
docker volume inspect mcp_redis_data
docker volume inspect mcp_chroma_data
```

### 数据备份

#### 备份Redis数据
```bash
# 创建备份目录
mkdir -p backups

# 备份Redis数据
docker run --rm -v mcp_redis_data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/redis-backup-$(date +%Y%m%d).tar.gz -C /data .
```

#### 备份ChromaDB数据
```bash
# 备份ChromaDB数据
docker run --rm -v mcp_chroma_data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/chroma-backup-$(date +%Y%m%d).tar.gz -C /data .
```

#### 备份所有数据
```bash
# 使用管理脚本备份
./docker-manager.sh backup
```

### 数据恢复

#### 恢复Redis数据
```bash
# 停止Redis服务
docker-compose stop redis

# 恢复数据
docker run --rm -v mcp_redis_data:/data -v $(pwd)/backups:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/redis-backup-20231201.tar.gz -C /data"

# 启动Redis服务
docker-compose start redis
```

#### 恢复ChromaDB数据
```bash
# 停止ChromaDB服务
docker-compose stop chroma

# 恢复数据
docker run --rm -v mcp_chroma_data:/data -v $(pwd)/backups:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/chroma-backup-20231201.tar.gz -C /data"

# 启动ChromaDB服务
docker-compose start chroma
```

## 环境管理

### 服务管理命令

```bash
# 启动所有服务
./docker-manager.sh start

# 停止所有服务
./docker-manager.sh stop

# 重启所有服务
./docker-manager.sh restart

# 查看服务状态
./docker-manager.sh status

# 查看服务日志
./docker-manager.sh logs

# 清理所有数据
./docker-manager.sh clean
```

### 单独服务管理

```bash
# Redis服务管理
./docker-manager.sh redis start
./docker-manager.sh redis stop
./docker-manager.sh redis restart
./docker-manager.sh redis logs

# ChromaDB服务管理
./docker-manager.sh chroma start
./docker-manager.sh chroma stop
./docker-manager.sh chroma restart
./docker-manager.sh chroma logs
```

### Docker Compose命令

```bash
# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs

# 停止服务
docker-compose down

# 重建服务
docker-compose up -d --build

# 查看资源使用
docker-compose top
```

## 监控和调试

### 健康检查

```bash
# 运行Docker环境测试
node test_docker.js

# 检查容器健康状态
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Health}}"
```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs redis
docker-compose logs chroma

# 实时查看日志
docker-compose logs -f

# 查看最近100行日志
docker-compose logs --tail=100
```

### 资源监控

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df

# 查看网络使用
docker network ls
docker network inspect mcp-network
```

### 进入容器调试

```bash
# 进入Redis容器
docker exec -it mcp-redis bash

# 进入ChromaDB容器
docker exec -it mcp-chroma bash

# 在Redis容器中执行命令
docker exec mcp-redis redis-cli ping
docker exec mcp-redis redis-cli info

# 在ChromaDB容器中执行命令
docker exec mcp-chroma curl http://localhost:8000/api/v1/heartbeat
```

## 故障排除

### 常见问题

#### 1. 容器启动失败

**症状**: 容器状态显示为 `Exited` 或 `Error`

**解决方案**:
```bash
# 查看详细错误信息
docker-compose logs

# 检查端口冲突
netstat -tulpn | grep :6379
netstat -tulpn | grep :8000

# 重启Docker服务
sudo systemctl restart docker

# 清理并重新创建容器
docker-compose down
docker-compose up -d
```

#### 2. 数据持久化问题

**症状**: 重启后数据丢失

**解决方案**:
```bash
# 检查数据卷状态
docker volume ls
docker volume inspect mcp_redis_data

# 重新创建数据卷
docker-compose down -v
docker-compose up -d
```

#### 3. 网络连接问题

**症状**: 应用无法连接到Docker服务

**解决方案**:
```bash
# 检查网络配置
docker network ls
docker network inspect mcp-network

# 重建网络
docker-compose down
docker network prune
docker-compose up -d
```

#### 4. 内存不足

**症状**: 容器频繁重启或性能下降

**解决方案**:
```bash
# 增加Docker内存限制
# 在Docker Desktop设置中调整内存限制

# 监控内存使用
docker stats

# 清理未使用的资源
docker system prune -a
```

### 性能优化

#### 1. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  redis:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  chroma:
    # ... 其他配置
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

#### 2. 日志轮转

配置日志轮转以防止日志文件过大：

```yaml
services:
  redis:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  chroma:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### 3. 数据卷优化

使用本地存储以提高性能：

```yaml
volumes:
  redis_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /path/to/local/redis/data

  chroma_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /path/to/local/chroma/data
```

## 生产环境部署

### 安全配置

#### 1. 网络安全

```yaml
services:
  redis:
    # ... 其他配置
    networks:
      - internal
    expose:
      - "6379"

  chroma:
    # ... 其他配置
    networks:
      - internal
    expose:
      - "8000"

networks:
  internal:
    internal: true
  external:
    external: true
```

#### 2. 环境变量

使用 `.env` 文件管理敏感配置：

```bash
# .env
REDIS_PASSWORD=your_secure_password
CHROMA_SECRET=your_chroma_secret
```

```yaml
services:
  redis:
    # ... 其他配置
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    command: redis-server --requirepass ${REDIS_PASSWORD}
```

#### 3. 用户权限

```yaml
services:
  redis:
    # ... 其他配置
    user: "1000:1000"

  chroma:
    # ... 其他配置
    user: "1000:1000"
```

### 高可用配置

#### 1. 多实例部署

```yaml
services:
  redis:
    # ... 其他配置
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

  chroma:
    # ... 其他配置
    deploy:
      replicas: 2
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

#### 2. 负载均衡

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - chroma
```

### 监控和告警

#### 1. 健康检查增强

```yaml
services:
  redis:
    # ... 其他配置
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  chroma:
    # ... 其他配置
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8000/api/v1/heartbeat || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
```

#### 2. 日志聚合

```yaml
services:
  fluentd:
    image: fluent/fluentd:v1.14
    volumes:
      - ./fluentd/conf:/fluentd/etc
    ports:
      - "24224:24224"
      - "24224:24224/udp"

  redis:
    # ... 其他配置
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        tag: docker.{{.Name}}
```

## 开发和测试

### 开发环境

```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  redis:
    # ... 其他配置
    volumes:
      - ./dev/redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf

  chroma:
    # ... 其他配置
    environment:
      - CHROMA_SERVER_HOST=0.0.0.0
      - CHROMA_SERVER_HTTP_PORT=8000
      - CHROMA_SERVER_CORS_ALLOW_ORIGINS=["*"]
```

### 测试环境

```bash
# 运行Docker环境测试
node test_docker.js

# 运行集成测试
npm test

# 运行性能测试
npm run test:perf
```

## 总结

Docker环境为MCP协议服务提供了：

1. **环境一致性**: 确保开发、测试和生产环境的一致性
2. **易于部署**: 一键启动所有依赖服务
3. **数据持久化**: 可靠的数据存储和备份机制
4. **资源隔离**: 服务间相互隔离，提高安全性
5. **易于扩展**: 支持水平扩展和高可用部署
6. **监控友好**: 内置健康检查和日志管理

通过合理配置和管理，Docker环境可以显著提高服务的可靠性和可维护性。 