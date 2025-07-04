import fetch from 'node-fetch';

/**
 * 调试重排序模型响应
 */
async function debugReranker() {
    console.log('🔍 调试重排序模型响应...\n');

    try {
        const model = 'dengcao/Qwen3-Reranker-4B:Q4_K_M';
        const baseUrl = 'http://localhost:11434';

        const testQuery = '学习人工智能';
        const testDocs = [
            { id: 1, content: '机器学习教程，包含基础概念和实践案例' },
            { id: 2, content: '烹饪指南，教你如何制作美味佳肴' },
            { id: 3, content: '深度学习入门，神经网络和算法详解' }
        ];

        // 构建提示
        let prompt = `你是一个专业的文档相关性评估专家。请评估以下文档与用户查询的相关性，并返回JSON格式的结果。

用户查询：${testQuery}

评估要求：
1. 分数范围：0.0-1.0，1.0表示最相关，0.0表示完全不相关
2. 考虑语义相似性、主题匹配度、信息价值等因素
3. 为每个文档提供简短的理由说明

请严格按照以下JSON格式返回结果：
{
    "query": "${testQuery}",
    "results": [`;

        testDocs.forEach((doc, index) => {
            const docId = doc.id || (index + 1);
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

        testDocs.forEach((doc, index) => {
            const docId = doc.id || (index + 1);
            prompt += `文档${docId}：${doc.content}\n\n`;
        });

        console.log('📝 发送的提示:');
        console.log(prompt);
        console.log();

        // 调用模型
        console.log('🚀 调用重排序模型...');
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                format: 'json',
                stream: true,
                options: {
                    temperature: 0
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

        console.log('📊 流式响应片段:');
        for await (const chunk of reader) {
            const line = chunk.toString().trim();
            if (line) {
                console.log(line);
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
        console.log();

        console.log('📄 拼接后的响应文本:');
        console.log(responseText);
        console.log();

        // 尝试解析模型响应的JSON
        try {
            const parsed = JSON.parse(responseText);
            console.log('✅ 模型响应JSON解析成功:');
            console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log('❌ 模型响应JSON解析失败:', e.message);

            // 尝试提取JSON部分
            const jsonMatch = responseText.match(/\{.*\}/s);
            if (jsonMatch) {
                console.log('🔍 尝试提取JSON部分...');
                try {
                    const extracted = JSON.parse(jsonMatch[0]);
                    console.log('✅ 提取的JSON:');
                    console.log(JSON.stringify(extracted, null, 2));
                } catch (e2) {
                    console.log('❌ 提取的JSON解析也失败:', e2.message);
                }
            }
        }

    } catch (error) {
        console.error('❌ 调试失败:', error);
    }
}

// 运行调试
debugReranker(); 