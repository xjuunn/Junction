<script setup lang="ts">
import type { AdminFieldSchema, AdminLookupItem, AdminTableSchema, AdminTableName } from '@junction/types'
import * as adminApi from '~/api/admin'

definePageMeta({
  layout: 'admin',
  middleware: ['admin']
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const dialog = useDialog()

const loading = ref(false)
const tableSchema = ref<AdminTableSchema | null>(null)
const keyword = ref('')
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})
const rows = ref<Array<Record<string, any>>>([])

const drawerOpen = ref(false)
const isCreating = ref(false)
const formModel = reactive<Record<string, any>>({})

const lookupOpen = ref(false)
const lookupField = ref<AdminFieldSchema | null>(null)
const lookupKeyword = ref('')
const lookupLoading = ref(false)
const lookupResults = ref<AdminLookupItem[]>([])

const tableMeta: Record<string, { label: string; icon: string; subtitle: string }> = {
  user: { label: '用户表', icon: 'mingcute:user-3-line', subtitle: '账号权限与安全状态' },
  aiBot: { label: '机器人表', icon: 'mingcute:ai-line', subtitle: '机器人配置与模型策略' },
  conversation: { label: '会话表', icon: 'mingcute:chat-4-line', subtitle: '会话状态与归属' },
  message: { label: '消息表', icon: 'mingcute:message-4-line', subtitle: '消息内容与生命周期' },
  friendship: { label: '好友关系表', icon: 'mingcute:link-line', subtitle: '关系与状态控制' },
  notification: { label: '通知表', icon: 'mingcute:notification-line', subtitle: '消息通知与处理状态' },
  aiLog: { label: 'AI 日志表', icon: 'mingcute:document-line', subtitle: '模型调用审计' }
}

const tableColumns: Record<string, string[]> = {
  user: ['id', 'name', 'email', 'role', 'accountType', 'banned', 'createdAt'],
  aiBot: ['id', 'name', 'visibility', 'status', 'creatorId', 'createdAt'],
  conversation: ['id', 'type', 'title', 'ownerId', 'status', 'createdAt'],
  message: ['id', 'conversationId', 'senderId', 'type', 'status', 'createdAt'],
  friendship: ['id', 'senderId', 'receiverId', 'status', 'isBlocked', 'updatedAt'],
  notification: ['id', 'type', 'title', 'status', 'level', 'userId', 'createdAt'],
  aiLog: ['id', 'userId', 'provider', 'model', 'createdAt']
}

const activeTableName = computed(() => String(route.params.table || '') as AdminTableName)
const columns = computed(() => {
  const fields = tableSchema.value?.fields || []
  const order = tableColumns[activeTableName.value] || []
  const map = new Map(fields.map(field => [field.name, field]))
  const ordered = order.map(name => map.get(name)).filter(Boolean) as AdminFieldSchema[]
  const rest = fields.filter(field => !order.includes(field.name))
  return [...ordered, ...rest]
})
const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.limit)))

const formatDate = (value?: string | Date | null) => {
  if (!value) return '-'
  const date = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

const formatJson = (value: any) => {
  if (value === null || value === undefined) return '-'
  try {
    return typeof value === 'string' ? value : JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const formatCell = (field: AdminFieldSchema, value: any) => {
  if (field.type === 'datetime') return formatDate(value)
  if (field.type === 'json') return formatJson(value)
  if (field.type === 'boolean') return value ? '是' : '否'
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

const getCellMaxLength = (field: AdminFieldSchema) => {
  if (field.name.toLowerCase().endsWith('id')) return 12
  if (field.type === 'json') return 160
  if (field.type === 'string') return 80
  return 40
}

const getIdShort = (value: any) => {
  const text = value === null || value === undefined ? '' : String(value)
  if (!text) return '-'
  return text.length <= 6 ? text : text.slice(-6)
}

const handleCopy = async (value: any) => {
  const text = value === null || value === undefined ? '' : String(value)
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    toast.success('已复制')
  } catch {
    toast.error('复制失败')
  }
}

const toDatetimeInput = (value?: string | Date | null) => {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const normalizeFormValue = (field: AdminFieldSchema, value: any) => {
  if (field.type === 'json') {
    return value ? JSON.stringify(value, null, 2) : ''
  }
  if (field.type === 'datetime') {
    return toDatetimeInput(value)
  }
  if (field.type === 'boolean') {
    return !!value
  }
  return value ?? ''
}

const buildFormPayload = () => {
  const payload: Record<string, any> = {}
  ;(tableSchema.value?.fields || []).forEach((field) => {
    if (!field.editable || field.readOnly) return
    payload[field.name] = formModel[field.name]
  })
  return payload
}

const loadSchema = async () => {
  const res = await adminApi.getDatabaseTables()
  const schema = res.data?.find(item => item.name === activeTableName.value) || null
  if (!schema) {
    await router.replace('/admin/database')
    return
  }
  tableSchema.value = schema
}

const loadRows = async () => {
  if (!tableSchema.value) return
  loading.value = true
  try {
    const res = await adminApi.listDatabaseTable(activeTableName.value, {
      page: pagination.page,
      limit: pagination.limit,
      keyword: keyword.value.trim() || undefined
    })
    rows.value = res.data?.items || []
    pagination.total = res.data?.meta?.total || 0
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  if (!tableSchema.value?.allowCreate) return
  isCreating.value = true
  drawerOpen.value = true
  tableSchema.value.fields.forEach((field) => {
    formModel[field.name] = normalizeFormValue(field, null)
  })
}

const openEdit = (row: Record<string, any>) => {
  if (!tableSchema.value) return
  isCreating.value = false
  drawerOpen.value = true
  tableSchema.value.fields.forEach((field) => {
    formModel[field.name] = normalizeFormValue(field, row[field.name])
  })
}

const submitForm = async () => {
  if (!tableSchema.value) return
  const payload = buildFormPayload()
  try {
    if (isCreating.value) {
      await adminApi.createDatabaseRow(activeTableName.value, payload)
      toast.success('新增成功')
    } else {
      const pk = tableSchema.value.primaryKey
      const id = formModel[pk]
      if (!id) return
      await adminApi.updateDatabaseRow(activeTableName.value, String(id), payload)
      toast.success('更新成功')
    }
    drawerOpen.value = false
    await loadRows()
  } catch {
    toast.error('操作失败')
  }
}

const confirmDelete = async (row: Record<string, any>) => {
  if (!tableSchema.value?.allowDelete) return
  const confirmed = await dialog.confirm({
    title: '删除确认',
    content: '此操作不可撤销，是否继续？',
    type: 'warning'
  })
  if (!confirmed) return
  const id = row[tableSchema.value.primaryKey]
  if (!id) return
  try {
    await adminApi.deleteDatabaseRow(activeTableName.value, String(id))
    toast.success('删除成功')
    await loadRows()
  } catch {
    toast.error('删除失败')
  }
}

const openLookup = async (field: AdminFieldSchema) => {
  lookupField.value = field
  lookupKeyword.value = ''
  lookupResults.value = []
  lookupOpen.value = true
  await loadLookup()
}

const loadLookup = async () => {
  if (!lookupField.value?.relation) return
  lookupLoading.value = true
  try {
    const res = await adminApi.lookupDatabaseTable(lookupField.value.relation.table, {
      keyword: lookupKeyword.value.trim() || undefined,
      limit: 20
    })
    lookupResults.value = res.data || []
  } finally {
    lookupLoading.value = false
  }
}

const selectLookup = (item: AdminLookupItem) => {
  if (!lookupField.value) return
  formModel[lookupField.value.name] = item.value
  lookupOpen.value = false
}

const resetFilters = () => {
  keyword.value = ''
  pagination.page = 1
  loadRows()
}

const handleSearch = () => {
  pagination.page = 1
  loadRows()
}

const goPage = (next: number) => {
  pagination.page = Math.min(Math.max(1, next), totalPages.value)
  loadRows()
}

onMounted(async () => {
  await loadSchema()
  await loadRows()
})
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-3xl border border-base-200 bg-gradient-to-br from-base-100 via-base-100 to-base-200/60 p-6 shadow-sm">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon :name="tableMeta[activeTableName]?.icon || 'mingcute:classify-2-line'" size="24" />
          </div>
          <div>
            <div class="text-sm text-base-content/60">{{ tableMeta[activeTableName]?.label || tableSchema?.label }}</div>
            <h2 class="text-2xl font-bold">{{ tableSchema?.label || '数据表' }}</h2>
            <p class="text-sm text-base-content/60">{{ tableMeta[activeTableName]?.subtitle || '数据治理与权限调整' }}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button class="btn btn-sm btn-ghost" @click="resetFilters">重置筛选</button>
          <button class="btn btn-sm btn-primary" @click="handleSearch">搜索</button>
          <button v-if="tableSchema?.allowCreate" class="btn btn-sm btn-secondary" @click="openCreate">新增记录</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div class="form-control">
          <label class="label">
            <span class="label-text">关键词</span>
          </label>
          <input v-model="keyword" class="input input-bordered w-full" placeholder="按关键字段搜索" />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">每页数量</span>
          </label>
          <select v-model.number="pagination.limit" class="select select-bordered w-full" @change="handleSearch">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">记录总数</span>
          </label>
          <div class="rounded-2xl border border-base-200 bg-base-100 px-4 py-3 text-lg font-semibold">
            {{ pagination.total.toLocaleString() }}
          </div>
        </div>
      </div>
    </div>

    <div class="bg-base-100 rounded-2xl border border-base-200 p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm text-base-content/60">共 {{ pagination.total }} 条</div>
        <div class="flex items-center gap-2">
          <button class="btn btn-xs btn-ghost" :disabled="pagination.page <= 1" @click="goPage(pagination.page - 1)">上一页</button>
          <span class="text-xs text-base-content/60">{{ pagination.page }} / {{ totalPages }}</span>
          <button class="btn btn-xs btn-ghost" :disabled="pagination.page >= totalPages" @click="goPage(pagination.page + 1)">下一页</button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr>
              <th v-for="field in columns" :key="field.name">{{ field.label }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="columns.length + 1" class="text-center text-base-content/60">加载中...</td>
            </tr>
            <tr v-else-if="rows.length === 0">
              <td :colspan="columns.length + 1" class="text-center text-base-content/60">暂无数据</td>
            </tr>
            <tr v-else v-for="row in rows" :key="row[tableSchema?.primaryKey || 'id']" class="hover">
              <td v-for="field in columns" :key="field.name" class="text-sm">
                <div class="flex items-center gap-2">
                  <button
                    v-if="field.name.toLowerCase().endsWith('id') && row[field.name]"
                    class="px-2 py-1 rounded-lg bg-base-200 text-xs font-mono text-base-content/70 hover:bg-base-300 transition-colors"
                    @click="handleCopy(row[field.name])"
                    :title="String(row[field.name])"
                  >
                    {{ getIdShort(row[field.name]) }}
                  </button>
                  <span
                    v-else
                    class="line-clamp-2"
                    :title="String(formatCell(field, row[field.name]))"
                    :style="{ maxWidth: `${getCellMaxLength(field)}ch` }"
                  >
                    {{ formatCell(field, row[field.name]) }}
                  </span>
                </div>
              </td>
              <td class="text-right">
                <div class="flex justify-end gap-2">
                  <button v-if="tableSchema?.allowUpdate" class="btn btn-xs btn-ghost" @click="openEdit(row)">编辑</button>
                  <button v-if="tableSchema?.allowDelete" class="btn btn-xs btn-ghost text-error" @click="confirmDelete(row)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="drawerOpen" class="fixed inset-0 z-[200] flex items-center justify-end bg-black/30">
      <div class="w-full max-w-2xl h-full bg-base-100/80 backdrop-blur-md shadow-xl p-6 overflow-y-auto">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold">{{ isCreating ? '新增记录' : '编辑记录' }}</h3>
            <p class="text-sm text-base-content/60">{{ tableSchema?.label }} · {{ tableSchema?.name }}</p>
          </div>
          <button class="btn btn-sm btn-ghost" @click="drawerOpen = false">关闭</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div v-for="field in tableSchema?.fields || []" :key="field.name" class="form-control" :class="field.type === 'json' ? 'md:col-span-2' : ''">
            <label class="label">
              <span class="label-text">{{ field.label }}</span>
            </label>
            <input
              v-if="field.type === 'string' && !field.enumValues && !field.relation"
              v-model="formModel[field.name]"
              class="input input-bordered w-full"
              :disabled="field.readOnly"
            />
            <textarea
              v-else-if="field.type === 'json'"
              v-model="formModel[field.name]"
              class="textarea textarea-bordered w-full min-h-[140px]"
              :disabled="field.readOnly"
            ></textarea>
            <input
              v-else-if="field.type === 'number'"
              v-model.number="formModel[field.name]"
              type="number"
              class="input input-bordered w-full"
              :disabled="field.readOnly"
            />
            <input
              v-else-if="field.type === 'datetime'"
              v-model="formModel[field.name]"
              type="datetime-local"
              class="input input-bordered w-full"
              :disabled="field.readOnly"
            />
            <select
              v-else-if="field.type === 'enum'"
              v-model="formModel[field.name]"
              class="select select-bordered w-full"
              :disabled="field.readOnly"
            >
              <option v-for="item in field.enumValues || []" :key="item" :value="item">{{ item }}</option>
            </select>
            <label v-else-if="field.type === 'boolean'" class="label cursor-pointer justify-between">
              <span class="label-text">否 / 是</span>
              <input v-model="formModel[field.name]" type="checkbox" class="toggle toggle-primary" :disabled="field.readOnly" />
            </label>
            <div v-else-if="field.relation" class="flex gap-2">
              <input v-model="formModel[field.name]" class="input input-bordered w-full" :disabled="field.readOnly" />
              <button class="btn btn-ghost" type="button" :disabled="field.readOnly" @click="openLookup(field)">查找</button>
            </div>
            <input v-else v-model="formModel[field.name]" class="input input-bordered w-full" :disabled="field.readOnly" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-6">
          <button class="btn btn-ghost" @click="drawerOpen = false">取消</button>
          <button class="btn btn-primary" @click="submitForm">{{ isCreating ? '新增' : '保存' }}</button>
        </div>
      </div>
    </div>

    <div v-if="lookupOpen" class="fixed inset-0 z-[210] flex items-center justify-center bg-black/30">
      <div class="bg-base-100/80 backdrop-blur-md rounded-2xl border border-base-200 p-6 shadow-xl w-full max-w-xl">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold">外键查找</h3>
            <p class="text-sm text-base-content/60">双层检索快速定位关联记录</p>
          </div>
          <button class="btn btn-sm btn-ghost" @click="lookupOpen = false">关闭</button>
        </div>

        <div class="mt-4 flex gap-2">
          <input v-model="lookupKeyword" class="input input-bordered w-full" placeholder="输入关键字搜索" />
          <button class="btn btn-primary" @click="loadLookup">搜索</button>
        </div>

        <div class="mt-4 max-h-64 overflow-y-auto">
          <div v-if="lookupLoading" class="text-center text-base-content/60 py-6">加载中...</div>
          <div v-else-if="lookupResults.length === 0" class="text-center text-base-content/60 py-6">暂无结果</div>
          <ul v-else class="menu bg-base-100/80 backdrop-blur-md">
            <li v-for="item in lookupResults" :key="item.value">
              <button class="flex items-center gap-2" @click="selectLookup(item)">
                <span class="font-medium">{{ item.label }}</span>
                <span class="text-xs text-base-content/50">{{ item.value }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
