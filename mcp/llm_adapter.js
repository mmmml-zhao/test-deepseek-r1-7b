// mcp/llm_adapter.js
import fetch from 'node-fetch';

// Ollama API 配置
const OLLAMA_API_BASE = process.env.OLLAMA_API_BASE || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:7b';

class OllamaAdapter {
    /**
     * 生成响应
     * @param {Array} messages - 消息历史
     * @param {Object} context - 上下文参数
     * @returns {AsyncGenerator} - 响应流
     */
    async *generateResponse(messages, context) {
        const model = context?.model || DEFAULT_MODEL;
        const temperature = context?.temperature || 0.7;

        try {
            const response = await fetch(`${OLLAMA_API_BASE}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages,
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

export default new OllamaAdapter();