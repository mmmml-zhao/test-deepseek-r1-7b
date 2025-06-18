export class MCPProtocol {
    static parseRequest(data) {
        return {
            sessionId: data.session_id,
            message: data.message,
            context: data.context || {},
            action: data.action || 'chat'
        };
    }

    static formatResponse({ sessionId, response, context, isComplete }) {
        return {
            session_id: sessionId,
            response,
            context,
            status: isComplete ? 'completed' : 'partial',
            timestamp: Date.now()
        };
    }

    static formatError(error) {
        return {
            error_code: error.code || 500,
            message: error.message
        };
    }
}