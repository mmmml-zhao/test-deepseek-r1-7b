import VectorStoreOptimized from './vector_store_optimized.js';
import DocumentProcessor from './document_processor.js';
import RerankerManager from './reranker_manager.js';
import { PathUtils, LogUtils } from './utils.js';

class RAGManagerOptimized {
    constructor(config = {}) {
        this.vectorStore = new VectorStoreOptimized();
        this.documentProcessor = new DocumentProcessor();
        this.reranker = new RerankerManager(config.reranker);
    }

    /**
     * 初始化RAG系统
     */
    async initialize() {
        try {
            await this.vectorStore.initialize();
            LogUtils.success('RAG系统初始化完成（优化版本）');
        } catch (error) {
            LogUtils.error('RAG系统初始化失败', error);
            throw error;
        }
    }

    /**
     * 添加文档到知识库（优化版本）
     * @param {string} documentsPath - 文档路径
     * @returns {Promise<Object>} - 处理结果
     */
    async addDocuments(documentsPath) {
        try {
            // 使用工具类展开路径
            const expandedPath = PathUtils.expandPath(documentsPath);
            LogUtils.log(`原始路径: ${documentsPath}`);
            LogUtils.log(`展开路径: ${expandedPath}`);

            const startTime = Date.now();
            const result = await this.vectorStore.addDocuments(expandedPath);
            const totalTime = Date.now() - startTime;

            LogUtils.success(`文档添加完成，总耗时: ${totalTime}ms`);
            return {
                ...result,
                totalTime
            };
        } catch (error) {
            LogUtils.error('添加文档失败', error);
            throw error;
        }
    }

    /**
     * 执行RAG查询
     * @param {string} query - 用户查询
     * @param {number} topK - 返回文档数量
     * @returns {Promise<Object>} - 包含相关文档和增强提示的对象
     */
    async query(query, topK = 5) {
        try {
            // 搜索相关文档
            const relevantDocs = await this.vectorStore.search(query, topK);

            // 使用重排序模型重新排序文档
            const rerankedDocs = await this.reranker.rerank(query, relevantDocs);

            // 构建增强提示
            const enhancedPrompt = this.buildEnhancedPrompt(query, rerankedDocs);

            return {
                query,
                relevantDocuments: rerankedDocs,
                originalDocuments: relevantDocs,
                enhancedPrompt,
                documentCount: rerankedDocs.length,
                rerankingApplied: rerankedDocs.length > 0 && rerankedDocs[0].rerankScore !== undefined
            };
        } catch (error) {
            LogUtils.error('RAG查询失败', error);
            throw error;
        }
    }

    /**
     * 构建增强提示
     * @param {string} query - 用户查询
     * @param {Array} relevantDocs - 相关文档
     * @returns {string} - 增强后的提示
     */
    buildEnhancedPrompt(query, relevantDocs) {
        if (!relevantDocs || relevantDocs.length === 0) {
            return query;
        }

        let context = "基于以下相关文档信息回答问题：\n\n";

        relevantDocs.forEach((doc, index) => {
            context += `文档 ${index + 1} (来源: ${doc.metadata.filename}):\n`;
            context += `${doc.content}\n\n`;
        });

        context += `用户问题: ${query}\n\n`;
        context += "请基于上述文档信息回答用户问题。如果文档中没有相关信息，请说明并基于你的知识回答。";

        return context;
    }

    /**
     * 获取知识库统计信息
     * @returns {Promise<Object>} - 统计信息
     */
    async getStats() {
        try {
            const vectorStats = await this.vectorStore.getStats();
            const processorStats = this.documentProcessor.getStats();
            const rerankerStats = this.reranker.getStats();

            return {
                vectorStore: vectorStats,
                documentProcessor: processorStats,
                reranker: rerankerStats,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            LogUtils.error('获取统计信息失败', error);
            throw error;
        }
    }

    /**
     * 清空知识库
     */
    async clearKnowledgeBase() {
        try {
            await this.vectorStore.clear();
            LogUtils.success('知识库已清空');
        } catch (error) {
            LogUtils.error('清空知识库失败', error);
            throw error;
        }
    }

    /**
     * 验证文档路径
     * @param {string} path - 文档路径
     * @returns {Promise<boolean>} - 是否有效
     */
    async validatePath(path) {
        return await PathUtils.validatePath(path);
    }
}

export default RAGManagerOptimized; 