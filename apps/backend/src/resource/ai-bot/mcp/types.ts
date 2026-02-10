import type { PrismaTypes } from '@junction/types'

export interface McpToolContext {
  bot: PrismaTypes.AiBot
  conversationId: string
  latestMessageText: string
  conversationType?: string | null
  emitMessage?: (input: { content: string; payload?: any }) => Promise<any>
}

export interface McpToolResult<T = any> {
  ok: boolean
  data?: T
  error?: string
  meta?: Record<string, any>
}

export interface McpTool {
  id: string
  name: string
  description: string
  inputSchema?: Record<string, any>
  canAutoInvoke?: (text: string, context: McpToolContext) => boolean
  invoke: (input: any, context: McpToolContext) => Promise<McpToolResult>
  buildSystemPrompt?: (result: McpToolResult, context: McpToolContext) => string
}

export interface McpToolSnapshot {
  id: string
  name: string
  description: string
  inputSchema?: Record<string, any>
}

export interface McpConfig {
  enabled?: boolean
  allow?: string[]
  deny?: string[]
}

export interface McpInvokeRecord {
  tool: McpToolSnapshot
  result: McpToolResult
  systemPrompt?: string
}
