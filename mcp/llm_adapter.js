// mcp/llm_adapter.js
import fetch from 'node-fetch';
import RAGManagerOptimized from '../rag/rag_manager_optimized.js';

// Ollama API 配置
const OLLAMA_API_BASE = process.env.OLLAMA_API_BASE || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:7b';

class OllamaAdapter {
    constructor() {
        this.ragManager = new RAGManagerOptimized();
        this.ragEnabled = true; // 默认启用RAG
    }

    /**
     * 初始化RAG系统
     */
    async initializeRAG() {
        try {
            await this.ragManager.initialize();
            console.log('RAG系统已初始化');
        } catch (error) {
            console.error('RAG系统初始化失败:', error);
            this.ragEnabled = false;
        }
    }

    /**
     * 启用或禁用RAG
     * @param {boolean} enabled - 是否启用RAG
     */
    setRAGEnabled(enabled) {
        this.ragEnabled = enabled;
        console.log(`RAG功能已${enabled ? '启用' : '禁用'}`);
    }

    /**
     * 添加文档到知识库
     * @param {string} documentsPath - 文档路径
     * @returns {Promise<Object>} - 处理结果
     */
    async addDocuments(documentsPath) {
        try {
            return await this.ragManager.addDocuments(documentsPath);
        } catch (error) {
            console.error('添加文档失败:', error);
            throw error;
        }
    }

    /**
     * 获取知识库统计信息
     * @returns {Promise<Object>} - 统计信息
     */
    async getKnowledgeBaseStats() {
        try {
            console.log('getKnowledgeBaseStats', await this.ragManager.getStats())
            return await this.ragManager.getStats();
        } catch (error) {
            console.error('获取知识库统计失败:', error);
            throw error;
        }
    }

    /**
     * 清空知识库
     */
    async clearKnowledgeBase() {
        try {
            await this.ragManager.clearKnowledgeBase();
        } catch (error) {
            console.error('清空知识库失败:', error);
            throw error;
        }
    }

    /**
     * 生成响应
     * @param {Array} messages - 消息历史
     * @param {Object} context - 上下文参数
     * @returns {AsyncGenerator} - 响应流
     */
    async *generateResponse(messages, context) {
        const model = context?.model || DEFAULT_MODEL;
        const temperature = context?.temperature || 0.7;
        const useRAG = context?.useRAG !== false && this.ragEnabled;

        try {
            let finalMessages = [...messages];

            // 如果启用RAG且是用户消息，进行文档检索
            if (useRAG && messages.length > 0) {
                const lastMessage = messages[messages.length - 1];
                if (lastMessage.role === 'user') {
                    try {
                        const ragResult = await this.ragManager.query(lastMessage.content, 5);
                        console.log('ragResult', ragResult)
                        if (ragResult.documentCount > 0) {
                            // 创建系统消息，包含检索到的文档信息
                            const systemMessage = {
                                role: 'system',
                                content: `你是一个智能助手，拥有访问知识库的能力。以下是与你问题相关的文档信息：

${ragResult.relevantDocuments.map((doc, index) =>
                                    `文档 ${index + 1} (来源: ${doc.metadata.filename}):
${doc.content}`
                                ).join('\n\n')}

请基于这些文档信息回答用户问题。如果文档中没有相关信息，请基于你的知识回答，并说明信息来源。`
                            };

                            // 将系统消息插入到消息列表的开头
                            finalMessages = [systemMessage, ...messages];
                        }
                    } catch (ragError) {
                        console.warn('RAG检索失败，使用原始消息:', ragError.message);
                    }
                }
            }

            const response = await fetch(`${OLLAMA_API_BASE}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: finalMessages,
                    stream: true,
                    options: {
                        temperature,
                        top_p: context?.top_p || 0.9,
                        num_ctx: context?.context_length || 4096,
                        seed: context?.seed || Date.now(),
                    }
                })
            });

            if (!response.ok || !response.body) {
                const errorData = await response.text();
                throw new Error(`Ollama API 错误: ${response.status} ${response.statusText}\n${errorData}`);
            }

            // 处理 Node.js 流
            const reader = response.body;

            for await (const chunk of reader) {
                const parsed = JSON.parse(chunk.toString());
                yield {
                    choices: [{
                        delta: {
                            content: parsed?.message?.content || '',
                            role: parsed?.message?.role || 'assistant'
                        }
                    }]
                };
            }
        } catch (error) {
            console.error('模型调用失败:', error);

            // 返回错误消息
            yield {
                choices: [{
                    delta: {
                        content: `⚠️ 模型调用失败: ${error.message}\n请检查: \n1. Ollama 服务是否运行\n2. 模型是否下载\n3. 网络连接`,
                        role: 'system'
                    }
                }]
            };

            yield {
                choices: [{
                    delta: {
                        content: '',
                        finish_reason: 'error'
                    }
                }]
            };
        }
    }
}

const adapter = new OllamaAdapter();

// 初始化RAG系统
adapter.initializeRAG().catch(error => {
    console.error('RAG系统初始化失败:', error);
});

export default adapter;