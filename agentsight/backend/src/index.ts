import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import agentRoutes from './routes/agent';
import auditRoutes from './routes/audit';
import demoRoutes from './routes/demo';
import policyRoutes from './routes/policy';
import { initSocketIO } from './socket/events';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

// HTTP Server & Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Socket.IO event handlers
initSocketIO(io);

// API Routes
app.use('/api/agent', agentRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/demo', demoRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'AgentSight Core Daemon'
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`=====================================================`);
  console.log(`  🛡️ AgentSight Security & Containment Engine        `);
  console.log(`  🚀 Backend running on http://localhost:${PORT}     `);
  console.log(`  ⚡ Socket.IO real-time channel active              `);
  console.log(`=====================================================`);
});

export { app, io, server };
