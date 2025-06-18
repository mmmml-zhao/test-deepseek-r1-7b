import redisClient from '../redis.js';

class SessionManager {
    async getSession(sessionId) {
        const data = await redisClient.get(`mcp:${sessionId}`);
        return data ? JSON.parse(data) : null;
    }

    async updateSession(sessionId, updateData) {
        const current = await this.getSession(sessionId) || { context: {} };
        const updated = {
            ...current,
            ...updateData,
            lastActive: Date.now()
        };
        await redisClient.set(`mcp:${sessionId}`, JSON.stringify(updated));
        return updated;
    }

    async createSession(initialContext = {}) {
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        await this.updateSession(sessionId, { context: initialContext });
        return sessionId;
    }

    async deleteSession(sessionId) {
        await redisClient.del(`mcp:${sessionId}`);
    }
}

export default new SessionManager();