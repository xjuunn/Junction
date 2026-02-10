<script setup lang="ts">
import { isTauri } from '~/utils/check';

definePageMeta({ layout: 'main' });

// --- 基础工具 ---
const settings = useSettingsStore();
const device = useDevice();
const toast = useToast();
const isTauriEnv = isTauri();
const scrcpyConfig = settings.scrcpyConfig;

// --- 导航定义（增加图标与中文描述） ---
const navItems = [
  { id: 'connection', label: '连接', icon: 'heroicons:link-20-solid', desc: '设备与网络' },
  { id: 'video', label: '视频', icon: 'heroicons:video-camera-20-solid', desc: '编码与画面' },
  { id: 'audio', label: '音频', icon: 'heroicons:speaker-wave-20-solid', desc: '声音同步' },
  { id: 'control', label: '交互', icon: 'heroicons:cursor-arrow-rays-20-solid', desc: '控制行为' },
  { id: 'keyboard', label: '键盘', icon: 'heroicons:key-20-solid', desc: '按键映射' },
  { id: 'mouse', label: '鼠标', icon: 'heroicons:cursor-arrow-ripple-20-solid', desc: '指针行为' },
  { id: 'gamepad', label: '手柄', icon: 'heroicons:gamepad-20-solid', desc: '控制器' },
  { id: 'device', label: '设备', icon: 'heroicons:device-phone-mobile-20-solid', desc: '电源与应用' },
  { id: 'window', label: '窗口', icon: 'heroicons:window-20-solid', desc: '位置与样式' },
  { id: 'recording', label: '录制', icon: 'heroicons:film-20-solid', desc: '录屏与回放' },
  { id: 'virtual', label: '虚拟显示', icon: 'heroicons:squares-2x2-20-solid', desc: '虚拟屏幕' },
  { id: 'tunnels', label: '隧道', icon: 'heroicons:arrows-right-left-20-solid', desc: '转发与端口' },
  { id: 'otg', label: 'OTG', icon: 'tabler:usb', desc: '直连模式' },
  { id: 'camera', label: '相机', icon: 'heroicons:camera-20-solid', desc: '相机投屏' },
  { id: 'v4l2', label: 'Video4Linux', icon: 'heroicons:video-camera-20-solid', desc: 'Linux 输出' },
  { id: 'shortcuts', label: '快捷键', icon: 'heroicons:bolt-20-solid', desc: '快捷操作' },
  { id: 'extra', label: '扩展', icon: 'heroicons:code-bracket-20-solid', desc: '附加参数' },
];

type ConnectionKey = keyof typeof scrcpyConfig.connection;
const connectionOptions: { label: string; key: ConnectionKey }[] = [
  { label: 'USB 选择器', key: 'selectUsb' },
  { label: 'TCP/IP 选择器', key: 'selectTcpip' },
  { label: '自动 TCP/IP', key: 'tcpipAuto' },
];

type ControlKey = keyof typeof scrcpyConfig.control;
const controlOptions: { label: string; key: ControlKey }[] = [
  { label: '允许键鼠控制', key: 'controlEnabled' },
  { label: '显示触控点', key: 'showTouches' },
  { label: '保持常亮', key: 'stayAwake' },
  { label: '启动后熄屏', key: 'turnScreenOff' },
  { label: '关闭时关机', key: 'powerOffOnClose' },
  { label: '关闭剪贴板同步', key: 'noClipboardAutosync' },
  { label: '兼容粘贴模式', key: 'legacyPaste' },
];

const defaultConfig = {
  connection: {
    serial: '',
    selectUsb: false,
    selectTcpip: false,
    tcpipAuto: false,
    tcpipAddress: '',
  },
  video: {
    enabled: true,
    maxSize: '1920',
    maxFps: '60',
    printFps: false,
    videoCodec: 'h264',
    videoBitRate: '',
    videoEncoder: '',
    videoCodecOptions: '',
    crop: '',
    captureOrientation: '',
    orientation: '',
    displayOrientation: '',
    recordOrientation: '',
    angle: '',
    displayId: '',
    videoBuffer: '',
    noDownsizeOnError: false,
    noPlayback: false,
    noVideoPlayback: false,
  },
  audio: {
    enabled: true,
    requireAudio: false,
    audioDup: false,
    audioSource: '',
    audioCodec: '',
    audioEncoder: '',
    audioCodecOptions: '',
    audioBitRate: '',
    audioBuffer: '',
    audioOutputBuffer: '',
    noAudioPlayback: false,
  },
  control: {
    controlEnabled: true,
    showTouches: false,
    stayAwake: false,
    turnScreenOff: false,
    powerOffOnClose: false,
    noClipboardAutosync: false,
    legacyPaste: false,
    pushTarget: '',
  },
  keyboard: {
    keyboardMode: 'sdk',
    preferText: false,
    rawKeyEvents: false,
    noKeyRepeat: false,
  },
  mouse: {
    mouseMode: 'sdk',
    noMouseHover: false,
    mouseBind: '',
  },
  gamepad: {
    gamepadMode: 'disabled',
  },
  device: {
    screenOffTimeout: '',
    noPowerOn: false,
    startApp: '',
  },
  window: {
    noWindow: false,
    windowTitle: '',
    windowX: '',
    windowY: '',
    windowWidth: '',
    windowHeight: '',
    borderless: false,
    alwaysOnTop: false,
    fullscreen: false,
    disableScreensaver: false,
  },
  recording: {
    recordPath: '',
    recordFormat: '',
    timeLimit: '',
    noPlayback: false,
  },
  virtualDisplay: {
    enabled: false,
    newDisplay: '',
    noSystemDecorations: false,
    noDestroyContent: false,
    displayImePolicy: '',
  },
  tunnels: {
    tunnelHost: '',
    tunnelPort: '',
    port: '',
    forceAdbForward: false,
  },
  otg: {
    enabled: false,
    keyboardDisabled: false,
    mouseDisabled: false,
    gamepadEnabled: false,
  },
  camera: {
    videoSource: 'display',
    cameraId: '',
    cameraFacing: '',
    cameraSize: '',
    cameraAr: '',
  },
  v4l2: {
    v4l2Sink: '',
    v4l2Buffer: '',
  },
  shortcuts: {
    shortcutMod: '',
  },
  extraArgs: '',
};

/**
 * 锚点平滑滚动
 * @param id 目标区域 ID
 */
const scrollToSection = (id: string) => {
  const el = document.getElementById(`section-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

/**
 * 初始化配置
 */
const resetConfig = () => {
  Object.assign(scrcpyConfig, JSON.parse(JSON.stringify(defaultConfig)));
  toast.success('配置已恢复默认');
};

/**
 * 返回上一页 (手动处理避免路由 404)
 */
const goBack = () => {
  navigateTo('/tools/scrcpy');
};

onMounted(() => {
  if (!isTauriEnv || device.isMobile) return;
});
</script>

<template>
  <div class="min-h-screen bg-base-100 font-sans antialiased text-base-content selection:bg-primary/20">

    <!-- 顶部固定操作栏 (云母/模糊效果) -->
    <header class="sticky top-0 z-50 w-full border-b border-base-content/5 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="btn btn-ghost btn-sm">
            返回
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button @click="resetConfig" class="btn btn-ghost btn-sm text-xs opacity-50 hover:opacity-100">
            重置全部
          </button>
          <button @click="goBack" class="btn btn-primary btn-sm rounded-xl px-6 font-bold">
            保存并返回
          </button>
        </div>
      </div>
    </header>

    <div class="mx-auto flex max-w-7xl gap-10 px-6 py-10">

      <!-- 左侧：粘性侧边菜单 (高度适配，滚动跟随) -->
      <aside class="sticky top-24 hidden h-fit w-64 flex-none lg:block">
        <nav class="flex flex-col gap-1 rounded-2xl bg-base-200/50 p-2 ring-1 ring-base-content/5">
          <button v-for="item in navItems" :key="item.id" @click="scrollToSection(item.id)"
            class="group flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-all hover:bg-base-100 hover:shadow-sm">
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-base-300 transition-colors group-hover:bg-primary group-hover:text-primary-content">
              <Icon :name="item.icon" class="text-lg" />
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-black uppercase tracking-wide opacity-80 group-hover:opacity-100">{{ item.label
                }}</span>
              <span class="text-[9px] font-bold opacity-30">{{ item.desc }}</span>
            </div>
          </button>
        </nav>
      </aside>

      <!-- 右侧：配置主体 -->
      <main class="flex-1 space-y-12 pb-40">

        <!-- Connection: 连接管理 -->
        <section id="section-connection" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">连接</h2>
          </div>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div class="flex flex-col gap-2">
              <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">设备序列号</label>
              <input v-model="scrcpyConfig.connection.serial"
                class="input input-bordered w-full rounded-2xl border-none bg-base-200/50 focus:bg-base-200 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="填写设备序列号以锁定设备" />
            </div>
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-black uppercase tracking-widest opacity-40 ml-2">TCP/IP 地址</label>
              <input v-model="scrcpyConfig.connection.tcpipAddress"
                class="input input-bordered w-full rounded-2xl border-none bg-base-200/50 focus:bg-base-200 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="192.168.1.x:5555" />
            </div>

            <div class="col-span-full grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label v-for="opt in connectionOptions" :key="opt.key"
                class="flex items-center justify-between rounded-2xl bg-base-200/30 px-5 py-4 ring-1 ring-base-content/5 transition-hover hover:bg-base-200/50">
                <span class="text-[10px] font-black uppercase opacity-60">{{ opt.label }}</span>
                <input type="checkbox" v-model="scrcpyConfig.connection[opt.key]"
                  class="toggle toggle-primary toggle-sm" />
              </label>
            </div>
          </div>
        </section>

        <!-- Video: 画面引擎 -->
        <section id="section-video" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">视频引擎</h2>
          </div>

          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <label class="mb-8 flex items-center justify-between rounded-2xl bg-base-100 p-6 shadow-sm">
              <div class="flex flex-col">
                <span class="text-sm font-black uppercase tracking-widest">启用视频流</span>
                <span class="text-[10px] font-bold opacity-30 uppercase">是否传输设备画面</span>
              </div>
              <input type="checkbox" v-model="scrcpyConfig.video.enabled" class="toggle toggle-secondary toggle-lg" />
            </label>

            <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div
                v-for="field in [{ id: 'maxSize', label: '分辨率限制', p: '1920' }, { id: 'maxFps', label: '帧率上限', p: '60' }, { id: 'videoBitRate', label: '码率设置', p: '8M' }]"
                :key="field.id" class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">{{ field.label
                  }}</label>
                <input v-model="(scrcpyConfig.video as any)[field.id]"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20 transition-all"
                  :placeholder="field.p" />
              </div>
            </div>

            <div class="mt-8 flex flex-col gap-2">
              <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">视频编码器</label>
              <select v-model="scrcpyConfig.video.videoCodec"
                class="select select-bordered w-full rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20">
                <option value="h264">H.264 (标准兼容)</option>
                <option value="h265">H.265 (高效低码率)</option>
                <option value="av1">AV1 (极限压缩)</option>
              </select>
            </div>

            <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">编码器名称</label>
                <input v-model="scrcpyConfig.video.videoEncoder"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="c2.android.avc.encoder" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">编码器参数</label>
                <input v-model="scrcpyConfig.video.videoCodecOptions"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="profile=high,level=4.1" />
              </div>
            </div>

            <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">显示帧率日志</span>
                <input type="checkbox" v-model="scrcpyConfig.video.printFps"
                  class="toggle toggle-secondary toggle-sm" />
              </label>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">禁止降采样</span>
                <input type="checkbox" v-model="scrcpyConfig.video.noDownsizeOnError"
                  class="toggle toggle-secondary toggle-sm" />
              </label>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">不回放视频</span>
                <input type="checkbox" v-model="scrcpyConfig.video.noVideoPlayback"
                  class="toggle toggle-secondary toggle-sm" />
              </label>
            </div>

            <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">裁剪区域</label>
                <input v-model="scrcpyConfig.video.crop"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="0:0:1080:1920" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">显示 ID</label>
                <input v-model="scrcpyConfig.video.displayId"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="0" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">视频缓冲</label>
                <input v-model="scrcpyConfig.video.videoBuffer"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="50" />
              </div>
            </div>

            <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">捕获方向</label>
                <input v-model="scrcpyConfig.video.captureOrientation"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="0|90|180|270" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">画面方向</label>
                <input v-model="scrcpyConfig.video.orientation"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="0|90|180|270" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">旋转角度</label>
                <input v-model="scrcpyConfig.video.angle"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="0|90|180|270" />
              </div>
            </div>

            <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">显示方向</label>
                <input v-model="scrcpyConfig.video.displayOrientation"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="0|90|180|270" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">录制方向</label>
                <input v-model="scrcpyConfig.video.recordOrientation"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="0|90|180|270" />
              </div>
            </div>
          </div>
        </section>

        <!-- Audio: 音频设置 -->
        <section id="section-audio" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">音频</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <label class="mb-6 flex items-center justify-between rounded-2xl bg-base-100 p-6 shadow-sm">
              <div class="flex flex-col">
                <span class="text-sm font-black uppercase tracking-widest">启用音频流</span>
                <span class="text-[10px] font-bold opacity-30 uppercase">控制音频转发与同步</span>
              </div>
              <input type="checkbox" v-model="scrcpyConfig.audio.enabled" class="toggle toggle-primary toggle-lg" />
            </label>

            <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">音频来源</label>
                <select v-model="scrcpyConfig.audio.audioSource"
                  class="select select-bordered w-full rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20">
                  <option value="">默认</option>
                  <option value="output">output</option>
                  <option value="mic">mic</option>
                  <option value="playback">playback</option>
                </select>
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">音频编码</label>
                <input v-model="scrcpyConfig.audio.audioCodec"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="opus | aac" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">编码器名称</label>
                <input v-model="scrcpyConfig.audio.audioEncoder"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="c2.android.opus.encoder" />
              </div>
            </div>

            <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">音频码率</label>
                <input v-model="scrcpyConfig.audio.audioBitRate"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="128K" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">音频缓冲</label>
                <input v-model="scrcpyConfig.audio.audioBuffer"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="100" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">输出缓冲</label>
                <input v-model="scrcpyConfig.audio.audioOutputBuffer"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="100" />
              </div>
            </div>

            <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">强制音频</span>
                <input type="checkbox" v-model="scrcpyConfig.audio.requireAudio"
                  class="toggle toggle-primary toggle-sm" />
              </label>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">音频复制</span>
                <input type="checkbox" v-model="scrcpyConfig.audio.audioDup" class="toggle toggle-primary toggle-sm" />
              </label>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">禁用音频回放</span>
                <input type="checkbox" v-model="scrcpyConfig.audio.noAudioPlayback"
                  class="toggle toggle-primary toggle-sm" />
              </label>
            </div>

            <div class="mt-6 flex flex-col gap-2">
              <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">音频编码器参数</label>
              <input v-model="scrcpyConfig.audio.audioCodecOptions"
                class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="bitrate-mode=cbr,profile=aac-lc" />
            </div>
          </div>
        </section>

        <!-- Interaction: 交互行为 -->
        <section id="section-control" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">交互</h2>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            <label v-for="opt in controlOptions" :key="opt.key"
              class="flex items-center justify-between rounded-2xl border border-base-content/5 bg-base-100 px-5 py-4 shadow-sm transition-all hover:bg-base-200/50">
              <span class="text-[10px] font-black uppercase opacity-60">{{ opt.label }}</span>
              <input type="checkbox" v-model="scrcpyConfig.control[opt.key]" class="toggle toggle-accent toggle-sm" />
            </label>
          </div>
          <div class="mt-6 flex flex-col gap-2">
            <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">推送目标目录</label>
            <input v-model="scrcpyConfig.control.pushTarget"
              class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-accent/20 transition-all"
              placeholder="/sdcard/Download/" />
          </div>
        </section>

        <!-- Keyboard: 键盘 -->
        <section id="section-keyboard" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">键盘</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">键盘模式</label>
                <select v-model="scrcpyConfig.keyboard.keyboardMode"
                  class="select select-bordered w-full rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20">
                  <option value="sdk">sdk</option>
                  <option value="uhid">uhid</option>
                  <option value="aoa">aoa</option>
                  <option value="disabled">disabled</option>
                  <option value="auto">auto</option>
                </select>
              </div>
              <div class="grid grid-cols-1 gap-4">
                <label
                  class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                  <span class="text-[10px] font-black uppercase opacity-60">优先文本输入</span>
                  <input type="checkbox" v-model="scrcpyConfig.keyboard.preferText"
                    class="toggle toggle-primary toggle-sm" />
                </label>
                <label
                  class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                  <span class="text-[10px] font-black uppercase opacity-60">原始键值事件</span>
                  <input type="checkbox" v-model="scrcpyConfig.keyboard.rawKeyEvents"
                    class="toggle toggle-primary toggle-sm" />
                </label>
                <label
                  class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                  <span class="text-[10px] font-black uppercase opacity-60">禁用按键重复</span>
                  <input type="checkbox" v-model="scrcpyConfig.keyboard.noKeyRepeat"
                    class="toggle toggle-primary toggle-sm" />
                </label>
              </div>
            </div>
          </div>
        </section>

        <!-- Mouse: 鼠标 -->
        <section id="section-mouse" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">鼠标</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">鼠标模式</label>
                <select v-model="scrcpyConfig.mouse.mouseMode"
                  class="select select-bordered w-full rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20">
                  <option value="sdk">sdk</option>
                  <option value="uhid">uhid</option>
                  <option value="aoa">aoa</option>
                  <option value="disabled">disabled</option>
                </select>
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">鼠标映射</label>
                <input v-model="scrcpyConfig.mouse.mouseBind"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="right=back" />
              </div>
            </div>
            <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">禁用悬停</span>
                <input type="checkbox" v-model="scrcpyConfig.mouse.noMouseHover"
                  class="toggle toggle-primary toggle-sm" />
              </label>
            </div>
          </div>
        </section>

        <!-- Gamepad: 手柄 -->
        <section id="section-gamepad" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">手柄</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="flex flex-col gap-2">
              <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">手柄模式</label>
              <select v-model="scrcpyConfig.gamepad.gamepadMode"
                class="select select-bordered w-full rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20">
                <option value="disabled">disabled</option>
                <option value="uhid">uhid</option>
                <option value="aoa">aoa</option>
              </select>
            </div>
          </div>
        </section>

        <!-- Device: 设备 -->
        <section id="section-device" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">设备</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">熄屏超时</label>
                <input v-model="scrcpyConfig.device.screenOffTimeout"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="300" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">启动应用</label>
                <input v-model="scrcpyConfig.device.startApp"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="com.xxx.app/.Main" />
              </div>
            </div>
            <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">禁止唤醒</span>
                <input type="checkbox" v-model="scrcpyConfig.device.noPowerOn"
                  class="toggle toggle-primary toggle-sm" />
              </label>
            </div>
          </div>
        </section>

        <!-- Window: 窗口 -->
        <section id="section-window" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">窗口</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">窗口标题</label>
                <input v-model="scrcpyConfig.window.windowTitle"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Scrcpy" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">窗口 X</label>
                <input v-model="scrcpyConfig.window.windowX"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="0" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">窗口 Y</label>
                <input v-model="scrcpyConfig.window.windowY"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="0" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">窗口宽度</label>
                <input v-model="scrcpyConfig.window.windowWidth"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="1280" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">窗口高度</label>
                <input v-model="scrcpyConfig.window.windowHeight"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="720" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">无窗口模式</label>
                <label
                  class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                  <span class="text-[10px] font-black uppercase opacity-60">启用</span>
                  <input type="checkbox" v-model="scrcpyConfig.window.noWindow"
                    class="toggle toggle-primary toggle-sm" />
                </label>
              </div>
            </div>
            <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">无边框</span>
                <input type="checkbox" v-model="scrcpyConfig.window.borderless"
                  class="toggle toggle-primary toggle-sm" />
              </label>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">置顶</span>
                <input type="checkbox" v-model="scrcpyConfig.window.alwaysOnTop"
                  class="toggle toggle-primary toggle-sm" />
              </label>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">全屏</span>
                <input type="checkbox" v-model="scrcpyConfig.window.fullscreen"
                  class="toggle toggle-primary toggle-sm" />
              </label>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">禁用屏保</span>
                <input type="checkbox" v-model="scrcpyConfig.window.disableScreensaver"
                  class="toggle toggle-primary toggle-sm" />
              </label>
            </div>
          </div>
        </section>

        <!-- Recording: 录制 -->
        <section id="section-recording" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">录制</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">录制文件</label>
                <input v-model="scrcpyConfig.recording.recordPath"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="file.mp4" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">录制格式</label>
                <input v-model="scrcpyConfig.recording.recordFormat"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="mp4 | mkv" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">录制时长</label>
                <input v-model="scrcpyConfig.recording.timeLimit"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="300" />
              </div>
            </div>
            <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">不回放</span>
                <input type="checkbox" v-model="scrcpyConfig.recording.noPlayback"
                  class="toggle toggle-primary toggle-sm" />
              </label>
            </div>
          </div>
        </section>

        <!-- Virtual Display: 虚拟显示 -->
        <section id="section-virtual" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">虚拟显示</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">启用虚拟显示</span>
                <input type="checkbox" v-model="scrcpyConfig.virtualDisplay.enabled"
                  class="toggle toggle-primary toggle-sm" />
              </label>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">虚拟显示参数</label>
                <input v-model="scrcpyConfig.virtualDisplay.newDisplay"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="1920x1080" />
              </div>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">隐藏系统装饰</span>
                <input type="checkbox" v-model="scrcpyConfig.virtualDisplay.noSystemDecorations"
                  class="toggle toggle-primary toggle-sm" />
              </label>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">不销毁内容</span>
                <input type="checkbox" v-model="scrcpyConfig.virtualDisplay.noDestroyContent"
                  class="toggle toggle-primary toggle-sm" />
              </label>
              <div class="flex flex-col gap-2 sm:col-span-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">输入法策略</label>
                <input v-model="scrcpyConfig.virtualDisplay.displayImePolicy"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="local | disabled" />
              </div>
            </div>
          </div>
        </section>

        <!-- Tunnels: 隧道 -->
        <section id="section-tunnels" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">隧道</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">隧道主机</label>
                <input v-model="scrcpyConfig.tunnels.tunnelHost"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="localhost" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">隧道端口</label>
                <input v-model="scrcpyConfig.tunnels.tunnelPort"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="5555" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">服务端口</label>
                <input v-model="scrcpyConfig.tunnels.port"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="27183" />
              </div>
            </div>
            <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">强制 ADB 转发</span>
                <input type="checkbox" v-model="scrcpyConfig.tunnels.forceAdbForward"
                  class="toggle toggle-primary toggle-sm" />
              </label>
            </div>
          </div>
        </section>

        <!-- OTG: 直连模式 -->
        <section id="section-otg" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">OTG</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">启用 OTG</span>
                <input type="checkbox" v-model="scrcpyConfig.otg.enabled" class="toggle toggle-primary toggle-sm" />
              </label>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">禁用键盘</span>
                <input type="checkbox" v-model="scrcpyConfig.otg.keyboardDisabled"
                  class="toggle toggle-primary toggle-sm" />
              </label>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">禁用鼠标</span>
                <input type="checkbox" v-model="scrcpyConfig.otg.mouseDisabled"
                  class="toggle toggle-primary toggle-sm" />
              </label>
              <label
                class="flex items-center justify-between rounded-2xl bg-base-100/80 px-5 py-4 ring-1 ring-base-content/5">
                <span class="text-[10px] font-black uppercase opacity-60">启用手柄(AOA)</span>
                <input type="checkbox" v-model="scrcpyConfig.otg.gamepadEnabled"
                  class="toggle toggle-primary toggle-sm" />
              </label>
            </div>
          </div>
        </section>

        <!-- Camera: 相机 -->
        <section id="section-camera" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">相机</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">视频源</label>
                <select v-model="scrcpyConfig.camera.videoSource"
                  class="select select-bordered w-full rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20">
                  <option value="display">display</option>
                  <option value="camera">camera</option>
                </select>
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">相机 ID</label>
                <input v-model="scrcpyConfig.camera.cameraId"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="0" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">相机朝向</label>
                <input v-model="scrcpyConfig.camera.cameraFacing"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="front|back|external" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">相机尺寸</label>
                <input v-model="scrcpyConfig.camera.cameraSize"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="1920x1080" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">画面比例</label>
                <input v-model="scrcpyConfig.camera.cameraAr"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="16:9" />
              </div>
            </div>
          </div>
        </section>

        <!-- Video4Linux: 输出 -->
        <section id="section-v4l2" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">Video4Linux</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">V4L2 Sink</label>
                <input v-model="scrcpyConfig.v4l2.v4l2Sink"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="/dev/video2" />
              </div>
              <div class="flex flex-col gap-2">
                <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">V4L2 Buffer</label>
                <input v-model="scrcpyConfig.v4l2.v4l2Buffer"
                  class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="4" />
              </div>
            </div>
          </div>
        </section>

        <!-- Shortcuts: 快捷键 -->
        <section id="section-shortcuts" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">快捷键</h2>
          </div>
          <div class="rounded-[2.5rem] bg-base-200/30 p-8 ring-1 ring-base-content/5">
            <div class="flex flex-col gap-2">
              <label class="ml-2 text-[10px] font-black uppercase tracking-widest opacity-40">快捷键修饰键</label>
              <input v-model="scrcpyConfig.shortcuts.shortcutMod"
                class="input input-bordered rounded-xl border-none bg-base-100 focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="lalt,lmeta" />
            </div>
          </div>
        </section>

        <!-- Extra: 高级附加参数 -->
        <section id="section-extra" class="scroll-mt-24 space-y-6">
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-tighter">扩展参数</h2>
          </div>
          <div class="relative overflow-hidden rounded-[2rem] bg-neutral p-1 shadow-2xl">
            <div class="absolute right-4 top-4 flex gap-1.5 opacity-20">
              <div class="h-3 w-3 rounded-full bg-white"></div>
              <div class="h-3 w-3 rounded-full bg-white"></div>
              <div class="h-3 w-3 rounded-full bg-white"></div>
            </div>
            <textarea v-model="scrcpyConfig.extraArgs"
              class="textarea min-h-[200px] w-full border-none bg-neutral font-mono text-sm leading-relaxed text-neutral-content focus:outline-none p-8"
              placeholder="# 每行一个参数，例如：&#10;--stay-awake&#10;--no-audio"></textarea>
          </div>
        </section>

        <!-- 装饰底座 -->
        <footer class="flex flex-col items-center py-20 opacity-20">
          <div class="h-px w-32 bg-gradient-to-r from-transparent via-base-content to-transparent mb-8"></div>
          <span class="text-[10px] font-black uppercase tracking-[0.5em]">System Core Pipeline</span>
        </footer>
      </main>
    </div>

    <!-- 回到顶部浮动按钮 -->
    <button @click="scrollToSection('connection')"
      class="fixed bottom-10 right-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-base-content text-base-100 shadow-2xl transition-all hover:scale-110 active:scale-90 z-[60]">
      <Icon name="heroicons:chevron-up-20-solid" class="text-2xl" />
    </button>
  </div>
</template>
