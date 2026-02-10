import { McpRegistry } from './registry'
import { McpRuntime } from './runtime'
import { timeTool } from './tools/time'
import { systemInfoTool } from './tools/system-info'
import { messageSendTool } from './tools/message-send'

export { McpRegistry } from './registry'
export { McpRuntime } from './runtime'
export * from './types'

export const createDefaultMcpRegistry = () => {
  const registry = new McpRegistry()
  registry.register(timeTool)
  registry.register(systemInfoTool)
  registry.register(messageSendTool)
  return registry
}
