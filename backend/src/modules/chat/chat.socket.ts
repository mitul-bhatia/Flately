import { Server } from 'socket.io';
import { sendMessage, validateUserInMatch } from './chat.service';
import { ClientToServerEvents, ServerToClientEvents, SendMessagePayload } from '../../types/socket';
import { AuthenticatedSocket } from '../../middlewares/socket-auth.middleware';

const chatSocketEvents = {
  joinCanonical: 'joinRoom',
  sendCanonical: 'sendMessage',
  messageCanonical: 'message',
} as const;

function safeHandler(
  socket: AuthenticatedSocket,
  handler: (...args: any[]) => Promise<void>
): (...args: any[]) => void {
  return (...args) => {
    handler(...args).catch((err: Error) => {
      console.error('[Socket] Handler error:', err);
      socket.emit('error' as any, { code: 'SERVER_ERROR', message: err.message });
    });
  };
}

export default function registerChatSocket(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
): void {
  io.on('connection', (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId = authSocket.userId;

    const joinConversation = async (conversationId: string) => {
      const isParticipant = await validateUserInMatch(conversationId, userId);
      if (isParticipant) {
        socket.join(conversationId);
      } else {
        socket.emit('error' as any, { code: 'NOT_A_PARTICIPANT' });
      }
    };

    const handleSendMessage = async ({ conversationId, content }: SendMessagePayload) => {
      const isParticipant = await validateUserInMatch(conversationId, userId);
      if (!isParticipant) {
        socket.emit('error' as any, { code: 'NOT_A_PARTICIPANT' });
        return;
      }

      const msg = await sendMessage(conversationId, userId, content);
      const payload = {
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        timestamp: msg.createdAt.toISOString(),
      };

      io.to(conversationId).emit(chatSocketEvents.messageCanonical, payload);
    };

    socket.on(chatSocketEvents.joinCanonical, safeHandler(authSocket, joinConversation));

    socket.on(chatSocketEvents.sendCanonical, safeHandler(authSocket, handleSendMessage));
  });
}
