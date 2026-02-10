import type { McpConfig, McpInvokeRecord, McpTool, McpToolContext } from './types'
import { McpRegistry } from './registry'

export class McpRuntime {
  constructor(private readonly registry: McpRegistry) { }

  getRegistry() {
    return this.registry
  }

  async autoInvoke(text: string, context: McpToolContext, config?: McpConfig) {
    if (config?.enabled === false) return [] as McpInvokeRecord[]
    const allow = new Set((config?.allow || []).map(item => String(item)))
    const deny = new Set((config?.deny || []).map(item => String(item)))
    const tools = this.registry.list().filter(tool => {
      if (deny.has(tool.id)) return false
      if (allow.size > 0) return allow.has(tool.id)
      return true
    })

    const results: McpInvokeRecord[] = []
    for (const tool of tools) {
      if (!tool.canAutoInvoke) continue
      if (!tool.canAutoInvoke(text, context)) continue
      const result = await tool.invoke({}, context)
      const systemPrompt = tool.buildSystemPrompt ? tool.buildSystemPrompt(result, context) : undefined
      results.push({
        tool: this.registry.snapshot(tool),
        result,
        systemPrompt
      })
    }
    return results
  }

  async invokeByIds(toolIds: string[], context: McpToolContext, config?: McpConfig) {
    if (config?.enabled === false) return [] as McpInvokeRecord[]
    const allow = new Set((config?.allow || []).map(item => String(item)))
    const deny = new Set((config?.deny || []).map(item => String(item)))
    const idSet = new Set(toolIds.map(id => String(id)))
    const tools = this.registry.list().filter(tool => {
      if (!idSet.has(tool.id)) return false
      if (deny.has(tool.id)) return false
      if (allow.size > 0) return allow.has(tool.id)
      return true
    })

    const results: McpInvokeRecord[] = []
    for (const tool of tools) {
      const result = await tool.invoke({}, context)
      const systemPrompt = tool.buildSystemPrompt ? tool.buildSystemPrompt(result, context) : undefined
      results.push({
        tool: this.registry.snapshot(tool),
        result,
        systemPrompt
      })
    }
    return results
  }

  listToolSnapshots(config?: McpConfig) {
    if (config?.enabled === false) return [] as ReturnType<McpRegistry['snapshot']>[]
    const allow = new Set((config?.allow || []).map(item => String(item)))
    const deny = new Set((config?.deny || []).map(item => String(item)))
    return this.registry.list()
      .filter(tool => {
        if (deny.has(tool.id)) return false
        if (allow.size > 0) return allow.has(tool.id)
        return true
      })
      .map(tool => this.registry.snapshot(tool))
  }
}
