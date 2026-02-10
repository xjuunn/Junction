<script setup lang="ts">
import gsap from 'gsap';
import { isTauri } from '~/utils/check';
import { createAdbClient, type AdbDevice } from '~/utils/adb';

definePageMeta({ layout: 'main' });

const toast = useToast();
const settings = useSettingsStore();
const device = useDevice();
const router = useRouter();
const isTauriEnv = isTauri();
const adbClient = computed(() => createAdbClient({
  scrcpyPath: settings.scrcpyPath?.trim() || undefined,
}));
const scrcpyConfig = settings.scrcpyConfig;

// --- 状态定义 ---
const osType = ref<string>('unknown');
const adbReady = ref(false);
const scrcpyReady = ref(false);
const devices = ref<AdbDevice[]>([]);
const isLoading = ref(false);
const selectedSerial = ref<string>('');
const wifiPort = ref('53301');
const manualIp = ref('');
const deviceIp = ref('');
const autoLinkedSerials = new Set<string>();
const isAutoLinking = ref(false);
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);
const showHelpModal = ref(false);
const openSettings = () => {
  navigateTo('/tools/scrcpy/settings');
};

// --- 计算属性 ---
const isSupported = computed(() => isTauriEnv && ['windows', 'macos', 'linux', 'darwin'].includes(osType.value.toLowerCase()));
const selectedDevice = computed(() => devices.value.find(item => item.serial === selectedSerial.value) || null);

const buildScrcpyArgs = () => {
  const args: string[] = [];
  const connection = scrcpyConfig.connection;
  const video = scrcpyConfig.video;
  const audio = scrcpyConfig.audio;
  const control = scrcpyConfig.control;
  const keyboard = scrcpyConfig.keyboard;
  const mouse = scrcpyConfig.mouse;
  const gamepad = scrcpyConfig.gamepad;
  const deviceConfig = scrcpyConfig.device;
  const windowConfig = scrcpyConfig.window;
  const recording = scrcpyConfig.recording;
  const virtualDisplay = scrcpyConfig.virtualDisplay;
  const tunnels = scrcpyConfig.tunnels;
  const otg = scrcpyConfig.otg;
  const camera = scrcpyConfig.camera;
  const v4l2 = scrcpyConfig.v4l2;
  const shortcuts = scrcpyConfig.shortcuts;

  if (connection.selectUsb) args.push('--select-usb');
  if (connection.selectTcpip) args.push('--select-tcpip');
  if (connection.tcpipAuto) args.push('--tcpip');
  if (connection.tcpipAddress.trim()) args.push(`--tcpip=${connection.tcpipAddress.trim()}`);

  if (!video.enabled) args.push('--no-video');
  if (video.maxSize.trim()) args.push(`--max-size=${video.maxSize.trim()}`);
  if (video.maxFps.trim()) args.push(`--max-fps=${video.maxFps.trim()}`);
  if (video.videoCodec.trim()) args.push(`--video-codec=${video.videoCodec.trim()}`);
  if (video.videoBitRate.trim()) args.push(`--video-bit-rate=${video.videoBitRate.trim()}`);
  if (video.videoEncoder.trim()) args.push(`--video-encoder=${video.videoEncoder.trim()}`);
  if (video.crop.trim()) args.push(`--crop=${video.crop.trim()}`);
  if (video.captureOrientation.trim()) args.push(`--capture-orientation=${video.captureOrientation.trim()}`);
  if (video.orientation.trim()) args.push(`--orientation=${video.orientation.trim()}`);
  if (video.displayOrientation.trim()) args.push(`--display-orientation=${video.displayOrientation.trim()}`);
  if (video.recordOrientation.trim()) args.push(`--record-orientation=${video.recordOrientation.trim()}`);
  if (video.angle.trim()) args.push(`--angle=${video.angle.trim()}`);
  if (video.displayId.trim()) args.push(`--display-id=${video.displayId.trim()}`);
  if (video.videoBuffer.trim()) args.push(`--video-buffer=${video.videoBuffer.trim()}`);
  if (video.noDownsizeOnError) args.push('--no-downsize-on-error');
  if (video.noPlayback) args.push('--no-playback');
  if (video.noVideoPlayback) args.push('--no-video-playback');

  if (!audio.enabled) args.push('--no-audio');
  if (audio.requireAudio) args.push('--require-audio');
  if (audio.audioSource.trim()) args.push(`--audio-source=${audio.audioSource.trim()}`);
  if (audio.audioCodec.trim()) args.push(`--audio-codec=${audio.audioCodec.trim()}`);
  if (audio.audioBitRate.trim()) args.push(`--audio-bit-rate=${audio.audioBitRate.trim()}`);
  if (audio.audioBuffer.trim()) args.push(`--audio-buffer=${audio.audioBuffer.trim()}`);
  if (audio.noAudioPlayback) args.push('--no-audio-playback');

  if (!control.controlEnabled) args.push('--no-control');
  if (control.showTouches) args.push('--show-touches');
  if (control.stayAwake) args.push('--stay-awake');
  if (control.turnScreenOff) args.push('--turn-screen-off');
  if (control.powerOffOnClose) args.push('--power-off-on-close');
  if (control.noClipboardAutosync) args.push('--no-clipboard-autosync');
  if (control.legacyPaste) args.push('--legacy-paste');
  if (control.pushTarget.trim()) args.push(`--push-target=${control.pushTarget.trim()}`);

  if (keyboard.keyboardMode.trim()) args.push(`--keyboard=${keyboard.keyboardMode.trim()}`);
  if (keyboard.preferText) args.push('--prefer-text');
  if (keyboard.rawKeyEvents) args.push('--raw-key-events');
  if (keyboard.noKeyRepeat) args.push('--no-key-repeat');

  if (mouse.mouseMode.trim()) args.push(`--mouse=${mouse.mouseMode.trim()}`);
  if (mouse.noMouseHover) args.push('--no-mouse-hover');
  if (mouse.mouseBind.trim()) args.push(`--mouse-bind=${mouse.mouseBind.trim()}`);

  if (gamepad.gamepadMode.trim()) args.push(`--gamepad=${gamepad.gamepadMode.trim()}`);

  if (deviceConfig.screenOffTimeout.trim()) args.push(`--screen-off-timeout=${deviceConfig.screenOffTimeout.trim()}`);
  if (deviceConfig.noPowerOn) args.push('--no-power-on');
  if (deviceConfig.startApp.trim()) args.push(`--start-app=${deviceConfig.startApp.trim()}`);

  if (windowConfig.noWindow) args.push('--no-window');
  if (windowConfig.windowTitle.trim()) args.push(`--window-title=${windowConfig.windowTitle.trim()}`);
  if (windowConfig.windowX.trim()) args.push(`--window-x=${windowConfig.windowX.trim()}`);
  if (windowConfig.windowY.trim()) args.push(`--window-y=${windowConfig.windowY.trim()}`);
  if (windowConfig.windowWidth.trim()) args.push(`--window-width=${windowConfig.windowWidth.trim()}`);
  if (windowConfig.windowHeight.trim()) args.push(`--window-height=${windowConfig.windowHeight.trim()}`);
  if (windowConfig.borderless) args.push('--window-borderless');
  if (windowConfig.alwaysOnTop) args.push('--always-on-top');
  if (windowConfig.fullscreen) args.push('--fullscreen');
  if (windowConfig.disableScreensaver) args.push('--disable-screensaver');

  if (recording.recordPath.trim()) args.push(`--record=${recording.recordPath.trim()}`);
  if (recording.recordFormat.trim()) args.push(`--record-format=${recording.recordFormat.trim()}`);
  if (recording.timeLimit.trim()) args.push(`--time-limit=${recording.timeLimit.trim()}`);
  if (recording.noPlayback) args.push('--no-playback');

  if (virtualDisplay.enabled) {
    args.push(virtualDisplay.newDisplay.trim() ? `--new-display=${virtualDisplay.newDisplay.trim()}` : '--new-display');
    if (virtualDisplay.noSystemDecorations) args.push('--no-vd-system-decorations');
    if (virtualDisplay.noDestroyContent) args.push('--no-vd-destroy-content');
    if (virtualDisplay.displayImePolicy.trim()) {
      args.push(`--display-ime-policy=${virtualDisplay.displayImePolicy.trim()}`);
    }
  }

  if (tunnels.tunnelHost.trim()) args.push(`--tunnel-host=${tunnels.tunnelHost.trim()}`);
  if (tunnels.tunnelPort.trim()) args.push(`--tunnel-port=${tunnels.tunnelPort.trim()}`);
  if (tunnels.port.trim()) args.push(`--port=${tunnels.port.trim()}`);
  if (tunnels.forceAdbForward) args.push('--force-adb-forward');

  if (otg.enabled) {
    args.push('--otg');
    if (otg.keyboardDisabled) args.push('--keyboard=disabled');
    if (otg.mouseDisabled) args.push('--mouse=disabled');
    if (otg.gamepadEnabled) args.push('--gamepad=aoa');
  }

  if (camera.videoSource.trim()) args.push(`--video-source=${camera.videoSource.trim()}`);
  if (camera.cameraId.trim()) args.push(`--camera-id=${camera.cameraId.trim()}`);
  if (camera.cameraFacing.trim()) args.push(`--camera-facing=${camera.cameraFacing.trim()}`);
  if (camera.cameraSize.trim()) args.push(`--camera-size=${camera.cameraSize.trim()}`);
  if (camera.cameraAr.trim()) args.push(`--camera-ar=${camera.cameraAr.trim()}`);

  if (v4l2.v4l2Sink.trim()) args.push(`--v4l2-sink=${v4l2.v4l2Sink.trim()}`);
  if (v4l2.v4l2Buffer.trim()) args.push(`--v4l2-buffer=${v4l2.v4l2Buffer.trim()}`);

  if (shortcuts.shortcutMod.trim()) args.push(`--shortcut-mod=${shortcuts.shortcutMod.trim()}`);

  const extraArgs = scrcpyConfig.extraArgs
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
  if (extraArgs.length) args.push(...extraArgs);

  return args;
};

const refreshDevices = async (silent = false) => {
  if (!isSupported.value || !adbReady.value) return;
  if (!silent) isLoading.value = true;
  try {
    const list = await adbClient.value.listDevices();
    const deduped = new Map<string, AdbDevice>();
    for (const item of list || []) {
      const key = item.serial || '';
      if (!key || deduped.has(key)) continue;
      deduped.set(key, item);
    }
    devices.value = Array.from(deduped.values());
    if (devices.value.length > 0 && !selectedSerial.value) {
      selectedSerial.value = devices.value[0].serial;
    }
    const currentSerials = new Set(devices.value.map(item => item.serial));
    for (const serial of Array.from(autoLinkedSerials)) {
      if (!currentSerials.has(serial)) autoLinkedSerials.delete(serial);
    }
    if (!isAutoLinking.value) {
      const usbDevices = devices.value.filter(d => !d.isTcp && !autoLinkedSerials.has(d.serial));
      if (usbDevices.length > 0) {
        isAutoLinking.value = true;
        for (const d of usbDevices) {
          try {
            const ip = await adbClient.value.getDeviceIp(d.serial);
            if (!ip) continue;
            deviceIp.value = ip;
            autoLinkedSerials.add(d.serial);
            await adbClient.value.enableTcpip(d.serial, Number(wifiPort.value));
            await new Promise(r => setTimeout(r, 800));
            await adbClient.value.connect(ip, Number(wifiPort.value));
          } catch {
            // 自动流程失败时不阻塞用户手动操作
          }
        }
        await refreshDevices(true);
        isAutoLinking.value = false;
      }
    }
  } finally {
    isLoading.value = false;
  }
};

const disconnectAll = async () => {
  if (!adbReady.value) {
    toast.warning('ADB 未就绪');
    return;
  }
  try {
    await adbClient.value.disconnect();
    await refreshDevices();
    toast.success('已断开所有连接');
  } catch (e: any) {
    toast.error(e?.message || '断开失败');
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
  if (!selectedDevice.value && !scrcpyConfig.connection.serial.trim()) {
    toast.warning('请先选择设备或填写序列号');
    return;
  }
  const args = buildScrcpyArgs();
  const shouldUseSelector = scrcpyConfig.connection.selectUsb
    || scrcpyConfig.connection.selectTcpip
    || scrcpyConfig.connection.tcpipAuto
    || !!scrcpyConfig.connection.tcpipAddress.trim()
    || !!scrcpyConfig.connection.serial.trim();
  const serial = scrcpyConfig.connection.serial.trim()
    || (shouldUseSelector ? null : selectedDevice.value?.serial ?? null);

  try {
    await adbClient.value.launchScrcpy(serial, args);
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
  if (!isTauriEnv || device.isMobile) {
    if (window?.history?.length > 1) router.back();
    else await navigateTo('/');
    return;
  }
  await checkEnv();
  if (adbReady.value) {
    await refreshDevices();
    if (!pollTimer.value) {
      pollTimer.value = setInterval(() => {
        refreshDevices(true);
      }, 4000);
    }
  }
  gsap.from(".side-panel", { x: -50, opacity: 0, duration: 0.8, ease: "expo.out" });
  gsap.from(".main-card", { scale: 0.95, opacity: 0, duration: 0.8, delay: 0.2, ease: "expo.out" });
});

onBeforeUnmount(() => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
});
</script>

<template>
  <div
    class="h-full bg-base-100 flex p-4 gap-4 overflow-hidden text-base-content selection:bg-primary selection:text-primary-content">

    <!-- 左侧：侧边导航与列表 -->
    <aside class="side-panel w-80 flex flex-col gap-4 z-10">
      <div
        class="bg-base-100 backdrop-blur-2xl rounded-[2.5rem] border border-base-content/5 flex flex-col overflow-hidden shadow-sm flex-1">
        <div class="p-6 pb-2 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-primary animate-pulse"></div>
            <h1 class="text-sm font-black uppercase tracking-widest opacity-70">设备终端</h1>
          </div>
          <div class="flex items-center gap-2">
            <button @click="disconnectAll" class="btn btn-ghost btn-xs rounded-full"
              :disabled="isLoading || devices.length === 0">
              <Icon name="tabler:link-off" />
              断开全部
            </button>
            <button @click="refreshDevices()" class="btn btn-circle btn-ghost btn-xs" :disabled="isLoading">
              <Icon name="heroicons:arrow-path" :class="{ 'animate-spin': isLoading }" />
            </button>
          </div>
        </div>

        <!-- 列表容器 -->
        <div class="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          <div v-if="devices.length === 0"
            class="h-full flex flex-col items-center justify-center text-center opacity-30 px-6">
            <Icon name="heroicons:bolt-slash" class="text-5xl mb-4" />
            <p class="text-xs font-bold leading-relaxed uppercase">无连接端点<br>请通过 USB 连接或手动输入 IP</p>
          </div>

          <button v-for="d in devices" :key="d.serial" @click="selectedSerial = d.serial" :class="['w-full p-4 rounded-3xl transition-all duration-500 border text-left relative group',
            selectedSerial === d.serial
              ? 'bg-primary text-primary-content border-primary shadow-2xl shadow-primary/20 scale-[1.02]'
              : 'bg-base-100 border-base-content/5 hover:border-primary/20'
          ]">
            <div class="flex justify-between items-center mb-3">
              <div :class="['p-2 rounded-xl', selectedSerial === d.serial ? 'bg-white/20' : 'bg-base-200']">
                <Icon :name="d.isTcp ? 'heroicons:rss-20-solid' : 'tabler:usb'" />
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[9px] font-black tracking-widest uppercase opacity-60">{{ d.status }}</span>
                <span class="badge badge-ghost text-[9px] uppercase opacity-60">
                  {{ d.isTcp ? '网络' : 'USB' }}
                </span>
              </div>
            </div>
            <div class="font-black text-sm truncate pr-4">{{ d.displayName }}</div>
            <div class="text-[10px] font-mono opacity-40 truncate mt-1 uppercase">{{ d.serial }}</div>
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
            ADB
          </div>
          <div class="flex items-center gap-2">
            <span :class="['w-1.5 h-1.5 rounded-full', scrcpyReady ? 'bg-success' : 'bg-error']"></span>
            Scrcpy
          </div>
        </div>
        <div class="flex items-center gap-4">
          <div class="join bg-base-100 rounded-full border border-base-content/10 px-4 py-1 flex items-center">
            <span class="text-[9px] font-bold opacity-40 uppercase mr-3">设备IP</span>
            <input v-model="manualIp" class="bg-transparent text-xs w-28 focus:outline-none" placeholder="192.168..." />
            <input v-model="wifiPort" class="bg-transparent text-xs w-16 focus:outline-none ml-2" placeholder="53301" />
            <button @click="connectManual" class="hover:text-primary transition-colors">
              <Icon name="heroicons:paper-airplane-20-solid" />
            </button>
          </div>
          <!-- <button class="btn btn-ghost btn-sm rounded-full" @click="connectSelectedWifi">
            一键无线连接
          </button> -->
        </div>
      </header>

      <!-- 设备详情卡片 -->
      <div
        class="main-card flex-1 bg-base-100 rounded-[3rem] border border-base-content/10 shadow-2xl overflow-y-auto overflow-x-hidden flex flex-col relative">
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
                  <span class="text-sm font-bold uppercase">{{ scrcpyConfig.video.maxFps }} FPS</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-end gap-3 relative z-10">
              <button class="btn btn-ghost btn-sm rounded-full border border-base-content/10 bg-base-100/60"
                @click="openSettings">
                进入详细设置
              </button>
              <button @click="startControl"
                class="btn btn-primary btn-lg rounded-[2rem] px-12 h-24 shadow-2xl shadow-primary/40 hover:scale-105 transition-all group">
                <Icon name="heroicons:play-20-solid" class="text-2xl group-hover:rotate-12 transition-transform" />
                <span class="text-lg font-black uppercase tracking-widest">启动远程镜像</span>
              </button>
            </div>
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
                交互控制
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
                    <select v-model="scrcpyConfig.video.maxSize"
                      class="select select-bordered rounded-xl bg-base-100 border-none shadow-sm text-xs">
                      <option value="1920">1080P Full HD</option>
                      <option value="1280">720P Standard</option>
                      <option value="720">480P Low End</option>
                    </select>
                  </div>
                  <label class="flex items-center justify-between px-1 cursor-pointer">
                    <span class="text-xs font-bold opacity-70">启用音频同步</span>
                    <input type="checkbox" v-model="scrcpyConfig.audio.enabled"
                      class="toggle toggle-primary toggle-sm" />
                  </label>
                </div>
                <div class="space-y-4">
                  <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black opacity-50 ml-1">最大渲染帧率</label>
                    <select v-model="scrcpyConfig.video.maxFps"
                      class="select select-bordered rounded-xl bg-base-100 border-none shadow-sm text-xs">
                      <option value="30">30 FPS (省电)</option>
                      <option value="60">60 FPS (流畅)</option>
                      <option value="120">120 FPS (极速)</option>
                    </select>
                  </div>
                  <label class="flex items-center justify-between px-1 cursor-pointer">
                    <span class="text-xs font-bold opacity-70">启动后熄灭屏幕</span>
                    <input type="checkbox" v-model="scrcpyConfig.control.turnScreenOff"
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
          <p class="text-sm mt-2 max-w-xs">请通过 USB 连接设备或在顶部手动输入 IP 进行连接。</p>
          <button class="btn btn-ghost btn-sm mt-6 rounded-full" @click="showHelpModal = true">
            查看 USB 调试指引
          </button>
        </div>
      </div>
    </main>

    <BaseModal v-model="showHelpModal" title="开启 USB 调试" box-class="max-w-lg w-full">
      <div class="space-y-4 text-sm leading-relaxed">
        <div class="p-4 rounded-2xl bg-base-200/60 border border-base-content/5">
          <p class="font-bold">步骤 1：打开开发者选项</p>
          <p class="text-base-content/70 mt-1">设置 → 关于手机 → 连续点击“版本号”7 次。</p>
        </div>
        <div class="p-4 rounded-2xl bg-base-200/60 border border-base-content/5">
          <p class="font-bold">步骤 2：开启 USB 调试</p>
          <p class="text-base-content/70 mt-1">设置 → 开发者选项 → 打开“USB 调试”。</p>
        </div>
        <div class="p-4 rounded-2xl bg-base-200/60 border border-base-content/5">
          <p class="font-bold">步骤 3：连接授权</p>
          <p class="text-base-content/70 mt-1">USB 连接后，手机弹窗请点“允许”。</p>
        </div>
        <div class="text-xs text-base-content/50">
          提示：部分机型需要额外开启“USB 调试（安全设置）”才能支持控制输入。
        </div>
      </div>
      <template #actions="{ close }">
        <button class="btn btn-ghost rounded-full" @click="close()">我知道了</button>
      </template>
    </BaseModal>
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
