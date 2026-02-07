export type AdminTableName =
  | 'user'
  | 'aiBot'
  | 'conversation'
  | 'message'
  | 'friendship'
  | 'notification'
  | 'aiLog'
  | 'emoji'
  | 'emojiCategory'

export type AdminFieldType = 'string' | 'number' | 'boolean' | 'enum' | 'datetime' | 'json'

export interface AdminFieldRelation {
  table: AdminTableName
  valueField: string
  labelField: string
}

export interface AdminFieldSchema {
  name: string
  label: string
  type: AdminFieldType
  required?: boolean
  editable?: boolean
  readOnly?: boolean
  enumValues?: string[]
  relation?: AdminFieldRelation
}

export interface AdminTableSchema {
  name: AdminTableName
  label: string
  primaryKey: string
  allowCreate?: boolean
  allowUpdate?: boolean
  allowDelete?: boolean
  fields: AdminFieldSchema[]
}

export interface AdminLookupItem {
  value: string
  label: string
  extra?: Record<string, any>
}
