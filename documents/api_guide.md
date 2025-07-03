# API使用指南

## REST API接口

### 1. 添加文档到知识库

**接口**: `POST /api/rag/add-documents`

**请求体**:
```json
{
  "documentsPath": "/path/to/documents"
}
```

**响应**:
```json
{
  "success": true,
  "result": {
    "documentsProcessed": 5,
    "chunksCreated": 25
  }
}
```

### 2. 获取知识库统计信息

**接口**: `GET /api/rag/stats`

**响应**:
```json
{
  "success": true,
  "stats": {
    "totalDocuments": 25,
    "collectionName": "rag_documents"
  }
}
```

### 3. 清空知识库

**接口**: `DELETE /api/rag/clear`

**响应**:
```json
{
  "success": true,
  "message": "知识库已清空"
}
```

### 4. 切换RAG状态

**接口**: `POST /api/rag/toggle`

**请求体**:
```json
{
  "enabled": true
}
```

**响应**:
```json
{
  "success": true,
  "ragEnabled": true
}
```

### 5. 获取RAG状态

**接口**: `GET /api/rag/status`

**响应**:
```json
{
  "success": true,
  "ragEnabled": true
}
```

## WebSocket事件

### 1. 添加文档

```javascript
socket.emit('rag_add_documents', { 
  documentsPath: '/path/to/documents' 
}, (response) => {
  if (response.success) {
    console.log('文档添加成功:', response.result);
  } else {
    console.error('添加失败:', response.error);
  }
});
```

### 2. 获取统计信息

```javascript
socket.emit('rag_get_stats', (response) => {
  if (response.success) {
    console.log('统计信息:', response.stats);
  } else {
    console.error('获取失败:', response.error);
  }
});
```

### 3. 清空知识库

```javascript
socket.emit('rag_clear', (response) => {
  if (response.success) {
    console.log('知识库已清空');
  } else {
    console.error('清空失败:', response.error);
  }
});
```

### 4. 切换RAG状态

```javascript
socket.emit('rag_toggle', { enabled: true }, (response) => {
  if (response.success) {
    console.log('RAG状态已切换:', response.ragEnabled);
  } else {
    console.error('切换失败:', response.error);
  }
});
```

### 5. 获取RAG状态

```javascript
socket.emit('rag_status', (response) => {
  if (response.success) {
    console.log('RAG状态:', response.ragEnabled);
  }
});
```

## 错误处理

### 常见错误码

- `400`: 请求参数错误
- `500`: 服务器内部错误
- `503`: 服务不可用

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

## 使用示例

### JavaScript客户端示例

```javascript
// 连接WebSocket
const socket = io('http://localhost:3000');

// 添加文档
function addDocuments(path) {
  socket.emit('rag_add_documents', { documentsPath: path }, (response) => {
    if (response.success) {
      console.log(`处理了 ${response.result.documentsProcessed} 个文档`);
    } else {
      console.error('添加失败:', response.error);
    }
  });
}

// 获取统计
function getStats() {
  socket.emit('rag_get_stats', (response) => {
    if (response.success) {
      console.log(`知识库中有 ${response.stats.totalDocuments} 个文档`);
    }
  });
}

// 切换RAG状态
function toggleRAG(enabled) {
  socket.emit('rag_toggle', { enabled }, (response) => {
    if (response.success) {
      console.log(`RAG已${response.ragEnabled ? '启用' : '禁用'}`);
    }
  });
}
```

### cURL示例

```bash
# 添加文档
curl -X POST http://localhost:3000/api/rag/add-documents \
  -H "Content-Type: application/json" \
  -d '{"documentsPath": "/path/to/documents"}'

# 获取统计
curl http://localhost:3000/api/rag/stats

# 切换RAG状态
curl -X POST http://localhost:3000/api/rag/toggle \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# 清空知识库
curl -X DELETE http://localhost:3000/api/rag/clear
```

## 最佳实践

1. **错误处理**: 始终检查响应中的success字段
2. **异步操作**: 文档添加是异步操作，需要等待回调
3. **状态管理**: 定期检查RAG状态和知识库统计
4. **资源清理**: 定期清理不需要的文档
5. **监控**: 监控API调用频率和响应时间 