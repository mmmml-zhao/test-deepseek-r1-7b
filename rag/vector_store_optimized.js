import { ChromaClient } from 'chromadb';
import { OllamaEmbeddings } from '@langchain/ollama';
import DocumentProcessor from './document_processor.js';
import { PathUtils, LogUtils } from './utils.js';

class VectorStoreOptimized {
    constructor() {
        this.client = new ChromaClient();
        this.collection = null;
        this.embeddings = new OllamaEmbeddings({
            model: 'dengcao/Qwen3-Embedding-4B:Q4_K_M',
            baseUrl: process.env.OLLAMA_API_BASE || 'http://localhost:11434'
        });
        this.documentProcessor = new DocumentProcessor();
        this.collectionName = 'rag_documents';
        this.batchSize = 50; // 增加批次大小
        this.maxConcurrentBatches = 3; // 并发处理批次数量
    }

    /**
     * 初始化向量存储
     */
    async initialize() {
        try {
            // 检查集合是否存在，如果不存在则创建
            const collections = await this.client.listCollections();
            const collectionExists = collections.some(col => col.name === this.collectionName);

            if (!collectionExists) {
                this.collection = await this.client.createCollection({
                    name: this.collectionName,
                    metadata: {
                        description: 'RAG文档向量存储',
                        embedding_model: 'dengcao/Qwen3-Embedding-4B:Q4_K_M',
                        embedding_dimension: 2560,
                        quantization: 'Q4_K_M',
                        created_at: new Date().toISOString()
                    }
                });
                LogUtils.success('创建新的向量存储集合 (维度: 2560)');
            } else {
                this.collection = await this.client.getCollection({
                    name: this.collectionName
                });
                LogUtils.success('连接到现有向量存储集合');
            }
        } catch (error) {
            LogUtils.error('初始化向量存储失败', error);
            throw error;
        }
    }

    /**
     * 清理元数据，确保所有值都是ChromaDB支持的类型
     * @param {Object} metadata - 原始元数据
     * @returns {Object} - 清理后的元数据
     */
    cleanMetadata(metadata) {
        const cleaned = {};
        for (const [key, value] of Object.entries(metadata)) {
            if (value === null || value === undefined) {
                cleaned[key] = null;
            } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                cleaned[key] = value;
            } else if (value instanceof Date) {
                cleaned[key] = value.toISOString();
            } else if (typeof value === 'object') {
                // 递归清理嵌套对象
                cleaned[key] = this.cleanMetadata(value);
            } else {
                // 将其他类型转换为字符串
                cleaned[key] = String(value);
            }
        }
        return cleaned;
    }

    /**
     * 批量生成嵌入向量
     * @param {Array} texts - 文本数组
     * @returns {Promise<Array>} - 嵌入向量数组
     */
    async generateEmbeddingsBatch(texts) {
        try {
            // 使用批量嵌入方法（如果支持）
            if (this.embeddings.embedDocuments) {
                return await this.embeddings.embedDocuments(texts);
            } else {
                // 回退到并行处理单个嵌入
                return await Promise.all(
                    texts.map(text => this.embeddings.embedQuery(text))
                );
            }
        } catch (error) {
            LogUtils.error('生成嵌入向量失败', error);
            throw error;
        }
    }

    /**
     * 处理单个批次
     * @param {Array} batch - 批次数据
     * @param {number} batchIndex - 批次索引
     * @returns {Promise<void>}
     */
    async processBatch(batch, batchIndex) {
        try {
            const startTime = Date.now();

            // 并行生成嵌入向量
            const texts = batch.map(chunk => chunk.content);
            const embeddings = await this.generateEmbeddingsBatch(texts);

            const documents = batch.map(chunk => chunk.content);
            const metadatas = batch.map(chunk => chunk.metadata);
            const ids = batch.map((_, index) => `${batchIndex}_${index}_${Date.now()}`);

            await this.collection?.add({
                ids,
                embeddings,
                documents,
                metadatas
            });

            const duration = Date.now() - startTime;
            LogUtils.log(`批次 ${batchIndex + 1} 完成，耗时 ${duration}ms，处理了 ${batch.length} 个文本块`);
        } catch (error) {
            LogUtils.error(`处理批次 ${batchIndex + 1} 失败`, error);
            throw error;
        }
    }

    /**
     * 添加文档到向量存储（优化版本）
     * @param {string} documentsPath - 文档路径（文件或目录）
     */
    async addDocuments(documentsPath) {
        try {
            await this.initialize();

            // 使用工具类展开路径
            const expandedPath = PathUtils.expandPath(documentsPath);
            LogUtils.log(`VectorStore - 原始路径: ${documentsPath}`);
            LogUtils.log(`VectorStore - 展开路径: ${expandedPath}`);

            const fs = await import('fs');

            const stats = await fs.promises.stat(expandedPath);
            let documents = [];

            if (stats.isFile()) {
                // 处理单个文件
                const doc = await this.documentProcessor.processFile(expandedPath);
                documents.push(doc);
            } else if (stats.isDirectory()) {
                // 处理目录
                documents = await this.documentProcessor.processDirectory(expandedPath);
            } else {
                throw new Error('路径既不是文件也不是目录');
            }

            LogUtils.log(`处理了 ${documents.length} 个文档`);

            // 将文档分割成块并向量化
            const chunks = [];
            for (const doc of documents) {
                const textChunks = this.documentProcessor.splitIntoChunks(doc.content);

                for (let i = 0; i < textChunks.length; i++) {
                    chunks.push({
                        content: textChunks[i],
                        metadata: this.cleanMetadata({
                            ...doc.metadata,
                            chunkIndex: i,
                            totalChunks: textChunks.length
                        })
                    });
                }
            }

            LogUtils.log(`生成了 ${chunks.length} 个文本块`);

            // 分批处理
            const batches = [];
            for (let i = 0; i < chunks.length; i += this.batchSize) {
                batches.push(chunks.slice(i, i + this.batchSize));
            }

            LogUtils.log(`将分 ${batches.length} 个批次处理，每批 ${this.batchSize} 个文本块`);

            // 并发处理批次
            const startTime = Date.now();
            for (let i = 0; i < batches.length; i += this.maxConcurrentBatches) {
                const currentBatches = batches.slice(i, i + this.maxConcurrentBatches);
                const batchPromises = currentBatches.map((batch, index) =>
                    this.processBatch(batch, i + index)
                );

                await Promise.all(batchPromises);

                const progress = Math.min(i + this.maxConcurrentBatches, batches.length);
                LogUtils.log(`进度: ${progress}/${batches.length} 批次完成`);
            }

            const totalDuration = Date.now() - startTime;
            LogUtils.success(`所有文档已成功添加到向量存储，总耗时: ${totalDuration}ms`);
            return {
                success: true,
                documentsProcessed: documents.length,
                chunksCreated: chunks.length,
                totalDuration: totalDuration
            };
        } catch (error) {
            LogUtils.error('添加文档失败', error);
            throw error;
        }
    }

    /**
     * 搜索相关文档
     * @param {string} query - 查询文本
     * @param {number} topK - 返回结果数量
     * @returns {Promise<Array>} - 相关文档数组
     */
    async search(query, topK = 5) {
        try {
            await this.initialize();

            const queryEmbedding = await this.embeddings.embedQuery(query);

            const results = await this.collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: topK
            });

            return results.documents[0].map((doc, index) => ({
                content: doc,
                metadata: results.metadatas[0][index],
                distance: results.distances[0][index]
            }));
        } catch (error) {
            LogUtils.error('搜索失败', error);
            throw error;
        }
    }

    /**
     * 获取集合统计信息
     * @returns {Promise<Object>} - 统计信息
     */
    async getStats() {
        try {
            await this.initialize();

            const count = await this.collection.count();
            return {
                totalDocuments: count,
                collectionName: this.collectionName
            };
        } catch (error) {
            LogUtils.error('获取统计信息失败', error);
            throw error;
        }
    }

    /**
     * 清空向量存储
     */
    async clear() {
        try {
            await this.initialize();
            // 删除整个集合
            await this.client.deleteCollection({ name: this.collectionName });
            // 重新创建集合
            this.collection = await this.client.createCollection({
                name: this.collectionName,
                metadata: { description: 'RAG文档向量存储' }
            });
            LogUtils.success('向量存储已彻底清空');
        } catch (error) {
            LogUtils.error('清空向量存储失败', error);
            throw error;
        }
    }
}

export default VectorStoreOptimized; 