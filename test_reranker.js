import RerankerManager from './rag/reranker_manager.js';
import config from './rag/config.js';

/**
 * 测试重排序功能
 */
async function testReranker() {
    console.log('🚀 开始测试重排序功能...\n');

    try {
        // 创建重排序管理器
        const reranker = new RerankerManager(config.reranker);

        console.log('📊 重排序配置:');
        console.log(JSON.stringify(reranker.getStats(), null, 2));
        console.log();

        // 测试重排序模型
        console.log('🧪 测试重排序模型...');
        const testSuccess = await reranker.testReranker();

        if (!testSuccess) {
            console.log('❌ 重排序模型测试失败，请检查模型是否正确下载和运行');
            return;
        }

        // 测试实际查询场景
        console.log('\n🔍 测试实际查询场景...');

        const testQuery = '如何学习机器学习？';
        const testDocs = [
            {
                id: 1,
                content: '机器学习是人工智能的一个分支，通过算法让计算机从数据中学习模式。',
                metadata: { filename: 'ml_intro.md' }
            },
            {
                id: 2,
                content: 'Python是一种流行的编程语言，广泛用于数据科学和机器学习。',
                metadata: { filename: 'python_guide.md' }
            },
            {
                id: 3,
                content: '深度学习是机器学习的一个子领域，使用神经网络进行复杂模式识别。',
                metadata: { filename: 'deep_learning.md' }
            },
            {
                id: 4,
                content: '烹饪技巧：如何制作美味的意大利面，包括面条选择和酱料搭配。',
                metadata: { filename: 'cooking.md' }
            },
            {
                id: 5,
                content: '机器学习项目实战：从数据预处理到模型部署的完整流程。',
                metadata: { filename: 'ml_project.md' }
            }
        ];

        console.log(`查询: "${testQuery}"`);
        console.log(`文档数量: ${testDocs.length}`);
        console.log();

        // 执行重排序
        const rerankedDocs = await reranker.rerank(testQuery, testDocs);

        console.log('📈 重排序结果:');
        rerankedDocs.forEach((doc, index) => {
            console.log(`${index + 1}. 文档${doc.id} (${doc.metadata.filename})`);
            console.log(`   重排序分数: ${doc.rerankScore?.toFixed(3) || 'N/A'}`);
            console.log(`   原始排名: ${doc.originalRank || 'N/A'}`);
            console.log(`   内容: ${doc.content.substring(0, 60)}...`);
            console.log();
        });

        // 测试批量重排序
        console.log('🔄 测试批量重排序...');
        const batchRerankedDocs = await reranker.batchRerank(testQuery, testDocs, 3);

        console.log('📊 批量重排序结果:');
        batchRerankedDocs.forEach((doc, index) => {
            console.log(`${index + 1}. 文档${doc.id} - 分数: ${doc.rerankScore?.toFixed(3) || 'N/A'}`);
        });

        console.log('\n✅ 重排序功能测试完成！');

    } catch (error) {
        console.error('❌ 重排序测试失败:', error);
    }
}

// 运行测试
testReranker(); 