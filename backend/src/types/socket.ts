export interface ServerToClientEvents {
  message: (data: MessagePayload) => void;
  userOnline: (userId: string) => void;
  userOffline: (userId: string) => void;
}

export interface ClientToServerEvents {
  sendMessage: (data: SendMessagePayload) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
}

export interface MessagePayload {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  timestamp: string;
}

export interface SendMessagePayload {
  conversationId: string;
  senderId: string;
  content: string;
}
