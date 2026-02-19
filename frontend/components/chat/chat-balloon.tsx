'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/auth-context';
import { useSocket } from '@/lib/contexts/socket-context';
import { chatApi, Conversation, Message } from '@/lib/api/chat';
import { toastError } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageCircle, Send, X, Users, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const MINI_CHAT_WIDTH = 380;
const MINI_CHAT_HEIGHT = 480;

function getConversationName(conversation: Conversation, currentUserId: string | undefined): string {
  if (conversation.isGroup && conversation.name) return conversation.name;
  const other = conversation.participants.filter((p) => p.userId !== currentUserId);
  return other.map((p) => p.userName).join(', ') || 'Conversa';
}

function formatMessageTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatBalloon() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    isConnected,
    unreadCount,
    joinConversation,
    leaveConversation,
    markAsRead,
    refreshUnreadCount,
    onNewMessage,
    onMessageNotification,
  } = useSocket();

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [miniChatConversationId, setMiniChatConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messageNotification, setMessageNotification] = useState<{
    senderName: string;
    conversationId: string;
    preview?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMiniConvRef = useRef<string | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isOnChatPage = pathname === '/chat';

  // Lista de conversas para o seletor (só busca quando seletor aberto e não está na página de chat)
  const { data: conversationsData } = useQuery({
    queryKey: ['chat-conversations-balloon'],
    queryFn: () => chatApi.getConversations(),
    enabled: selectorOpen && !isOnChatPage,
  });

  const conversations = conversationsData?.data ?? [];

  // Mensagens da conversa aberta no mini chat
  const { data: messagesData } = useQuery({
    queryKey: ['chat-messages', miniChatConversationId],
    queryFn: () =>
      miniChatConversationId ? chatApi.getMessages(miniChatConversationId) : null,
    enabled: !!miniChatConversationId,
  });

  const messages = messagesData?.data ?? [];
  const currentConversation = conversations.find((c) => c.id === miniChatConversationId);

  // Join/leave e mark as read ao abrir/fechar mini chat
  useEffect(() => {
    if (!isConnected) return;

    if (previousMiniConvRef.current && previousMiniConvRef.current !== miniChatConversationId) {
      leaveConversation(previousMiniConvRef.current);
    }

    if (miniChatConversationId) {
      joinConversation(miniChatConversationId);
      markAsRead(miniChatConversationId);
      chatApi.markAsRead(miniChatConversationId).then(() => refreshUnreadCount()).catch(() => {});
    }

    previousMiniConvRef.current = miniChatConversationId;
  }, [miniChatConversationId, isConnected, joinConversation, leaveConversation, markAsRead, refreshUnreadCount]);

  // Nova mensagem na conversa do mini chat: atualizar cache
  useEffect(() => {
    if (!isConnected || !miniChatConversationId) return;

    const unsubscribe = onNewMessage((message) => {
      if (message.conversationId !== miniChatConversationId) return;
      queryClient.setQueryData(['chat-messages', miniChatConversationId], (old: { data: Message[] } | undefined) => {
        if (!old || old.data.some((m) => m.id === message.id)) return old;
        return {
          ...old,
          data: [...old.data, { ...message, createdAt: new Date(message.createdAt).toISOString() }],
        };
      });
      markAsRead(message.conversationId);
      chatApi.markAsRead(message.conversationId).then(() => refreshUnreadCount()).catch(() => {});
    });

    return unsubscribe;
  }, [isConnected, miniChatConversationId, onNewMessage, queryClient, markAsRead, refreshUnreadCount]);

  // Notificação customizada: nova mensagem (com seta apontando para o chat)
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = onMessageNotification((notification) => {
      const senderName = notification.message?.senderName ?? 'Alguém';
      const isFromOpenMiniChat = notification.conversationId === miniChatConversationId;
      if (isFromOpenMiniChat) return;
      const preview =
        notification.message?.type === 'TEXT' && notification.message?.content
          ? notification.message.content.slice(0, 50) + (notification.message.content.length > 50 ? '...' : '')
          : undefined;
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      setMessageNotification({ senderName, conversationId: notification.conversationId, preview });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations-balloon'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      notificationTimeoutRef.current = setTimeout(() => {
        setMessageNotification(null);
        notificationTimeoutRef.current = null;
      }, 6000);
    });

    return () => {
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      unsubscribe();
    };
  }, [isConnected, onMessageNotification, miniChatConversationId, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: (data: { conversationId: string; content: string }) =>
      chatApi.sendMessage({ conversationId: data.conversationId, content: data.content }),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations-balloon'] });
      setMessageInput('');
    },
    onError: () => toastError('Erro ao enviar mensagem'),
  });

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !miniChatConversationId) return;
    sendMessageMutation.mutate({ conversationId: miniChatConversationId, content: messageInput.trim() });
  }, [messageInput, miniChatConversationId, sendMessageMutation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openMiniChat = (conversationId: string) => {
    setSelectorOpen(false);
    setMiniChatConversationId(conversationId);
  };

  const closeMiniChat = () => {
    setMiniChatConversationId(null);
  };

  const openFullChat = () => {
    closeMiniChat();
    router.push('/chat');
  };

  const dismissMessageNotification = () => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
    setMessageNotification(null);
  };

  const handleMessageNotificationClick = () => {
    if (!messageNotification) return;
    openMiniChat(messageNotification.conversationId);
    dismissMessageNotification();
  };

  const conversationName = currentConversation
    ? getConversationName(currentConversation, user?.id)
    : '';

  // Só renderiza o balão quando não está na tela de chat
  if (isOnChatPage) {
    return null;
  }

  const BALLOON_OFFSET_RIGHT = 24;
  const BALLOON_SIZE = 56;
  const GAP = 12;

  return (
    <>
      {/* Notificação customizada: nova mensagem com seta apontando para o chat */}
      {messageNotification && (
        <div
          className={cn(
            'fixed z-40 rounded-lg border border-border bg-card shadow-lg overflow-hidden',
            'max-w-[280px] min-w-[220px] flex flex-col',
          )}
          style={{
            right: BALLOON_OFFSET_RIGHT + BALLOON_SIZE + GAP,
            bottom: BALLOON_OFFSET_RIGHT,
          }}
        >
          <div className="flex items-start justify-between gap-2 p-3 pb-1">
            <p className="text-sm font-medium text-foreground leading-tight">
              Nova mensagem de {messageNotification.senderName}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 -mr-1 -mt-0.5 flex-shrink-0 text-muted-foreground hover:text-foreground"
              onClick={dismissMessageNotification}
              title="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          {messageNotification.preview && (
            <p className="text-xs text-muted-foreground truncate px-3 pb-2">
              {messageNotification.preview}
            </p>
          )}
          <button
            type="button"
            onClick={handleMessageNotificationClick}
            className={cn(
              'flex items-center justify-center gap-1.5 w-full py-2 px-3 text-sm font-medium',
              'bg-primary/10 text-primary hover:bg-primary/20 transition-colors border-t border-border',
            )}
          >
            Ver conversa
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Mini chat (janela flutuante) */}
      {miniChatConversationId && currentConversation && (
        <Card
          className="fixed z-50 flex flex-col shadow-lg border-border"
          style={{
            width: MINI_CHAT_WIDTH,
            height: MINI_CHAT_HEIGHT,
            right: 24,
            bottom: 24 + 56 + 12, // acima do balão + margem
          }}
        >
          <CardHeader className="p-3 border-b flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0',
                  currentConversation.isGroup ? 'bg-primary/10 text-primary' : 'bg-muted',
                )}
              >
                {currentConversation.isGroup ? (
                  <Users className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-semibold">
                    {conversationName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="font-medium truncate text-sm">{conversationName}</span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={openFullChat}
                title="Abrir no Chat"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeMiniChat} title="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {messages.map((message) => {
                  const isOwn = message.senderId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md',
                        )}
                      >
                        {!isOwn && currentConversation.isGroup && (
                          <p className="text-xs font-medium mb-0.5 opacity-80">{message.senderName}</p>
                        )}
                        {message.type === 'TEXT' && (
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        )}
                        {message.type !== 'TEXT' && (
                          <p className="text-muted-foreground">
                            {message.type === 'IMAGE' ? '📷 Imagem' : '📎 Arquivo'}
                          </p>
                        )}
                        <span className={cn('text-[10px] block mt-1', isOwn ? 'opacity-80' : 'text-muted-foreground')}>
                          {formatMessageTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-2 border-t flex gap-2">
              <Input
                placeholder="Mensagem..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sendMessageMutation.isPending}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sendMessageMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balão + seletor */}
      <DropdownMenu open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="fixed rounded-full h-14 w-14 shadow-lg z-40"
            style={{ right: 24, bottom: 24 }}
            title="Chat"
          >
            <MessageCircle className="h-7 w-7" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          className="w-80 max-h-[320px] p-0"
          sideOffset={12}
        >
          <div className="p-2 border-b">
            <p className="text-sm font-medium text-foreground">Conversas</p>
            <p className="text-xs text-muted-foreground">Selecione uma para abrir</p>
          </div>
          <ScrollArea className="max-h-[280px]">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma conversa. Abra o Chat para iniciar.
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conv) => {
                  const name = getConversationName(conv, user?.id);
                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => openMiniChat(conv.id)}
                      className={cn(
                        'w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-start gap-3',
                        miniChatConversationId === conv.id && 'bg-muted',
                      )}
                    >
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                          conv.isGroup ? 'bg-primary/10 text-primary' : 'bg-muted',
                        )}
                      >
                        {conv.isGroup ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-semibold">{name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">{name}</span>
                          {conv.unreadCount > 0 && (
                            <Badge variant="default" className="h-5 min-w-[20px] text-xs flex-shrink-0">
                              {conv.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.lastMessage
                            ? conv.lastMessage.senderId === user?.id
                              ? `Você: ${conv.lastMessage.type === 'TEXT' ? conv.lastMessage.content : '📎'}`
                              : conv.lastMessage.type === 'TEXT'
                                ? conv.lastMessage.content
                                : '📎 Arquivo'
                            : 'Nenhuma mensagem'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
