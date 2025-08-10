import http from 'http';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app';
import { initSocket } from './socket/io';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskboard_api';

async function start() {
  try {
    // Connect DB
    await mongoose.connect(MONGO_URI);
    console.log('[mongo] connected');

    // Create HTTP server and attach socket.io
    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`[server] running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[startup error]', err);
    process.exit(1);
  }
}

start();
