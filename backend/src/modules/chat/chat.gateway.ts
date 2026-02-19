import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

export type UserStatus = 'online' | 'away' | 'offline';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

interface UserPresence {
  sockets: Set<string>;
  status: UserStatus;
  lastActivity: Date;
  userName?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>
  private userPresence: Map<string, UserPresence> = new Map(); // userId -> UserPresence

  // Tempo em milissegundos para considerar ausente (5 minutos)
  private readonly AWAY_TIMEOUT = 5 * 60 * 1000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handler de conexão - autentica o usuário via JWT
   */
  async handleConnection(socket: AuthenticatedSocket) {
    try {
      const token = this.extractToken(socket);
      if (!token) {
        this.logger.warn(`Socket ${socket.id} tentou conectar sem token`);
        socket.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret') || 'change-me-in-production',
      });

      socket.userId = payload.sub;
      socket.userName = payload.name;

      // Adicionar socket ao mapa de usuários conectados
      if (!this.connectedUsers.has(payload.sub)) {
        this.connectedUsers.set(payload.sub, new Set());
      }
      this.connectedUsers.get(payload.sub)?.add(socket.id);

      // Gerenciar presença do usuário
      const wasOffline =
        !this.userPresence.has(payload.sub) ||
        this.userPresence.get(payload.sub)?.sockets.size === 0;

      if (!this.userPresence.has(payload.sub)) {
        this.userPresence.set(payload.sub, {
          sockets: new Set(),
          status: 'online',
          lastActivity: new Date(),
          userName: payload.name,
        });
      }

      const presence = this.userPresence.get(payload.sub)!;
      presence.sockets.add(socket.id);
      presence.status = 'online';
      presence.lastActivity = new Date();
      presence.userName = payload.name;

      // Fazer join no room do usuário para receber mensagens diretas
      socket.join(`user:${payload.sub}`);

      // Se estava offline, notificar todos que o usuário ficou online
      if (wasOffline) {
        this.broadcastStatusChange(payload.sub, 'online', payload.name);
      }

      this.logger.log(`Usuário ${payload.name} (${payload.sub}) conectado via socket ${socket.id}`);
    } catch (error) {
      this.logger.warn(`Falha na autenticação do socket ${socket.id}: ${error.message}`);
      socket.disconnect();
    }
  }

  /**
   * Handler de desconexão
   */
  handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.userId) {
      const userSockets = this.connectedUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(socket.userId);
        }
      }

      // Atualizar presença
      const presence = this.userPresence.get(socket.userId);
      if (presence) {
        presence.sockets.delete(socket.id);

        // Se não há mais sockets, usuário está offline
        if (presence.sockets.size === 0) {
          presence.status = 'offline';
          this.broadcastStatusChange(socket.userId, 'offline', presence.userName);
        }
      }

      this.logger.log(`Usuário ${socket.userName} (${socket.userId}) desconectado`);
    }
  }

  /**
   * Broadcast de mudança de status para todos os usuários conectados
   */
  private broadcastStatusChange(userId: string, status: UserStatus, userName?: string) {
    this.server.emit('user:status', {
      userId,
      status,
      userName,
      timestamp: new Date(),
    });
    this.logger.debug(`Status do usuário ${userName || userId} alterado para ${status}`);
  }

  /**
   * Extrai o token JWT do handshake
   */
  private extractToken(socket: Socket): string | null {
    // Tentar extrair do auth (socket.io v4+)
    const authToken = socket.handshake.auth?.token;
    if (authToken && typeof authToken === 'string') {
      return authToken;
    }

    // Tentar extrair do header Authorization
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Tentar extrair da query string
    const token = socket.handshake.query.token;
    if (typeof token === 'string') {
      return token;
    }

    this.logger.warn(
      `Nenhum token encontrado. Auth: ${JSON.stringify(socket.handshake.auth)}, Query: ${JSON.stringify(socket.handshake.query)}`,
    );
    return null;
  }

  /**
   * Usuário entra em uma conversa (para receber atualizações em tempo real)
   */
  @SubscribeMessage('join:conversation')
  handleJoinConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ) {
    if (!socket.userId) return;

    socket.join(`conversation:${conversationId}`);
    this.logger.debug(`Usuário ${socket.userId} entrou na conversa ${conversationId}`);

    return { event: 'joined', data: { conversationId } };
  }

  /**
   * Usuário sai de uma conversa
   */
  @SubscribeMessage('leave:conversation')
  handleLeaveConversation(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ) {
    if (!socket.userId) return;

    socket.leave(`conversation:${conversationId}`);
    this.logger.debug(`Usuário ${socket.userId} saiu da conversa ${conversationId}`);

    return { event: 'left', data: { conversationId } };
  }

  /**
   * Marca conversa como lida
   */
  @SubscribeMessage('mark:read')
  handleMarkAsRead(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() conversationId: string,
  ) {
    if (!socket.userId) return;

    // Notificar outros participantes que o usuário leu
    socket.to(`conversation:${conversationId}`).emit('conversation:read', {
      conversationId,
      userId: socket.userId,
      readAt: new Date(),
    });

    return { event: 'marked', data: { conversationId } };
  }

  /**
   * Usuário reporta atividade (para resetar status "away")
   */
  @SubscribeMessage('user:activity')
  handleUserActivity(@ConnectedSocket() socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    const presence = this.userPresence.get(socket.userId);
    if (presence) {
      const wasAway = presence.status === 'away';
      presence.lastActivity = new Date();

      if (wasAway) {
        presence.status = 'online';
        this.broadcastStatusChange(socket.userId, 'online', presence.userName);
      }
    }

    return { event: 'activity:ack' };
  }

  /**
   * Usuário define manualmente seu status como ausente
   */
  @SubscribeMessage('user:setAway')
  handleSetAway(@ConnectedSocket() socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    const presence = this.userPresence.get(socket.userId);
    if (presence && presence.status === 'online') {
      presence.status = 'away';
      this.broadcastStatusChange(socket.userId, 'away', presence.userName);
    }

    return { event: 'status:updated', data: { status: 'away' } };
  }

  /**
   * Usuário define manualmente seu status como online
   */
  @SubscribeMessage('user:setOnline')
  handleSetOnline(@ConnectedSocket() socket: AuthenticatedSocket) {
    if (!socket.userId) return;

    const presence = this.userPresence.get(socket.userId);
    if (presence && presence.status !== 'online') {
      presence.status = 'online';
      presence.lastActivity = new Date();
      this.broadcastStatusChange(socket.userId, 'online', presence.userName);
    }

    return { event: 'status:updated', data: { status: 'online' } };
  }

  /**
   * Obtém status de múltiplos usuários
   */
  @SubscribeMessage('users:getStatus')
  handleGetUsersStatus(
    @ConnectedSocket() socket: AuthenticatedSocket,
    @MessageBody() userIds: string[],
  ) {
    if (!socket.userId) return;

    const statuses = this.getUsersStatus(userIds);
    return { event: 'users:status', data: statuses };
  }

  /**
   * Verifica se um usuário está online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId) && (this.connectedUsers.get(userId)?.size ?? 0) > 0;
  }

  /**
   * Obtém o status de um usuário
   */
  getUserStatus(userId: string): UserStatus {
    const presence = this.userPresence.get(userId);
    if (!presence || presence.sockets.size === 0) {
      return 'offline';
    }
    return presence.status;
  }

  /**
   * Obtém status de múltiplos usuários
   */
  getUsersStatus(userIds: string[]): Record<string, UserStatus> {
    const statuses: Record<string, UserStatus> = {};

    for (const userId of userIds) {
      statuses[userId] = this.getUserStatus(userId);
    }

    return statuses;
  }

  /**
   * Obtém todos os usuários online com seus status
   */
  getAllUsersPresence(): Array<{ userId: string; userName?: string; status: UserStatus }> {
    const result: Array<{ userId: string; userName?: string; status: UserStatus }> = [];

    this.userPresence.forEach((presence, userId) => {
      if (presence.sockets.size > 0) {
        result.push({
          userId,
          userName: presence.userName,
          status: presence.status,
        });
      }
    });

    return result;
  }

  /**
   * Emite uma nova mensagem para todos os participantes da conversa
   */
  emitNewMessage(
    conversationId: string,
    message: {
      id: string;
      conversationId: string;
      senderId: string;
      senderName: string;
      type: string;
      content?: string;
      attachments: Array<{
        id: string;
        fileName: string;
        filePath: string;
        fileSize?: number;
        mimeType?: string;
      }>;
      createdAt: Date;
    },
    participantIds: string[],
  ) {
    // Emitir para o room da conversa (quem está com a conversa aberta)
    this.server.to(`conversation:${conversationId}`).emit('message:new', message);

    // Emitir notificação para todos os participantes (exceto o remetente)
    // mesmo que não estejam na conversa
    participantIds
      .filter((id) => id !== message.senderId)
      .forEach((userId) => {
        this.server.to(`user:${userId}`).emit('notification:message', {
          conversationId,
          message: {
            id: message.id,
            senderId: message.senderId,
            senderName: message.senderName,
            content: message.content,
            type: message.type,
            createdAt: message.createdAt,
          },
        });
      });

    this.logger.debug(`Nova mensagem emitida na conversa ${conversationId}`);
  }

  /**
   * Emite atualização de conversa (nova conversa criada, etc)
   */
  emitConversationUpdate(
    participantIds: string[],
    conversation: {
      id: string;
      name?: string;
      isGroup: boolean;
      createdAt: Date;
    },
  ) {
    participantIds.forEach((userId) => {
      this.server.to(`user:${userId}`).emit('conversation:new', conversation);
    });

    this.logger.debug(
      `Nova conversa ${conversation.id} notificada para ${participantIds.length} usuários`,
    );
  }

  /**
   * Emite contagem de não lidas atualizada para um usuário
   */
  emitUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('unread:update', { count });
  }
}
