import fs from 'fs';
import path from 'path';

class DocumentProcessor {
    constructor() {
        this.supportedExtensions = ['.txt', '.md', '.js', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.json', '.xml', '.html', '.css'];
    }

    /**
     * 处理单个文件
     * @param {string} filePath - 文件路径
     * @returns {Promise<Object>} - 包含文本内容和元数据的对象
     */
    async processFile(filePath) {
        try {
            const ext = path.extname(filePath).toLowerCase();
            if (!this.supportedExtensions.includes(ext)) {
                throw new Error(`不支持的文件类型: ${ext}`);
            }

            const content = await fs.promises.readFile(filePath, 'utf-8');
            const stats = await fs.promises.stat(filePath);

            return {
                content: this.cleanText(content),
                metadata: {
                    source: filePath,
                    filename: path.basename(filePath),
                    extension: ext,
                    size: stats.size,
                    modified: stats.mtime.toISOString(),
                    type: this.getFileType(ext)
                }
            };
        } catch (error) {
            console.error(`处理文件失败 ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * 处理目录中的所有文件
     * @param {string} dirPath - 目录路径
     * @returns {Promise<Array>} - 处理后的文档数组
     */
    async processDirectory(dirPath) {
        const documents = [];

        try {
            const files = await this.getAllFiles(dirPath);

            for (const file of files) {
                try {
                    const doc = await this.processFile(file);
                    documents.push(doc);
                } catch (error) {
                    console.warn(`跳过文件 ${file}:`, error.message);
                }
            }

            return documents;
        } catch (error) {
            console.error(`处理目录失败 ${dirPath}:`, error);
            throw error;
        }
    }

    /**
     * 递归获取目录中的所有文件
     * @param {string} dirPath - 目录路径
     * @returns {Promise<Array>} - 文件路径数组
     */
    async getAllFiles(dirPath) {
        const files = [];

        const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);

            if (item.isDirectory()) {
                // 跳过node_modules和.git目录
                if (item.name === 'node_modules' || item.name === '.git' || item.name.startsWith('.') || item.name === 'dist') {
                    continue;
                }
                const subFiles = await this.getAllFiles(fullPath);
                files.push(...subFiles);
            } else if (item.isFile()) {
                const ext = path.extname(item.name).toLowerCase();
                if (this.supportedExtensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }

        return files;
    }

    /**
     * 清理文本内容
     * @param {string} text - 原始文本
     * @returns {string} - 清理后的文本
     */
    cleanText(text) {
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .trim();
    }

    /**
     * 获取文件类型
     * @param {string} ext - 文件扩展名
     * @returns {string} - 文件类型
     */
    getFileType(ext) {
        const typeMap = {
            '.txt': 'text',
            '.md': 'markdown',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'header',
            '.json': 'json',
            '.xml': 'xml',
            '.html': 'html',
            '.css': 'css'
        };
        return typeMap[ext] || 'unknown';
    }

    /**
     * 将文档分割成块
     * @param {string} text - 文档文本
     * @param {number} chunkSize - 块大小
     * @param {number} overlap - 重叠大小
     * @returns {Array} - 文本块数组
     */
    splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
        const chunks = [];
        let start = 0;

        while (start < text.length) {
            const end = Math.min(start + chunkSize, text.length);
            let chunk = text.slice(start, end);

            // 尝试在句子边界分割
            if (end < text.length) {
                const lastPeriod = chunk.lastIndexOf('.');
                const lastNewline = chunk.lastIndexOf('\n');
                const splitPoint = Math.max(lastPeriod, lastNewline);

                if (splitPoint > start + chunkSize * 0.5) {
                    chunk = text.slice(start, splitPoint + 1);
                    start = splitPoint + 1;
                } else {
                    start = end - overlap;
                }
            } else {
                start = end;
            }

            if (chunk.trim()) {
                chunks.push(chunk.trim());
            }
        }

        return chunks;
    }
}

export default DocumentProcessor; 