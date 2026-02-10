import type { McpToolResult } from './types'

export interface PlaywrightToolInfo {
  name: string
  description?: string
  inputSchema?: Record<string, any>
}

interface PlaywrightConfig {
  mode: 'stdio' | 'streamable-http'
  url?: string
  command?: string
  args?: string[]
}

const parseArgs = (value?: string) => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed.map(item => String(item))
    } catch {
      return undefined
    }
  }
  return trimmed.split(/\s+/).filter(Boolean)
}

const resolvePlaywrightConfig = (): PlaywrightConfig => {
  const url = process.env.MCP_PLAYWRIGHT_URL?.trim()
  if (url) {
    return { mode: 'streamable-http', url }
  }
  const command = (process.env.MCP_PLAYWRIGHT_COMMAND || 'docker').trim()
  const args = parseArgs(process.env.MCP_PLAYWRIGHT_ARGS) || ['run', '-i', '--rm', 'mcp/playwright']
  return { mode: 'stdio', command, args }
}

export class PlaywrightMcpClient {
  private client?: any
  private connecting?: Promise<any>
  private toolsCache?: { tools: PlaywrightToolInfo[]; cachedAt: number }
  private configKey?: string
  private clientCtor?: typeof import('@modelcontextprotocol/sdk/client/index.js').Client
  private stdioCtor?: typeof import('@modelcontextprotocol/sdk/client/stdio.js').StdioClientTransport
  private streamableCtor?: typeof import('@modelcontextprotocol/sdk/client/streamableHttp.js').StreamableHTTPClientTransport

  private async ensureSdk() {
    if (!this.clientCtor) {
      const mod = await import('@modelcontextprotocol/sdk/client/index.js')
      this.clientCtor = mod.Client
    }
    if (!this.stdioCtor) {
      const mod = await import('@modelcontextprotocol/sdk/client/stdio.js')
      this.stdioCtor = mod.StdioClientTransport
    }
    if (!this.streamableCtor) {
      const mod = await import('@modelcontextprotocol/sdk/client/streamableHttp.js')
      this.streamableCtor = mod.StreamableHTTPClientTransport
    }
  }

  private async getClient() {
    const config = resolvePlaywrightConfig()
    const nextKey = JSON.stringify(config)
    if (this.client && this.configKey === nextKey) return this.client
    if (this.connecting && this.configKey === nextKey) return this.connecting
    this.configKey = nextKey
    this.toolsCache = undefined
    this.connecting = (async () => {
      try {
        await this.ensureSdk()
        const ClientCtor = this.clientCtor as typeof import('@modelcontextprotocol/sdk/client/index.js').Client
        const client = new ClientCtor({ name: 'junction-backend', version: '1.0.0' })
        const transport = config.mode === 'streamable-http'
          ? new (this.streamableCtor as typeof import('@modelcontextprotocol/sdk/client/streamableHttp.js').StreamableHTTPClientTransport)(new URL(config.url as string))
          : new (this.stdioCtor as typeof import('@modelcontextprotocol/sdk/client/stdio.js').StdioClientTransport)({
            command: config.command as string,
            args: config.args
          })
        await client.connect(transport)
        this.client = client
        return client
      } catch (error) {
        this.client = undefined
        this.connecting = undefined
        throw error
      }
    })()
    return this.connecting
  }

  async listTools(forceRefresh = false) {
    if (!forceRefresh && this.toolsCache) return this.toolsCache.tools
    const client = await this.getClient()
    const result = await client.listTools()
    const tools = (result.tools || []).map(tool => ({
      name: tool.name,
      description: tool.description || tool.title || '',
      inputSchema: tool.inputSchema || { type: 'object', properties: {} }
    }))
    this.toolsCache = { tools, cachedAt: Date.now() }
    return tools
  }

  async callTool(name: string, args: any): Promise<McpToolResult> {
    try {
      const client = await this.getClient()
      const result = await client.callTool({
        name,
        arguments: args ?? {}
      })
      return {
        ok: true,
        data: {
          content: result.content,
          meta: result._meta
        }
      }
    } catch (error: any) {
      return { ok: false, error: error?.message || String(error) }
    }
  }
}
