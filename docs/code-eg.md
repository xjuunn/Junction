# 核心代码示例

本文档展示即时通信系统的核心代码片段，用于论文第五章系统实现部分。

## 1 数据库模型定义（Prisma Schema）

### 1.1 用户模型与会话模型

```prisma
// apps/backend/prisma/schema.prisma

model User {
  id            String    @id
  name          String
  email         String    @unique
  image         String?
  role          String    @default("user")
  accountType   UserAccountType @default(USER)
  banned        Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 社交关系
  sentFriendRequests     Friendship[]   @relation("FriendRequestSender")
  receivedFriendRequests Friendship[]   @relation("FriendRequestReceiver")
  notifications          Notification[]

  // IM扩展
  ownedConversations Conversation[]       @relation("ConversationOwner")
  conversations      ConversationMember[]
  messages           Message[]
  botProfile         AiBot? @relation("BotProfile")
}

model Conversation {
  id          String           @id @default(cuid())
  type        ConversationType
  title       String?
  avatar      String?
  ownerId     String?
  owner       User?            @relation("ConversationOwner", fields: [ownerId], references: [id])
  lastMessageId String?  @unique
  members     ConversationMember[]
  messages    Message[]        @relation("ConversationMessages")
  createdAt   DateTime @default(now())
}

model ConversationMember {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role           ConversationMemberRole @default(MEMBER)
  muted          Boolean @default(false)
  pinned         Boolean @default(false)
  lastReadMessageId String?
  joinedAt       DateTime @default(now())
}
```

**作用**：定义用户、会话、会话成员的核心数据模型，展示系统的数据结构设计。

### 1.2 消息模型

```prisma
model Message {
  id             String @id @default(cuid())
  conversationId String
  conversation   Conversation @relation("ConversationMessages", fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String?
  sender         User?   @relation(fields: [senderId], references: [id])

  type           MessageType @default(TEXT)
  content        String?
  payload        Json?
  status         MessageStatus @default(NORMAL)
  isEdited       Boolean @default(false)

  replyToId      String?
  replyTo        Message?  @relation("MessageReply", fields: [replyToId], references: [id])
  replies        Message[] @relation("MessageReply")

  clientMessageId String?
  sequence       Int

  createdAt      DateTime @default(now())

  @@unique([conversationId, clientMessageId])
  @@index([conversationId, sequence])
}

enum MessageType {
  TEXT, IMAGE, EMOJI, FILE, AUDIO, VIDEO, SYSTEM, NOTICE, PLUGIN, RICH_TEXT
}

enum MessageStatus {
  NORMAL, EDITED, REVOKED, DELETED
}
```

**作用**：定义消息的数据结构，支持多种消息类型和状态跟踪。

---

## 2 后端服务层代码

### 2.1 消息服务 - 发送消息

```typescript
// apps/backend/src/resource/message/message.service.ts

async create(
  userId: string,
  data: Omit<PrismaTypes.Prisma.MessageUncheckedCreateInput, 'sequence' | 'senderId'> & {
    sequence?: number;
    senderId?: string | null;
  },
  options?: { emitEvent?: boolean }
) {
  const emitEvent = options?.emitEvent !== false;
  const conversationId = data.conversationId?.trim();
  if (!conversationId) throw new BadRequestException('会话 ID 不能为空');

  // 验证用户是否为会话成员
  const members = await this.prisma.conversationMember.findMany({
    where: { conversationId },
    select: { userId: true, isActive: true }
  });

  const isMember = members.find(m => m.userId === userId);
  if (!isMember) throw new ForbiddenException('您不在此会话中');

  // 创建消息记录
  const message = await this.prisma.message.create({
    data: {
      ...data,
      senderId: userId,
      sequence: data.sequence ?? (await this.getNextSequence(conversationId))
    },
    include: { sender: { select: { id: true, name: true, image: true } } }
  });

  // 通过WebSocket推送消息给其他成员
  if (emitEvent) {
    const memberIds = members.map(m => m.userId);
    this.messageGateway.broadcastToUsers(memberIds, 'new-message', message, userId);
  }

  return message;
}
```

**作用**：实现消息发送的核心逻辑，包括成员验证、序列号分配和实时推送。

### 2.2 好友服务 - 好友申请与接受

```typescript
// apps/backend/src/resource/friendship/friendship.service.ts

async create(userId: string, data: Omit<PrismaTypes.Prisma.FriendshipUncheckedCreateInput, 'senderId' | 'status'>) {
  const receiverId = data.receiverId;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // 检查是否已是好友或已有待处理请求
  const [myRecord, theirRecord] = await Promise.all([
    this.prisma.friendship.findUnique({ where: { senderId_receiverId: { senderId: userId, receiverId } } }),
    this.prisma.friendship.findUnique({ where: { senderId_receiverId: { senderId: receiverId, receiverId: userId } } })
  ]);

  if (myRecord?.status === 'ACCEPTED') throw new BadRequestException('对方已是你的好友');

  // 创建好友关系记录
  const result = await this.prisma.friendship.upsert({
    where: { senderId_receiverId: { senderId: userId, receiverId } },
    create: { ...data, senderId: userId, status: 'PENDING' },
    update: { ...data, status: 'PENDING', createdAt: new Date() },
    include: { sender: true, receiver: true }
  });

  // 发送通知
  await this.eventBus.emit('notification.create', {
    title: '好友请求',
    type: 'FRIEND_REQUEST',
    userId: receiverId,
    content: `用户 ${result.sender.name} 想要添加你为好友。`
  });

  return result;
}

async accept(currentUserId: string, friendId: string) {
  return await this.prisma.$transaction(async (tx) => {
    // 更新请求状态
    const updatedRequest = await tx.friendship.update({
      where: { senderId_receiverId: { senderId: friendId, receiverId: currentUserId } },
      data: { status: 'ACCEPTED' },
      include: { sender: true, receiver: true }
    });

    // 创建双向好友关系
    await tx.friendship.upsert({
      where: { senderId_receiverId: { senderId: currentUserId, receiverId: friendId } },
      create: { senderId: currentUserId, receiverId: friendId, status: 'ACCEPTED' },
      update: { status: 'ACCEPTED' }
    });

    return updatedRequest;
  });
}
```

**作用**：实现好友申请创建和接受的业务逻辑，使用事务保证数据一致性。

### 2.3 会话服务 - 创建私聊/群聊

```typescript
// apps/backend/src/resource/conversation/conversation.service.ts

async create(userId: string, data: { type: 'PRIVATE' | 'GROUP'; targetId?: string; title?: string; memberIds?: string[] }) {
  if (data.type === 'PRIVATE') {
    // 检查是否已存在私聊会话
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'PRIVATE',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: data.targetId } } }
        ]
      }
    });

    if (existing) return this.findOne(userId, existing.id);

    // 创建新私聊会话
    return await this.prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({ data: { type: ' PRIVATE' } });
      await tx.conversationMember.createMany({
        data: [
          { conversationId: conv.id, userId, role: 'OWNER' },
          { conversationId: conv.id, userId: data.targetId!, role: 'MEMBER' }
        ]
      });
      return this.findOne(userId, conv.id, tx);
    });
  }

  // 创建群聊会话
  return await this.prisma.$transaction(async (tx) => {
    const conv = await tx.conversation.create({
      data: { type: 'GROUP', title: data.title, ownerId: userId }
    });

    const uniqueMemberIds = [...new Set(data.memberIds || [])].filter(id => id && id !== userId);

    const members = [
      { conversationId: conv.id, userId, role: 'OWNER' },
      ...uniqueMemberIds.map(id => ({ conversationId: conv.id, userId: id, role: 'MEMBER' }))
    ];

    await tx.conversationMember.createMany({ data: members });
    return this.findOne(userId, conv.id, tx);
  });
}
```

**作用**：实现私聊和群聊会话的创建逻辑，支持会话复用和事务处理。

### 2.4 LiveKit通话服务 - Token生成

```typescript
// apps/backend/src/resource/call/call.service.ts

async createLiveKitToken(input: {
  callId: string;
  conversationId: string;
  userId: string;
  name?: string | null;
}) {
  // 验证用户是否为会话成员
  const member = await this.prisma.conversationMember.findFirst({
    where: { conversationId: conversationId, userId: userId, isActive: true }
  });
  if (!member) throw new ForbiddenException('无权加入该会话');

  const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
  const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');
  if (!apiKey || !apiSecret) throw new BadRequestException('LiveKit 未配置');

  // 生成LiveKit访问Token
  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: name || undefined,
  });
  token.addGrant({
    roomJoin: true,
    room: callId,
    canPublish: true,
    canSubscribe: true,
  });

  return {
    token: await token.toJwt(),
    url: publicUrl,
    roomName: callId,
    identity: userId,
  };
}
```

**作用**：实现实时音视频通话的Token生成，用于客户端连接LiveKit服务器。

### 2.5 AI服务 - 流式对话

```typescript
// apps/backend/src/resource/ai/ai.service.ts

async *stream(userId: string, payload: AiRequestPayload) {
  const request = this.normalizeRequest(payload);
  const provider = this.resolveProvider(payload);

  const log = await this.prisma.aiLog.create({
    data: { userId, provider: provider.provider, model: provider.model, request: { ...request } }
  });

  // 调用AI服务并流式返回
  const stream = await streamAiText({
    messages: this.buildMessages(request),
    model: provider.model,
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
  });

  let fullText = '';
  for await (const chunk of stream.textStream) {
    fullText += chunk;
    yield chunk;
  }

  // 保存对话日志
  await this.prisma.aiLog.update({
    where: { id: log.id },
    data: { response: { text: fullText, usage: stream.usage } }
  });
}
```

**作用**：实现AI对话的流式响应，将AI生成的内容实时推送给客户端。

---

## 3 WebSocket网关代码

### 3.1 消息实时推送网关

```typescript
// apps/backend/src/resource/message/message.gateway.ts

@WebSocketGateway({ namespace: 'app', cors: true })
export class MessageGateway {
  @WebSocketServer()
  server: Server;

  /**
   * 将消息实时分发给指定的多个用户
   */
  broadcastToUsers(userIds: string[], event: string, payload: any, excludeUserId?: string) {
    const uniqueIds = [...new Set(userIds)];
    uniqueIds.forEach(id => {
      if (id !== excludeUserId) {
        this.server.to(`user-${id}`).emit(event, payload);
      }
    });
  }
}
```

**作用**：实现消息的实时推送，将新消息推送给目标用户。

### 3.2 通知实时推送网关

```typescript
// apps/backend/src/resource/notification/notification.gateway.ts

@WebSocketGateway({ namespace: 'app' })
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  sendNotificationToUser(userId: string, notification: PrismaTypes.Notification) {
    this.server.to(`user-${userId}`).emit('new-notification', notification);
  }
}
```

**作用**：实现系统通知的实时推送，支持用户在线即时接收通知。

---

## 4 前端核心代码

### 4.1 WebSocket客户端封装

```typescript
// apps/frontend/app/core/socket/socket.client.ts

export class SocketClient<N extends NSKeys> {
  private socket: Socket;
  private namespace: N;

  constructor(namespace: N) {
    this.namespace = namespace;
    const userStore = useUserStore();

    const socketOptions: any = {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token: userStore.authToken.value },
      autoConnect: !!userStore.authToken.value
    };

    this.socket = io(backendUrl, socketOptions);

    // 监听连接状态
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.joinUserRoom();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });
  }

  private joinUserRoom() {
    const userId = useUserStore().user?.id;
    if (userId) {
      this.socket.emit('join', { userId });
      this.socket.join(`user-${userId}`);
    }
  }

  on<T>(event: string, handler: (data: T) => void) {
    this.socket.on(event, handler);
  }

  emit<T>(event: string, data?: any): Promise<T> {
    return this.socket.emitWithAck(event, data);
  }
}
```

**作用**：封装WebSocket客户端，实现连接管理、自动重连和事件监听。

### 4.2 消息发送API封装

```typescript
// apps/frontend/app/api/message.ts

/**
 * 发送消息
 */
export function send(data: Partial<PrismaTypes.Prisma.MessageUncheckedCreateInput>) {
  return api.post<AwaitedReturnType<MessageService['create']>>(base, data)
}

/**
 * 获取消息历史
 */
export function findAll(
  conversationId: string,
  pagination: PaginationOptions,
  cursor?: number,
  direction?: 'before' | 'after'
) {
  return api.get<AwaitedReturnType<MessageService['findAll']>>(`${base}/${conversationId}`, {
    ...pagination,
    cursor,
    direction
  })
}

/**
 * 编辑消息
 */
export function edit(id: string, data: { content: string; payload?: any }) {
  return api.patch<AwaitedReturnType<MessageService['edit']>>(`${base}/${id}`, data)
}

/**
 * 撤回消息
 */
export function revoke(id: string) {
  return api.patch<AwaitedReturnType<MessageService['revoke']>>(`${base}/${id}/revoke`)
}
```

**作用**：封装消息相关的API调用，提供类型安全的前端接口。

### 4.3 设置状态管理（Pinia）

```typescript
// apps/frontend/app/stores/settings.ts

export interface AppSettings {
  backendServerUrl: string
  assetBaseUrl: string
  language: string
  themeMode: string
  primaryColor: string
  compactMode: boolean
  sidebarCollapsed: boolean
  animationsEnabled: boolean
  downloadPath: string
  aiProviderId: string
  aiApiKey: string
  aiBaseUrl: string
  aiDefaultModel: string
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({
    backendServerUrl: '',
    assetBaseUrl: '',
    language: 'zh-CN',
    themeMode: 'system',
    primaryColor: 'blue',
    compactMode: false,
    sidebarCollapsed: false,
    animationsEnabled: true,
    downloadPath: '',
    aiProviderId: '',
    aiApiKey: '',
    aiBaseUrl: '',
    aiDefaultModel: ''
  })

  // 持久化设置
  watch(settings, (val) => {
    if (import.meta.client) {
      localStorage.setItem('app-settings', JSON.stringify(val))
    }
  }, { deep: true })

  return { settings }
})
```

**作用**：使用Pinia管理全局设置，支持持久化存储和响应式更新。

---

## 5 代码在论文中的位置建议

| 代码片段 | 建议放置位置 | 说明 |
|---------|-------------|------|
| Prisma数据模型 | 第四章 4.3 数据库设计 | 展示核心数据结构 |
| 消息服务create方法 | 第五章 5.4 消息服务模块 | 展示消息发送核心逻辑 |
| 好友服务 | 第五章 5.2 好友系统模块 | 展示好友业务逻辑 |
| 会话服务create方法 | 第五章 5.3 会话管理模块 | 展示会话创建逻辑 |
| LiveKit Token生成 | 第五章 5.7 实时通话模块 | 展示通话实现 |
| AI流式对话 | 第五章 5.6 AI机器人模块 | 展示AI功能 |
| WebSocket网关 | 第五章 5.4 消息服务模块 | 展示实时推送 |
| WebSocket客户端 | 第五章 5.4 消息服务模块 | 展示前端实时通信 |
| 前端API封装 | 第五章 5.1 用户管理模块 | 展示前端接口设计 |
| Pinia状态管理 | 第五章 5.1 用户管理模块 | 展示状态管理 |
