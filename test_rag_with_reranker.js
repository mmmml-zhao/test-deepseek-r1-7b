import RAGManagerOptimized from './rag/rag_manager_optimized.js';
import config from './rag/config.js';
import { LogUtils } from './rag/utils.js';

/**
 * 测试包含重排序功能的完整RAG系统
 */
async function testRAGWithReranker() {
    console.log('🚀 开始测试包含重排序功能的RAG系统...\n');

    try {
        // 创建RAG管理器
        const ragManager = new RAGManagerOptimized(config);

        console.log('📊 RAG系统配置:');
        console.log(JSON.stringify(await ragManager.getStats(), null, 2));
        console.log();

        // 初始化RAG系统
        console.log('🔧 初始化RAG系统...');
        await ragManager.initialize();
        console.log('✅ RAG系统初始化完成\n');

        // 测试文档添加
        console.log('📚 测试文档添加...');
        const documentsPath = './documents';
        const addResult = await ragManager.addDocuments(documentsPath);
        console.log('✅ 文档添加完成:', addResult);
        console.log();

        // 测试查询（包含重排序）
        console.log('🔍 测试RAG查询（包含重排序）...');

        const testQueries = [
            '如何学习机器学习？',
            '什么是深度学习？',
            'Python编程基础',
            '如何配置Docker环境？'
        ];

        for (const query of testQueries) {
            console.log(`\n📝 查询: "${query}"`);

            const result = await ragManager.query(query, 5);

            console.log(`📊 查询结果:`);
            console.log(`  - 文档数量: ${result.documentCount}`);
            console.log(`  - 重排序已应用: ${result.rerankingApplied ? '是' : '否'}`);

            if (result.relevantDocuments.length > 0) {
                console.log(`  - 相关文档:`);
                result.relevantDocuments.forEach((doc, index) => {
                    console.log(`    ${index + 1}. ${doc.metadata.filename}`);
                    console.log(`       重排序分数: ${doc.rerankScore?.toFixed(3) || 'N/A'}`);
                    console.log(`       内容预览: ${doc.content.substring(0, 80)}...`);
                });
            }

            console.log(`  - 增强提示长度: ${result.enhancedPrompt.length} 字符`);
        }

        // 获取最终统计信息
        console.log('\n📈 最终系统统计信息:');
        const finalStats = await ragManager.getStats();
        console.log(JSON.stringify(finalStats, null, 2));

        console.log('\n✅ RAG系统测试完成！');

    } catch (error) {
        console.error('❌ RAG系统测试失败:', error);
    }
}

// 运行测试
testRAGWithReranker(); 