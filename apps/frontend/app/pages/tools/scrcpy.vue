<script setup lang="ts">
import gsap from 'gsap';
import { isTauri } from '~/utils/check';
import { createAdbClient, type AdbDevice } from '~/utils/adb';

definePageMeta({ layout: 'main' });

const toast = useToast();
const settings = useSettingsStore();
const device = useDevice();
const isTauriEnv = isTauri();
const adbClient = computed(() => createAdbClient({
  scrcpyPath: settings.scrcpyPath?.trim() || undefined,
}));

// --- 状态定义 ---
const osType = ref<string>('unknown');
const adbReady = ref(false);
const scrcpyReady = ref(false);
const devices = ref<AdbDevice[]>([]);
const isLoading = ref(false);
const selectedSerial = ref<string>('');
const wifiPort = ref('53301');
const manualIp = ref('');
const isScanning = ref(false);
const scanProgress = ref({ total: 0, done: 0 });
const actionText = ref('');

// --- 计算属性 ---
const isSupported = computed(() => isTauriEnv && ['windows', 'macos', 'linux', 'darwin'].includes(osType.value.toLowerCase()));
const selectedDevice = computed(() => devices.value.find(item => item.serial === selectedSerial.value) || null);

// --- 高级设置 ---
const advanced = reactive({
  video: { maxSize: '1920', maxFps: '60', videoCodec: 'h264' },
  control: { turnScreenOff: false, stayAwake: true },
  audio: { enabled: true }
});

const buildScrcpyArgs = () => {
  const args: string[] = [
    `--max-size=${advanced.video.maxSize}`,
    `--max-fps=${advanced.video.maxFps}`,
    `--video-codec=${advanced.video.videoCodec}`,
  ];
  if (advanced.control.turnScreenOff) args.push('--turn-screen-off');
  if (advanced.control.stayAwake) args.push('--stay-awake');
  if (!advanced.audio.enabled) args.push('--no-audio');
  return args;
};

/**
 * 核心逻辑：智能发现与连接
 * 解决 IP 获取不到的终极方案
 */
const smartDiscover = async () => {
  if (!adbReady.value) return;
  isScanning.value = true;
  scanProgress.value = { total: 0, done: 0 };
  let successCount = 0;

  try {
    // 1. 先刷新现有设备
    await refreshDevices(true);

    // 2. 策略 A：从 USB 设备直接提取 IP（最高优先级）
    const usbDevices = devices.value.filter(d => !d.isTcp);
    if (usbDevices.length > 0) {
      for (const d of usbDevices) {
        toast.info(`正在转换 USB 设备 ${d.displayName} 为无线...`);
        const ip = await adbClient.value.getDeviceIp(d.serial);
        if (ip) {
          console.log(`[Discovery] 抓取到 USB 设备 IP: ${ip}`);
          await adbClient.value.enableTcpip(d.serial, Number(wifiPort.value));
          await new Promise(r => setTimeout(r, 1000)); // 等待端口开启
          await adbClient.value.connect(ip, Number(wifiPort.value));
        }
      }
    }

    // 3. 策略 B：尝试静默 ARP 扫描（容错处理）
    let candidateIps: string[] = [];
    try {
      const arpResults = await adbClient.value.listArpIps();
      if (arpResults) candidateIps.push(...arpResults);
    } catch (e) {
      console.warn('[Discovery] ARP 编码报错，跳过该环节');
    }

    // 4. 策略 C：基于已发现 IP 的网段盲扫
    if (candidateIps.length > 0) {
      const targetIps = [...new Set(candidateIps)];
      scanProgress.value.total = targetIps.length;
      const batchSize = 10;
      for (let i = 0; i < targetIps.length; i += batchSize) {
        const batch = targetIps.slice(i, i + batchSize);
        await Promise.all(batch.map(async (ip) => {
          try {
            await adbClient.value.connect(ip, Number(wifiPort.value));
            successCount += 1;
          } catch { }
          scanProgress.value.done++;
        }));
        await refreshDevices(true);
      }
    }

    if (successCount > 0) {
      toast.success(`发现并连接 ${successCount} 台设备`);
    } else {
      toast.warning('未发现可连接的设备');
    }
  } catch (err: any) {
    console.error('[Discovery] Failed', err);
  } finally {
    isScanning.value = false;
    await refreshDevices();
  }
};

const refreshDevices = async (silent = false) => {
  if (!isSupported.value || !adbReady.value) return;
  if (!silent) isLoading.value = true;
  try {
    const list = await adbClient.value.listDevices();
    devices.value = list || [];
    if (devices.value.length > 0 && !selectedSerial.value) {
      selectedSerial.value = devices.value[0].serial;
    }
  } finally {
    isLoading.value = false;
  }
};

const checkEnv = async () => {
  if (!isTauriEnv) return;
  const [adb, scrcpy, os] = await Promise.all([
    adbClient.value.checkBinary('adb'),
    adbClient.value.checkBinary('scrcpy'),
    import('@tauri-apps/plugin-os').then(m => m.type())
  ]);
  adbReady.value = adb.ok;
  scrcpyReady.value = scrcpy.ok;
  osType.value = os;
};

const startControl = async () => {
  if (!selectedDevice.value) return;
  const args = buildScrcpyArgs();

  try {
    await adbClient.value.launchScrcpy(selectedDevice.value.serial, args);
  } catch (e: any) {
    toast.error(e.message);
  }
};

const connectManual = async () => {
  const ip = manualIp.value.trim();
  if (!ip) {
    toast.warning('请输入设备 IP');
    return;
  }
  try {
    await adbClient.value.connect(ip, Number(wifiPort.value));
    await refreshDevices();
  } catch (e: any) {
    toast.error(e?.message || '连接失败');
  }
};

const connectSelectedWifi = async () => {
  if (!selectedDevice.value) {
    toast.warning('请先选择设备');
    return;
  }
  const ip = await adbClient.value.getDeviceIp(selectedDevice.value.serial);
  if (!ip) {
    toast.warning('未获取到设备 IP');
    return;
  }
  deviceIp.value = ip;
  try {
    await adbClient.value.enableTcpip(selectedDevice.value.serial, Number(wifiPort.value));
    await new Promise(r => setTimeout(r, 800));
    await adbClient.value.connect(ip, Number(wifiPort.value));
    await refreshDevices();
  } catch (e: any) {
    toast.error(e?.message || '连接失败');
  }
};

const sendKey = async (keyCode: string, label: string) => {
  if (!selectedDevice.value) {
    toast.warning('请先选择设备');
    return;
  }
  try {
    const result = await adbClient.value.keyEvent(selectedDevice.value.serial, keyCode);
    if (!result.ok) toast.error(result.stderr || `发送 ${label} 失败`);
  } catch (e: any) {
    toast.error(e?.message || '发送失败');
  }
};

onMounted(async () => {
  await checkEnv();
  if (adbReady.value) {
    await refreshDevices();
    smartDiscover();
  }
  gsap.from(".side-panel", { x: -50, opacity: 0, duration: 0.8, ease: "expo.out" });
  gsap.from(".main-card", { scale: 0.95, opacity: 0, duration: 0.8, delay: 0.2, ease: "expo.out" });
});
</script>

<template>
  <div
    class="h-screen bg-base-100 flex p-4 gap-4 overflow-hidden text-base-content selection:bg-primary selection:text-primary-content">

    <!-- 左侧：侧边导航与列表 -->
    <aside class="side-panel w-80 flex flex-col gap-4 z-10">
      <div
        class="bg-base-200/50 backdrop-blur-2xl rounded-[2.5rem] border border-base-content/5 flex flex-col overflow-hidden shadow-sm flex-1">
        <div class="p-6 pb-2 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
            <h1 class="text-sm font-black uppercase tracking-widest opacity-70">设备终端</h1>
          </div>
          <button @click="refreshDevices()" class="btn btn-circle btn-ghost btn-xs" :disabled="isLoading">
            <Icon name="heroicons:arrow-path" :class="{ 'animate-spin': isLoading }" />
          </button>
        </div>

        <!-- 列表容器 -->
        <div class="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          <div v-if="devices.length === 0"
            class="h-full flex flex-col items-center justify-center text-center opacity-30 px-6">
            <Icon name="heroicons:bolt-slash" class="text-5xl mb-4" />
            <p class="text-xs font-bold leading-relaxed uppercase">无连接端点<br>请通过 USB 引导或点击自动发现</p>
          </div>

          <button v-for="d in devices" :key="d.serial" @click="selectedSerial = d.serial" :class="['w-full p-4 rounded-3xl transition-all duration-500 border text-left relative group',
            selectedSerial === d.serial
              ? 'bg-primary text-primary-content border-primary shadow-2xl shadow-primary/20 scale-[1.02]'
              : 'bg-base-100 border-base-content/5 hover:border-primary/20'
          ]">
            <div class="flex justify-between items-center mb-3">
              <div :class="['p-2 rounded-xl', selectedSerial === d.serial ? 'bg-white/20' : 'bg-base-200']">
                <Icon :name="d.isTcp ? 'heroicons:rss-20-solid' : 'heroicons:usb-20-solid'" />
              </div>
              <span class="text-[9px] font-black tracking-widest uppercase opacity-60">{{ d.status }}</span>
            </div>
            <div class="font-black text-sm truncate pr-4">{{ d.displayName }}</div>
            <div class="text-[10px] font-mono opacity-40 truncate mt-1 uppercase">{{ d.serial }}</div>
          </button>
        </div>

        <!-- 自动发现底部栏 -->
        <div class="p-4 bg-base-300/30 border-t border-base-content/5">
          <button @click="smartDiscover" :disabled="isScanning"
            class="btn btn-primary btn-block rounded-2xl shadow-lg shadow-primary/20 group">
            <Icon v-if="isScanning" name="heroicons:ellipsis-horizontal" class="animate-bounce" />
            <Icon v-else name="heroicons:magnifying-glass-20-solid"
              class="group-hover:scale-125 transition-transform" />
            {{ isScanning ? `正在探测网段 ${scanProgress.done}/${scanProgress.total}` : '智能自动发现' }}
          </button>
        </div>
      </div>
    </aside>

    <!-- 右侧：操作主区域 -->
    <main class="flex-1 flex flex-col gap-4">

      <!-- 顶部状态信息 -->
      <header
        class="h-16 flex-none bg-base-200/30 backdrop-blur-md rounded-[1.5rem] border border-base-content/5 px-8 flex items-center justify-between">
        <div class="flex gap-6 text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
          <div class="flex items-center gap-2">
            <span :class="['w-1.5 h-1.5 rounded-full', adbReady ? 'bg-success' : 'bg-error']"></span>
            ADB Engine
          </div>
          <div class="flex items-center gap-2">
            <span :class="['w-1.5 h-1.5 rounded-full', scrcpyReady ? 'bg-success' : 'bg-error']"></span>
            Scrcpy Binary
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="join bg-base-100 rounded-full border border-base-content/10 px-4 py-1">
            <span class="text-[9px] font-bold opacity-40 uppercase mr-3">Manual Link</span>
            <input v-model="manualIp" class="bg-transparent text-xs w-28 focus:outline-none" placeholder="192.168..." />
            <input v-model="wifiPort" class="bg-transparent text-xs w-16 focus:outline-none ml-2" placeholder="53301" />
            <button @click="connectManual"
              class="hover:text-primary transition-colors">
              <Icon name="heroicons:paper-airplane-20-solid" />
            </button>
          </div>
          <button class="btn btn-ghost btn-sm rounded-full" @click="connectSelectedWifi">
            一键无线连接
          </button>
        </div>
      </header>

      <!-- 设备详情卡片 -->
      <div
        class="main-card flex-1 bg-base-100 rounded-[3rem] border border-base-content/10 shadow-2xl overflow-hidden flex flex-col relative">
        <div v-if="selectedDevice" class="flex flex-col h-full">
          <!-- 卡片头部：Hero 区域 -->
          <div
            class="p-12 pb-8 flex justify-between items-end bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 relative">
            <div class="absolute top-0 right-0 p-12 opacity-[0.02] select-none">
              <Icon name="heroicons:device-phone-mobile" class="text-[20rem] -rotate-12" />
            </div>

            <div class="space-y-4 relative z-10">
              <div class="flex items-center gap-3">
                <span
                  class="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">Active
                  Link</span>
                <span class="text-xs font-mono opacity-40">#{{ selectedDevice.serial }}</span>
              </div>
              <h2 class="text-6xl font-black tracking-tighter">{{ selectedDevice.displayName }}</h2>
              <div class="flex items-center gap-8 pt-4">
                <div class="flex flex-col">
                  <span class="text-[10px] font-black opacity-30 uppercase">连接模式</span>
                  <span class="text-sm font-bold uppercase">{{ selectedDevice.isTcp ? 'Wireless' : 'USB Tethered'
                    }}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-[10px] font-black opacity-30 uppercase">刷新率限制</span>
                  <span class="text-sm font-bold uppercase">{{ advanced.video.maxFps }} FPS</span>
                </div>
              </div>
            </div>

            <button @click="startControl"
              class="btn btn-primary btn-lg rounded-[2rem] px-12 h-24 shadow-2xl shadow-primary/40 hover:scale-105 transition-all group relative z-10">
              <Icon name="heroicons:play-20-solid" class="text-2xl group-hover:rotate-12 transition-transform" />
              <span class="text-lg font-black uppercase tracking-widest">启动远程镜像</span>
            </button>
          </div>

          <!-- 分隔线 -->
          <div class="px-12">
            <div class="h-px bg-base-content/5 w-full"></div>
          </div>

          <!-- 功能区：控制与配置 -->
          <div class="flex-1 p-12 grid grid-cols-12 gap-10">
            <!-- 快捷键 -->
            <div class="col-span-4 space-y-6">
              <h3 class="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] flex items-center gap-2">
                <Icon name="heroicons:cursor-arrow-ripple" />
                智能交互控制
              </h3>
              <div class="grid grid-cols-2 gap-3">
                <button @click="sendKey('KEYCODE_HOME', '主页')"
                  class="btn btn-ghost bg-base-200/50 rounded-2xl h-16 border-none hover:bg-primary hover:text-white transition-all font-bold">主页</button>
                <button @click="sendKey('KEYCODE_BACK', '返回')"
                  class="btn btn-ghost bg-base-200/50 rounded-2xl h-16 border-none hover:bg-primary hover:text-white transition-all font-bold">返回</button>
                <button @click="sendKey('KEYCODE_POWER', '电源')"
                  class="btn btn-ghost bg-base-200/50 rounded-2xl h-16 border-none hover:bg-error hover:text-white transition-all font-bold group">
                  <Icon name="heroicons:power-20-solid" class="text-error group-hover:text-white" />
                </button>
                <button @click="sendKey('KEYCODE_APP_SWITCH', '多任务')"
                  class="btn btn-ghost bg-base-200/50 rounded-2xl h-16 border-none hover:bg-primary hover:text-white transition-all font-bold">多任务</button>
              </div>
            </div>

            <!-- 参数调节 -->
            <div class="col-span-8 space-y-6">
              <h3 class="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] flex items-center gap-2">
                <Icon name="heroicons:adjustments-vertical" />
                渲染参数设置
              </h3>
              <div class="grid grid-cols-2 gap-6 bg-base-200/30 rounded-[2rem] p-8">
                <div class="space-y-4">
                  <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black opacity-50 ml-1">分辨率限制</label>
                    <select v-model="advanced.video.maxSize"
                      class="select select-bordered rounded-xl bg-base-100 border-none shadow-sm text-xs">
                      <option value="1920">1080P Full HD</option>
                      <option value="1280">720P Standard</option>
                      <option value="720">480P Low End</option>
                    </select>
                  </div>
                  <label class="flex items-center justify-between px-1 cursor-pointer">
                    <span class="text-xs font-bold opacity-70">启用音频同步</span>
                    <input type="checkbox" v-model="advanced.audio.enabled" class="toggle toggle-primary toggle-sm" />
                  </label>
                </div>
                <div class="space-y-4">
                  <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black opacity-50 ml-1">最大渲染帧率</label>
                    <select v-model="advanced.video.maxFps"
                      class="select select-bordered rounded-xl bg-base-100 border-none shadow-sm text-xs">
                      <option value="30">30 FPS (省电)</option>
                      <option value="60">60 FPS (流畅)</option>
                      <option value="120">120 FPS (极速)</option>
                    </select>
                  </div>
                  <label class="flex items-center justify-between px-1 cursor-pointer">
                    <span class="text-xs font-bold opacity-70">启动后熄灭屏幕</span>
                    <input type="checkbox" v-model="advanced.control.turnScreenOff"
                      class="toggle toggle-primary toggle-sm" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 未选择状态 -->
        <div v-else class="h-full flex flex-col items-center justify-center text-center p-20 opacity-20 group">
          <div
            class="w-32 h-32 rounded-full border-4 border-dashed border-base-content/20 flex items-center justify-center mb-8 group-hover:rotate-180 transition-transform duration-1000">
            <Icon name="heroicons:cpu-chip" class="text-6xl" />
          </div>
          <h3 class="text-2xl font-black uppercase tracking-widest">等待端点接入</h3>
          <p class="text-sm mt-2 max-w-xs">请从左侧面板选择一个活跃的移动端设备，或者使用“智能自动发现”搜索局域网。</p>
        </div>
      </div>
    </main>

    <!-- 背景装饰 -->
    <div class="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full -z-10"></div>
    <div class="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 blur-[120px] rounded-full -z-10"></div>
  </div>
</template>

<style scoped>
/* 滚动条极致隐藏美化 */
::-webkit-scrollbar {
  width: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: hsl(var(--bc) / 0.1);
  border-radius: 20px;
}

::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--bc) / 0.2);
}

/* 字体优化 */
:deep(body) {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.btn {
  text-transform: none;
  letter-spacing: 0.05em;
}
</style>
