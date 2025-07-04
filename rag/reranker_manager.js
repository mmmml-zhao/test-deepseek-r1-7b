import fetch from 'node-fetch';
import { LogUtils } from './utils.js';

/**
 * 重排序管理器
 * 使用 Qwen3-Reranker-4B 模型对检索结果进行重排序
 */
class RerankerManager {
    constructor(config = {}) {
        this.config = {
            model: config.model || 'dengcao/Qwen3-Reranker-4B:Q4_K_M',
            baseUrl: config.baseUrl || 'http://localhost:11434',
            temperature: config.temperature || 0,
            maxRetries: config.maxRetries || 3,
            timeout: config.timeout || 30000,
            enableReranking: config.enableReranking !== false
        };

        LogUtils.log(`重排序管理器初始化 - 模型: ${this.config.model}`);
    }

    /**
     * 构建重排序提示
     * @param {string} query - 用户查询
     * @param {Array} documents - 文档数组
     * @returns {string} - 格式化的提示
     */
    buildRerankPrompt(query, documents) {
        let prompt = `你是一个专业的文档相关性评估专家。请评估以下文档与用户查询的相关性，并返回JSON格式的结果。

用户查询：${query}

评估要求：
1. 分数范围：0.0-1.0，1.0表示最相关，0.0表示完全不相关
2. 考虑语义相似性、主题匹配度、信息价值等因素
3. 为每个文档提供简短的理由说明

请严格按照以下JSON格式返回结果：
{
    "query": "${query}",
    "results": [`;

        documents.forEach((doc, index) => {
            const docId = doc.id || doc.metadata?.id || (index + 1);
            prompt += `
        {
            "id": ${docId},
            "score": 0.0,
            "reason": "评估理由"
        },`;
        });

        // 移除最后一个逗号
        prompt = prompt.slice(0, -1);
        prompt += `
    ]
}

文档内容：
`;

        documents.forEach((doc, index) => {
            const docId = doc.id || doc.metadata?.id || (index + 1);
            const docContent = doc.content || doc.text || '';
            prompt += `文档${docId}：${docContent}\n\n`;
        });

        return prompt;
    }

    /**
     * 调用重排序模型
     * @param {string} query - 用户查询
     * @param {Array} documents - 文档数组
     * @returns {Promise<Array>} - 重排序后的文档数组
     */
    async rerank(query, documents) {
        if (!this.config.enableReranking || documents.length === 0) {
            return documents;
        }

        try {
            LogUtils.log(`开始重排序 - 查询: "${query}", 文档数量: ${documents.length}`);

            const prompt = this.buildRerankPrompt(query, documents);

            const response = await fetch(`${this.config.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.config.model,
                    prompt: prompt,
                    format: 'json',
                    stream: true,
                    options: {
                        temperature: this.config.temperature
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // 处理流式响应
            let responseText = '';
            const reader = response.body;

            if (!reader) {
                throw new Error('响应体为空');
            }

            for await (const chunk of reader) {
                const line = chunk.toString().trim();
                if (line) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response !== undefined) {
                            responseText += data.response;
                        }
                    } catch (e) {
                        // 忽略解析错误的行
                    }
                }
            }

            LogUtils.log(`重排序模型响应: ${responseText}`);

            // 解析重排序结果
            const rerankedDocs = this.parseRerankResponse(responseText, documents);

            LogUtils.success(`重排序完成 - 处理了 ${rerankedDocs.length} 个文档`);
            return rerankedDocs;

        } catch (error) {
            LogUtils.error('重排序失败', error);
            // 如果重排序失败，返回原始排序
            return documents;
        }
    }

    /**
     * 解析重排序响应
     * @param {string} responseText - 模型响应文本
     * @param {Array} originalDocs - 原始文档数组
     * @returns {Array} - 重排序后的文档数组
     */
    parseRerankResponse(responseText, originalDocs) {
        try {
            // 尝试解析 JSON 响应
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                // 如果不是有效的 JSON，尝试提取 JSON 部分
                const jsonMatch = responseText.match(/\{.*\}/s);
                if (jsonMatch) {
                    responseData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('无法解析响应为 JSON');
                }
            }

            // 检查是否有 results 字段
            if (responseData.results && Array.isArray(responseData.results)) {
                const rerankedDocs = [];

                responseData.results.forEach(rankedDoc => {
                    const docId = rankedDoc.id;
                    const score = rankedDoc.score || 0;

                    // 找到对应的原始文档
                    const originalDoc = originalDocs.find(doc => {
                        const docIdToMatch = doc.id || doc.metadata?.id ||
                            (originalDocs.indexOf(doc) + 1);
                        return docIdToMatch == docId;
                    });

                    if (originalDoc) {
                        rerankedDocs.push({
                            ...originalDoc,
                            rerankScore: score,
                            originalRank: originalDocs.indexOf(originalDoc) + 1
                        });
                    }
                });

                // 按重排序分数降序排列
                rerankedDocs.sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0));

                return rerankedDocs;
            }

            // 如果只有单个文档结果（模型可能只返回了部分结果）
            if (responseData.id && responseData.score !== undefined) {
                const docId = responseData.id;
                const score = responseData.score || 0;

                // 找到对应的原始文档
                const originalDoc = originalDocs.find(doc => {
                    const docIdToMatch = doc.id || doc.metadata?.id ||
                        (originalDocs.indexOf(doc) + 1);
                    return docIdToMatch == docId;
                });

                if (originalDoc) {
                    // 为其他文档分配默认分数
                    const rerankedDocs = originalDocs.map((doc, index) => {
                        const docIdToMatch = doc.id || doc.metadata?.id || (index + 1);
                        const isTargetDoc = docIdToMatch == docId;

                        return {
                            ...doc,
                            rerankScore: isTargetDoc ? score : 0.1, // 其他文档给较低分数
                            originalRank: index + 1
                        };
                    });

                    // 按重排序分数降序排列
                    rerankedDocs.sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0));

                    return rerankedDocs;
                }
            }

            // 如果没有 ranked_docs 字段，尝试其他格式
            LogUtils.log('响应格式不符合预期，使用原始排序');
            return originalDocs;

        } catch (error) {
            LogUtils.error('解析重排序响应失败', error);
            return originalDocs;
        }
    }

    /**
     * 批量重排序（优化版本）
     * @param {string} query - 用户查询
     * @param {Array} documents - 文档数组
     * @param {number} batchSize - 批次大小
     * @returns {Promise<Array>} - 重排序后的文档数组
     */
    async batchRerank(query, documents, batchSize = 10) {
        if (!this.config.enableReranking || documents.length === 0) {
            return documents;
        }

        try {
            LogUtils.log(`开始批量重排序 - 查询: "${query}", 文档数量: ${documents.length}, 批次大小: ${batchSize}`);

            const rerankedDocs = [];

            // 分批处理
            for (let i = 0; i < documents.length; i += batchSize) {
                const batch = documents.slice(i, i + batchSize);
                const batchReranked = await this.rerank(query, batch);
                rerankedDocs.push(...batchReranked);

                LogUtils.log(`批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)} 完成`);
            }

            // 最终排序
            rerankedDocs.sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0));

            LogUtils.success(`批量重排序完成 - 处理了 ${rerankedDocs.length} 个文档`);
            return rerankedDocs;

        } catch (error) {
            LogUtils.error('批量重排序失败', error);
            return documents;
        }
    }

    /**
     * 测试重排序模型
     * @returns {Promise<boolean>} - 测试是否成功
     */
    async testReranker() {
        try {
            LogUtils.log('测试重排序模型...');

            const testQuery = '学习人工智能';
            const testDocs = [
                { id: 1, content: '机器学习教程，包含基础概念和实践案例' },
                { id: 2, content: '烹饪指南，教你如何制作美味佳肴' },
                { id: 3, content: '深度学习入门，神经网络和算法详解' }
            ];

            const rerankedDocs = await this.rerank(testQuery, testDocs);

            if (rerankedDocs.length > 0 && rerankedDocs[0].rerankScore !== undefined) {
                LogUtils.success('重排序模型测试成功');
                LogUtils.log('测试结果:');
                rerankedDocs.forEach((doc, index) => {
                    LogUtils.log(`  ${index + 1}. 文档${doc.id}: 分数=${doc.rerankScore?.toFixed(3)}, 内容="${doc.content}"`);
                });
                return true;
            } else {
                LogUtils.log('重排序模型测试失败 - 未返回有效分数');
                return false;
            }

        } catch (error) {
            LogUtils.error('重排序模型测试失败', error);
            return false;
        }
    }

    /**
     * 获取重排序统计信息
     * @returns {Object} - 统计信息
     */
    getStats() {
        return {
            model: this.config.model,
            enabled: this.config.enableReranking,
            temperature: this.config.temperature,
            maxRetries: this.config.maxRetries,
            timeout: this.config.timeout
        };
    }
}

export default RerankerManager; 