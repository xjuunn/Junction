import type { McpTool, McpToolSnapshot } from './types'

export class McpRegistry {
  private readonly tools = new Map<string, McpTool>()

  register(tool: McpTool) {
    this.tools.set(tool.id, tool)
  }

  get(toolId: string) {
    return this.tools.get(toolId)
  }

  list() {
    return Array.from(this.tools.values())
  }

  snapshot(tool: McpTool): McpToolSnapshot {
    return {
      id: tool.id,
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }
  }
}
