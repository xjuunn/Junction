import type { AdminService } from '@junction/backend/src/resource/admin/admin.service'
import type { AdminTableName } from '@junction/types'

const base = '/admin'

export function getAdminStatus() {
  return api.get<AwaitedReturnType<AdminService['getStatus']>>(`${base}/status`)
}

export function getDatabaseStats() {
  return api.get<AwaitedReturnType<AdminService['getDatabaseStats']>>(`${base}/database/stats`)
}

export function listAdminUsers(params?: { page?: number; limit?: number; keyword?: string; accountType?: string }) {
  return api.get<AwaitedReturnType<AdminService['listUsers']>>(`${base}/users`, params)
}

export function updateAdminUser(id: string, data: Parameters<AdminService['updateUser']>[2]) {
  return api.patch<AwaitedReturnType<AdminService['updateUser']>>(`${base}/users/${id}`, data)
}

export function getDatabaseTables() {
  return api.get<AwaitedReturnType<AdminService['getDatabaseTables']>>(`${base}/database/tables`)
}

export function lookupDatabaseTable(table: AdminTableName, params?: { keyword?: string; limit?: number }) {
  return api.get<AwaitedReturnType<AdminService['lookupDatabaseTable']>>(`${base}/database/lookup/${table}`, params)
}

export function listDatabaseTable(table: AdminTableName, params?: { page?: number; limit?: number; keyword?: string }) {
  return api.get<AwaitedReturnType<AdminService['listDatabaseTable']>>(`${base}/database/${table}`, params)
}

export function getDatabaseRow(table: AdminTableName, id: string) {
  return api.get<AwaitedReturnType<AdminService['getDatabaseRow']>>(`${base}/database/${table}/${id}`)
}

export function createDatabaseRow(table: AdminTableName, data: Record<string, any>) {
  return api.post<AwaitedReturnType<AdminService['createDatabaseRow']>>(`${base}/database/${table}`, data)
}

export function updateDatabaseRow(table: AdminTableName, id: string, data: Record<string, any>) {
  return api.patch<AwaitedReturnType<AdminService['updateDatabaseRow']>>(`${base}/database/${table}/${id}`, data)
}

export function deleteDatabaseRow(table: AdminTableName, id: string) {
  return api.delete<AwaitedReturnType<AdminService['deleteDatabaseRow']>>(`${base}/database/${table}/${id}`)
}
