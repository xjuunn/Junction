import type { McServerClientHandle, McServerConfig } from '../mc-server.types'

export interface McServerAdapter {
  readonly protocol: McServerConfig['protocol']
  connect(config: McServerConfig): Promise<McServerClientHandle>
}

