<template>
  <LayoutListDetail :show-detail="isDetailOpen" @back="handleBack">
    <template #list>
      <div class="flex h-full flex-col select-none border-r border-base-200 bg-base-100">
        <div class="shrink-0 space-y-5 px-5 pb-4 pt-8">
          <div class="flex items-center justify-between px-1">
            <h1 class="text-2xl font-extrabold tracking-tight text-base-content">搜索</h1>
            <div class="rounded-md bg-base-200/50 px-2 py-1 text-xs font-medium text-base-content/40">Ctrl+K</div>
          </div>

          <div class="relative group">
            <div
              class="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/30 transition-colors duration-300 group-focus-within:text-primary"
            >
              <Icon name="mingcute:search-3-line" size="18" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索用户..."
              class="h-11 w-full rounded-2xl bg-base-200/40 pl-10 pr-20 text-[15px] font-medium text-base-content transition-all placeholder:text-base-content/30 hover:bg-base-200/70 focus:bg-base-200 focus:outline-none focus:ring-2 focus:ring-primary/10"
              @keyup.enter="handleSearchSubmit()"
            />
            <button
              class="absolute right-9 top-1/2 -translate-y-1/2 p-0.5 text-base-content/40 transition-colors hover:text-primary"
              @click="handleSearchSubmit()"
            >
              <Icon name="mingcute:search-2-line" size="16" />
            </button>
            <button
              v-if="searchQuery"
              class="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-base-content/30 transition-colors hover:text-base-content"
              @click="clearSearch"
            >
              <Icon name="mingcute:close-circle-fill" size="16" />
            </button>
          </div>

          <div class="flex items-center justify-between">
            <div class="mask-linear-fade no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1">
              <button
                v-for="tab in filterTabs"
                :key="tab.key"
                class="whitespace-nowrap rounded-xl px-3.5 py-1.5 text-[13px] font-semibold transition-all"
                :class="activeFilter === tab.key
                  ? 'bg-base-content text-base-100 shadow-sm'
                  : 'bg-transparent text-base-content/50 hover:bg-base-200/60 hover:text-base-content'"
                @click="activeFilter = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>
            <button class="btn btn-circle btn-ghost btn-sm text-base-content/40 hover:bg-base-200">
              <Icon name="mingcute:filter-3-line" size="18" />
            </button>
          </div>
        </div>

        <div class="scroll-smooth flex-1 overflow-y-auto px-3 py-2">
          <div v-if="!searchQuery.trim() && searchHistory.length" class="px-2 pb-8">
            <div class="mb-3 flex items-center justify-between px-1">
              <span class="text-xs font-bold tracking-wider text-base-content/40">最近搜索</span>
              <button
                class="btn btn-ghost btn-xs rounded-lg text-base-content/50 hover:text-error"
                @click="clearSearchHistory"
              >
                清空
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="keyword in searchHistory"
                :key="keyword"
                class="group inline-flex items-center gap-1 rounded-xl border border-base-content/10 bg-base-200/40 px-3 py-1.5 text-xs font-medium text-base-content/70 transition hover:bg-base-200"
                @click="useHistoryKeyword(keyword)"
              >
                <Icon name="mingcute:history-line" size="14" class="text-base-content/40" />
                <span class="max-w-[140px] truncate">{{ keyword }}</span>
                <span
                  class="rounded-md p-0.5 text-base-content/30 hover:bg-base-content/10 hover:text-base-content/70"
                  @click.stop="removeHistoryKeyword(keyword)"
                >
                  <Icon name="mingcute:close-line" size="12" />
                </span>
              </button>
            </div>
          </div>

          <div v-else-if="isLoading" class="space-y-3 px-1">
            <div v-for="i in 5" :key="i" class="flex items-center gap-4 px-3 py-3.5">
              <div class="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-base-200/70"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 w-1/3 animate-pulse rounded bg-base-200/70"></div>
                <div class="h-3 w-2/3 animate-pulse rounded bg-base-200/50"></div>
              </div>
            </div>
          </div>

          <div v-else-if="filteredList.length > 0" class="space-y-1 pb-10">
            <div
              v-for="item in filteredList"
              :key="item.id"
              class="group relative flex cursor-pointer items-center gap-4 rounded-2xl px-3 py-3.5 transition-all duration-200"
              :class="[
                isActive(item.id)
                  ? 'bg-base-200/80'
                  : 'bg-transparent hover:bg-base-200/40'
              ]"
              @click="handleItemClick(item)"
            >
              <div class="relative shrink-0">
                <div
                  class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl transition-all duration-300"
                  :class="[
                    isActive(item.id)
                      ? 'scale-100 bg-base-100 shadow-sm'
                      : 'bg-base-200/50 group-hover:scale-105 group-hover:bg-base-200'
                  ]"
                >
                  <img v-if="item.avatar" :src="resolveAssetUrl(item.avatar)" class="h-full w-full object-cover" />
                  <Icon
                    v-else
                    :name="item.icon"
                    size="22"
                    class="transition-colors"
                    :class="isActive(item.id) ? 'text-primary' : 'text-base-content/60'"
                  />
                </div>
                <div
                  v-if="item.type === 'contact' && !isActive(item.id)"
                  class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-[2px] border-base-100 bg-success"
                ></div>
              </div>

              <div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                <div class="flex items-center justify-between">
                  <span
                    class="truncate text-[15px] font-semibold leading-tight"
                    :class="isActive(item.id) ? 'text-base-content' : 'text-base-content/80'"
                    v-html="highlightText(item.title, searchQuery)"
                  ></span>
                  <span v-if="item.time" class="text-[11px] font-medium text-base-content/30">
                    {{ item.time }}
                  </span>
                </div>
                <div class="flex h-4 items-center justify-between">
                  <span
                    class="max-w-[180px] truncate text-[13px] leading-tight"
                    :class="isActive(item.id) ? 'text-base-content/60' : 'text-base-content/40'"
                  >
                    {{ item.subtitle }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex h-[60vh] flex-col items-center justify-center gap-4 text-base-content/20">
            <div class="flex h-20 w-20 items-center justify-center rounded-3xl bg-base-200/30">
              <Icon name="mingcute:box-3-line" size="40" />
            </div>
            <p class="text-sm font-medium">无相关结果</p>
          </div>
        </div>
      </div>
    </template>

    <template #detail>
      <NuxtPage />
    </template>

    <template #empty>
      <div class="flex h-full flex-col items-center justify-center gap-4 text-base-content/30">
        <div class="flex h-24 w-24 items-center justify-center rounded-full bg-base-200/50">
          <Icon name="mingcute:layout-5-line" size="40" />
        </div>
        <span class="text-sm font-medium tracking-wide">选择左侧项目以查看详情</span>
      </div>
    </template>
  </LayoutListDetail>
</template>

<script setup lang="ts">
import * as User from '~/api/user'

definePageMeta({ layout: 'main' })

const route = useRoute()
const router = useRouter()

type ItemType = 'module' | 'file' | 'contact' | 'chat' | 'system'

interface SearchItem {
  id: string
  type: ItemType
  title: string
  subtitle: string
  detailInfo?: string
  time?: string
  icon: string
  iconColor?: string
  avatar?: string
  tags?: string[]
}

const searchQuery = ref('')
const activeFilter = ref('all')
const activeItemId = ref<string | null>(null)
const searchResults = ref<SearchItem[]>([])
const searchHistory = ref<string[]>([])
const isLoading = ref(false)
const SEARCH_HISTORY_KEY = 'junction:search:history'
const SEARCH_HISTORY_LIMIT = 12

const filterTabs = [
  { key: 'all', label: '全部' },
  { key: 'contact', label: '联系人' },
  { key: 'module', label: '应用' },
  { key: 'file', label: '文件' },
]

const isDetailOpen = computed(() => !!route.params.id || !!activeItemId.value)

const filteredList = computed(() => {
  if (activeFilter.value === 'all') return searchResults.value
  return searchResults.value.filter(item => item.type === activeFilter.value)
})

onMounted(() => {
  loadSearchHistory()
  initializeState()
})

watch(
  () => route.query.q,
  (newQ) => {
    const newVal = (newQ as string) || ''
    if (newVal !== searchQuery.value) searchQuery.value = newVal
    if (!newVal.trim()) {
      if (!activeItemId.value) searchResults.value = []
      return
    }
    performSearch(newVal, { recordHistory: false })
  },
)

watch(
  () => route.params.id,
  (newId) => {
    activeItemId.value = (newId as string) || null
  },
  { immediate: true },
)

function initializeState() {
  if (route.query.q) {
    searchQuery.value = route.query.q as string
    performSearch(searchQuery.value, { recordHistory: false })
  }
}

function handleSearchSubmit(keyword?: string) {
  const normalized = (keyword ?? searchQuery.value).trim()
  if (!normalized) {
    clearSearch()
    return
  }

  searchQuery.value = normalized
  if (activeItemId.value) {
    activeItemId.value = null
  }

  router.replace({
    path: '/search',
    query: { q: normalized },
  })

  performSearch(normalized, { recordHistory: true })
}

function handleBack() {
  activeItemId.value = null
  router.push({
    path: '/search',
    query: { q: searchQuery.value },
  })
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  activeItemId.value = null
  router.replace({ path: '/search' })
}

async function performSearch(keyword = searchQuery.value, options: { recordHistory?: boolean } = {}) {
  const normalizedKeyword = keyword.trim()
  if (!normalizedKeyword) {
    if (!activeItemId.value) {
      searchResults.value = []
    }
    return
  }

  if (options.recordHistory) {
    persistKeyword(normalizedKeyword)
  }

  isLoading.value = true
  try {
    const { data: result, success } = await User.search({ query: normalizedKeyword, page: 1, limit: 50 })
    if (success && result) {
      searchResults.value = result.items.map((user: any) => mapUserToItem(user))
    }
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

function mapUserToItem(user: any): SearchItem {
  return {
    id: user.id,
    type: 'contact',
    title: user.name || 'Unknown User',
    subtitle: user.email || 'No email provided',
    detailInfo: user.email,
    icon: 'mingcute:user-3-line',
    iconColor: 'text-primary',
    avatar: resolveUserAvatar(user.image || user.avatar),
    tags: ['用户'],
    time: '',
  }
}

function resolveUserAvatar(raw?: string | null) {
  if (!raw) return ''
  const value = String(raw).trim()
  if (!value) return ''

  if (/^(https?:)?\/\//.test(value)) {
    try {
      const url = new URL(value)
      if (url.pathname.startsWith('/uploads/')) {
        return resolveAssetUrl(`${url.pathname}${url.search || ''}`)
      }
      return value
    } catch {
      return resolveAssetUrl(value)
    }
  }

  return resolveAssetUrl(value)
}

function handleItemClick(item: SearchItem) {
  activeItemId.value = item.id
  navigateTo({
    path: `/search/user/${item.id}`,
    query: { ...route.query, q: searchQuery.value },
  })
}

function loadSearchHistory() {
  if (!import.meta.client) return
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return
    searchHistory.value = list
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, SEARCH_HISTORY_LIMIT)
  } catch {
    searchHistory.value = []
  }
}

function persistHistory() {
  if (!import.meta.client) return
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory.value))
}

function persistKeyword(keyword: string) {
  const normalized = keyword.trim()
  if (!normalized) return
  const next = [normalized, ...searchHistory.value.filter(item => item !== normalized)].slice(0, SEARCH_HISTORY_LIMIT)
  searchHistory.value = next
  persistHistory()
}

function useHistoryKeyword(keyword: string) {
  handleSearchSubmit(keyword)
}

function removeHistoryKeyword(keyword: string) {
  searchHistory.value = searchHistory.value.filter(item => item !== keyword)
  persistHistory()
}

function clearSearchHistory() {
  searchHistory.value = []
  if (import.meta.client) {
    localStorage.removeItem(SEARCH_HISTORY_KEY)
  }
}

function isActive(id: string) {
  return activeItemId.value === id
}

function highlightText(text: string, query: string) {
  if (!query) return text
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const reg = new RegExp(`(${safeQuery})`, 'gi')
  return text.replace(reg, '<span class="rounded-sm bg-primary/10 px-0.5 font-bold text-primary">$1</span>')
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.mask-linear-fade {
  mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%);
}
</style>
