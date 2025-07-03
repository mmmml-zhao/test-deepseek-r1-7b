import { homedir } from 'os';
import { resolve } from 'path';

/**
 * 路径工具类
 */
export class PathUtils {
    /**
     * 展开路径中的 ~ 为用户主目录
     * @param {string} path - 原始路径
     * @returns {string} - 展开后的路径
     */
    static expandPath(path) {
        if (path.startsWith('~')) {
            const home = homedir();
            console.log(`用户主目录: ${home}`);
            const relativePath = path.slice(1).startsWith('/') ? path.slice(2) : path.slice(1);
            const expanded = resolve(home, relativePath);
            console.log(`完整展开路径: ${expanded}`);
            return expanded;
        }
        return resolve(path);
    }

    /**
     * 验证路径是否存在
     * @param {string} path - 路径
     * @returns {Promise<boolean>} - 是否存在
     */
    static async validatePath(path) {
        try {
            const fs = await import('fs');
            const expandedPath = this.expandPath(path);
            const stats = await fs.promises.stat(expandedPath);
            return stats.isFile() || stats.isDirectory();
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取路径信息
     * @param {string} path - 路径
     * @returns {Promise<Object>} - 路径信息
     */
    static async getPathInfo(path) {
        try {
            const fs = await import('fs');
            const expandedPath = this.expandPath(path);
            const stats = await fs.promises.stat(expandedPath);

            return {
                originalPath: path,
                expandedPath: expandedPath,
                exists: true,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modifiedTime: stats.mtime
            };
        } catch (error) {
            return {
                originalPath: path,
                expandedPath: this.expandPath(path),
                exists: false,
                error: error.message
            };
        }
    }
}

/**
 * 日志工具类
 */
export class LogUtils {
    /**
     * 打印带时间戳的日志
     * @param {string} message - 日志消息
     * @param {string} level - 日志级别 (info, warn, error)
     */
    static log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: 'ℹ️',
            warn: '⚠️',
            error: '❌'
        }[level] || 'ℹ️';

        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    /**
     * 打印成功消息
     * @param {string} message - 消息
     */
    static success(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ✅ ${message}`);
    }

    /**
     * 打印错误消息
     * @param {string} message - 错误消息
     * @param {Error | null} error - 错误对象
     */
    static error(message, error = null) {
        const timestamp = new Date().toISOString();
        console.error(`[${timestamp}] ❌ ${message}`);
        if (error) {
            console.error(`[${timestamp}] ❌ 错误详情:`, error);
        }
    }
} 