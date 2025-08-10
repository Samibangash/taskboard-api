import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: Server;

export function initSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Client should call: socket.emit('joinBoard', boardId)
    socket.on('joinBoard', (boardId: string) => {
      if (boardId) {
        socket.join(`board:${boardId}`);
      }
    });

    socket.on('disconnect', () => {
      // noop for now
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io has not been initialized yet.');
  return io;
}
