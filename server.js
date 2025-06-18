import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import sessionManager from './mcp/session.js';
import { MCPProtocol } from './mcp/protocol.js';
import llmAdapter from './mcp/llm_adapter.js';

const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: { origin: "*" },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2分钟
        skipMiddlewares: true,
    }
});

// 提供静态文件
app.use(express.static('public'));
app.use(express.json());

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/index.html');
});

// 添加引擎级日志
io.engine.on("connection", (socket) => {
    console.log(`引擎连接: ${socket.id}`);
});

// 添加错误监听
io.engine.on("connection_error", (err) => {
    console.error("连接错误:", err);
});

// WebSocket端点
// Socket.IO 连接处理
io.on('connection', (socket) => {
    console.log(`Socket.IO 客户端已连接: ${socket.id}`);

    // 心跳检测
    socket.on('ping', (cb) => {
        if (typeof cb === 'function') {
            cb();
        }
    });

    // 创建新会话
    socket.on('new_session', async ({ context }, callback) => {
        try {
            const sessionId = await sessionManager.createSession(context);
            console.log('new_session', sessionId)
            callback({ sessionId });
        } catch (error) {
            console.error('创建会话失败:', error);
            callback({ error: MCPProtocol.formatError(error) });
        }
    });

    // 清除会话
    socket.on('clear_session', async ({ sessionId }, callback) => {
        try {
            await sessionManager.deleteSession(sessionId);
            callback({ success: true });
        } catch (error) {
            console.error('清除会话失败:', error);
            callback({ success: false, error: MCPProtocol.formatError(error) });
        }
    });

    // 更新上下文
    socket.on('update_context', async ({ sessionId, context }, callback) => {
        try {
            await sessionManager.updateSession(sessionId, { context });
            callback({ success: true });
        } catch (error) {
            console.error('更新上下文失败:', error);
            callback({ success: false, error: MCPProtocol.formatError(error) });
        }
    });

    // 处理聊天消息
    socket.on('mcp_chat', async (data, callback) => {
        try {
            const { sessionId, message, context } = data;

            // 获取或创建会话
            let session;
            let actualSessionId;
            if (sessionId) {
                session = await sessionManager.getSession(sessionId);
                actualSessionId = sessionId;
            }
            if (!session) {
                actualSessionId = await sessionManager.createSession(context);
                session = { context };
            }

            // 更新上下文
            const updatedContext = { ...session.context, ...context };

            // 构建消息历史
            const messages = [
                ...(session.history || []),
                { role: 'user', content: message }
            ];

            console.log(`
                ·
                
                
                mcp_chat messages
                
                
                    `, JSON.stringify(messages), `
                    
                    
                    
                    
                    
            `)

            // 调用模型
            const responseStream = await llmAdapter.generateResponse(messages, updatedContext);

            let fullResponse = '';
            for await (const chunk of responseStream) {
                if (!chunk) continue;
                const content = chunk.choices[0]?.delta?.content || '';
                fullResponse += content;

                // 发送部分响应
                socket.emit('mcp_response', {
                    content,
                    sessionId: actualSessionId
                });
            }

            // 发送完成标志
            socket.emit('mcp_response', {
                complete: true,
                sessionId: actualSessionId
            });

            // 更新会话历史
            await sessionManager.updateSession(actualSessionId, {
                history: [...messages, { role: 'assistant', content: fullResponse }],
                context: updatedContext
            });

            // 确认消息已处理
            if (typeof callback === 'function') {
                callback({ success: true, sessionId: actualSessionId });
            }
        } catch (error) {
            console.error('处理消息错误:', error);
            socket.emit('mcp_error', MCPProtocol.formatError(error));

            if (typeof callback === 'function') {
                callback({ success: false, error: MCPProtocol.formatError(error) });
            }
        }
    });

    // 断开连接处理
    socket.on('disconnect', (reason) => {
        console.log(`Socket.IO 客户端断开连接: ${socket.id} (原因: ${reason})`);
    });

    // 错误处理
    socket.on('error', (error) => {
        console.error(`Socket.IO 错误 (${socket.id}): ${error.message}`);
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`MCP Service running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to interact with the service`);
});