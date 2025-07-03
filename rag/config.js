/**
 * RAG系统配置文件
 * 用于调整性能和功能参数
 */

export const RAG_CONFIG = {
    // 向量存储配置
    vectorStore: {
        // 批次大小 - 每批处理的文本块数量
        batchSize: 100,

        // 并发批次数量 - 同时处理的批次数量
        maxConcurrentBatches: 5,

        // 集合名称
        collectionName: 'rag_documents',

        // 嵌入模型配置
        embeddings: {
            model: 'dengcao/Qwen3-Embedding-4B:Q4_K_M',
            baseUrl: process.env.OLLAMA_API_BASE || 'http://localhost:11434',
            dimension: 2560  // Qwen3-Embedding-4B 量化版本的维度
        }
    },

    // 文档处理配置
    documentProcessor: {
        // 支持的文件扩展名
        supportedExtensions: [
            '.txt', '.md', '.js', '.ts', '.tsx', '.py', '.java',
            '.cpp', '.c', '.h', '.json', '.xml', '.html', '.css'
        ],

        // 文本块分割配置
        chunking: {
            chunkSize: 1000,    // 块大小（字符数）
            overlap: 200        // 重叠大小（字符数）
        },

        // 跳过目录
        skipDirectories: ['node_modules', '.git', '.vscode', 'dist', 'build']
    },

    // 搜索配置
    search: {
        defaultTopK: 5,         // 默认返回结果数量
        maxTopK: 20             // 最大返回结果数量
    },

    // 性能优化配置
    performance: {
        // 是否启用缓存
        enableCache: true,

        // 缓存大小限制
        maxCacheSize: 1000,

        // 是否启用压缩
        enableCompression: false,

        // 超时设置（毫秒）
        timeouts: {
            embedding: 30000,   // 嵌入生成超时
            search: 10000,      // 搜索超时
            addDocuments: 300000 // 添加文档超时
        }
    },

    // 日志配置
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enablePerformanceLogging: true,
        enableDetailedLogging: false
    }
};

/**
 * 根据环境调整配置
 */
export function getOptimizedConfig() {
    const config = { ...RAG_CONFIG };

    // 根据环境变量调整性能参数
    if (process.env.NODE_ENV === 'production') {
        // 生产环境：更大的批次，更多并发
        config.vectorStore.batchSize = 100;
        config.vectorStore.maxConcurrentBatches = 5;
        config.performance.enableCache = true;
        config.logging.enableDetailedLogging = false;
    } else if (process.env.NODE_ENV === 'development') {
        // 开发环境：较小的批次，便于调试
        config.vectorStore.batchSize = 20;
        config.vectorStore.maxConcurrentBatches = 2;
        config.logging.enableDetailedLogging = true;
    }

    // 根据内存限制调整
    const memoryLimit = process.env.MEMORY_LIMIT;
    if (memoryLimit) {
        const limitMB = parseInt(memoryLimit);
        if (limitMB < 512) {
            // 低内存环境：减小批次大小
            config.vectorStore.batchSize = Math.min(config.vectorStore.batchSize, 25);
            config.vectorStore.maxConcurrentBatches = Math.min(config.vectorStore.maxConcurrentBatches, 2);
        } else if (limitMB > 2048) {
            // 高内存环境：增加批次大小
            config.vectorStore.batchSize = Math.max(config.vectorStore.batchSize, 75);
            config.vectorStore.maxConcurrentBatches = Math.max(config.vectorStore.maxConcurrentBatches, 4);
        }
    }

    return config;
}

export default RAG_CONFIG; 