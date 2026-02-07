import { menuService } from '~/core/menu'

export default defineNuxtPlugin(() => {
  const { isAdmin } = useAdminAccess()
  menuService.add({
    id: 'admin',
    name: '管理员',
    icon: 'mingcute:shield-line',
    path: '/admin',
    group: 'system',
    show: isAdmin
  })
})
