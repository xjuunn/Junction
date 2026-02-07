<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { isTauri } from '~/utils/check'
import {
  notify,
  getNotificationPermission,
  requestNotificationPermission,
} from '~/utils/notification'

const toast = useToast()
const settingsStore = useSettingsStore()
const {
  notificationEnableDesktop,
  notificationShowPreview,
  notificationSoundEnabled,
  notificationSoundVolume,
  notificationQuietHoursEnabled,
  notificationQuietHoursStart,
  notificationQuietHoursEnd,
  notificationMessageEnabled,
  notificationGroupEnabled,
  notificationMentionEnabled,
  notificationFriendRequestEnabled,
  notificationSystemEnabled,
} = storeToRefs(settingsStore)

const permission = ref<NotificationPermission>('default')
const isSaving = ref(false)

const previewOptions = [
  { value: 'always', label: '始终显示' },
  { value: 'when-unlocked', label: '仅在前台显示' },
  { value: 'never', label: '从不显示' },
]

const permissionText = computed(() => {
  if (permission.value === 'granted') return '已授权'
  if (permission.value === 'denied') return '已拒绝'
  return '未设置'
})

const permissionTone = computed(() => {
  if (permission.value === 'granted') return 'badge-success'
  if (permission.value === 'denied') return 'badge-error'
  return 'badge-ghost'
})

const refreshPermission = async () => {
  permission.value = await getNotificationPermission()
}

const handleRequestPermission = async () => {
  const result = await requestNotificationPermission()
  permission.value = result
  if (result === 'granted') toast.success('系统通知权限已授权')
  else toast.warning('系统通知权限未授权')
}

async function handleSave() {
  isSaving.value = true
  await new Promise(resolve => setTimeout(resolve, 300))
  toast.success('通知设置已保存')
  isSaving.value = false
}

const handleTestNotification = async () => {
  const result = await notify({
    title: '通知测试',
    body: '这是一条测试通知，用于验证系统通知是否可用。',
    category: 'system',
    force: true,
  }, {
    requestPermission: true,
  })
  if (!result.success) toast.warning('系统通知未发送，请检查权限与设置')
}

onMounted(() => {
  refreshPermission()
})
</script>

<template>
  <div class="card bg-base-100 shadow-sm border border-base-200 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div class="card-body p-6 md:p-8">
      <h2 class="card-title text-lg border-b border-base-200 pb-4 mb-6 flex items-center gap-2">
        <Icon name="mingcute:notification-line" class="text-primary" />
        通知设置
      </h2>

      <div class="space-y-8 max-w-2xl">
        <div>
          <h3 class="text-md font-bold mb-4 flex items-center gap-2">
            <Icon name="mingcute:notification-badge-line" class="text-base-content/50" />
            系统通知
          </h3>

          <div class="space-y-4">
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input
                  v-model="notificationEnableDesktop"
                  type="checkbox"
                  class="toggle toggle-primary"
                />
                <span class="label-text">
                  <span class="font-bold">启用系统通知</span>
                  <br />
                  <span class="text-sm text-base-content/50">使用系统级通知提示消息与事项</span>
                </span>
              </label>
            </div>

            <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-base-200 p-4 bg-base-200/40">
              <div class="flex items-center gap-2">
                <span class="text-sm text-base-content/70">权限状态</span>
                <span class="badge badge-sm" :class="permissionTone">{{ permissionText }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-base-content/50">
                <Icon name="mingcute:desktop-2-line" />
                <span>{{ isTauri() ? 'Tauri 端' : 'Web 端' }}</span>
              </div>
              <button class="btn btn-ghost btn-sm rounded-xl" @click="handleRequestPermission">
                授权系统通知
              </button>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <h3 class="text-md font-bold mb-4 flex items-center gap-2">
            <Icon name="mingcute:volume-line" class="text-base-content/50" />
            声音与预览
          </h3>

          <div class="space-y-4">
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input
                  v-model="notificationSoundEnabled"
                  type="checkbox"
                  class="toggle toggle-primary"
                />
                <span class="label-text font-bold">启用通知提示音</span>
              </label>
            </div>

            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-bold">提示音音量</span>
                <span class="label-text-alt">{{ notificationSoundVolume }}%</span>
              </label>
              <input
                v-model.number="notificationSoundVolume"
                type="range"
                min="0"
                max="100"
                class="range range-primary"
                :disabled="!notificationSoundEnabled"
              />
            </div>

            <div class="form-control w-full">
              <label class="label">
                <span class="label-text font-bold">内容预览</span>
              </label>
              <select
                v-model="notificationShowPreview"
                class="select select-bordered w-full focus:select-primary bg-base-100"
              >
                <option v-for="opt in previewOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <label class="label">
                <span class="label-text-alt text-base-content/50">控制通知横幅中显示的内容</span>
              </label>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <h3 class="text-md font-bold mb-4 flex items-center gap-2">
            <Icon name="mingcute:moon-line" class="text-base-content/50" />
            免打扰
          </h3>

          <div class="space-y-4">
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input
                  v-model="notificationQuietHoursEnabled"
                  type="checkbox"
                  class="toggle toggle-primary"
                />
                <span class="label-text font-bold">启用免打扰时段</span>
              </label>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-bold">开始时间</span>
                </label>
                <input
                  v-model="notificationQuietHoursStart"
                  type="time"
                  class="input input-bordered w-full focus:input-primary bg-base-100"
                  :disabled="!notificationQuietHoursEnabled"
                />
              </div>

              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text font-bold">结束时间</span>
                </label>
                <input
                  v-model="notificationQuietHoursEnd"
                  type="time"
                  class="input input-bordered w-full focus:input-primary bg-base-100"
                  :disabled="!notificationQuietHoursEnabled"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div>
          <h3 class="text-md font-bold mb-4 flex items-center gap-2">
            <Icon name="mingcute:message-3-line" class="text-base-content/50" />
            通知类型
          </h3>

          <div class="space-y-3">
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input
                  v-model="notificationMessageEnabled"
                  type="checkbox"
                  class="toggle toggle-primary"
                />
                <span class="label-text font-bold">新消息</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input
                  v-model="notificationGroupEnabled"
                  type="checkbox"
                  class="toggle toggle-primary"
                />
                <span class="label-text font-bold">群组消息</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input
                  v-model="notificationMentionEnabled"
                  type="checkbox"
                  class="toggle toggle-primary"
                />
                <span class="label-text font-bold">提及我的消息</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input
                  v-model="notificationFriendRequestEnabled"
                  type="checkbox"
                  class="toggle toggle-primary"
                />
                <span class="label-text font-bold">好友请求</span>
              </label>
            </div>

            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-4">
                <input
                  v-model="notificationSystemEnabled"
                  type="checkbox"
                  class="toggle toggle-primary"
                />
                <span class="label-text font-bold">系统通知</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="card-actions justify-end mt-10 pt-6 border-t border-base-200 gap-3">
        <button class="btn btn-ghost rounded-xl" @click="handleTestNotification">
          <Icon name="mingcute:notification-fill" />
          测试通知
        </button>
        <button class="btn btn-primary px-8 rounded-xl min-w-[120px]" @click="handleSave" :disabled="isSaving">
          <span v-if="isSaving" class="loading loading-spinner loading-xs"></span>
          保存修改
        </button>
      </div>
    </div>
  </div>
</template>
