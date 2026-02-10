
<script setup lang="ts">
import gsap from 'gsap';
import { isTauri } from '~/utils/check';

definePageMeta({ layout: 'main' });

const settings = useSettingsStore();
const device = useDevice();
const router = useRouter();
const route = useRoute();
const isTauriEnv = isTauri();
const scrcpyConfig = settings.scrcpyConfig;

const navItems = [
  { id: 'connection', label: 'Connection', desc: '连接与设备选择' },
  { id: 'video', label: 'Video', desc: '画面与编码' },
  { id: 'audio', label: 'Audio', desc: '音频与同步' },
  { id: 'control', label: 'Control', desc: '控制行为' },
  { id: 'keyboard', label: 'Keyboard', desc: '键盘映射' },
  { id: 'mouse', label: 'Mouse', desc: '鼠标行为' },
  { id: 'gamepad', label: 'Gamepad', desc: '手柄映射' },
  { id: 'device', label: 'Device', desc: '设备电源与应用' },
  { id: 'window', label: 'Window', desc: '窗口与显示' },
  { id: 'recording', label: 'Recording', desc: '录制与回放' },
  { id: 'virtual-display', label: 'Virtual Display', desc: '虚拟显示' },
  { id: 'tunnels', label: 'Tunnels', desc: '隧道与转发' },
  { id: 'otg', label: 'OTG', desc: '直连模式' },
  { id: 'camera', label: 'Camera', desc: '相机投屏' },
  { id: 'v4l2', label: 'Video4Linux', desc: 'V4L2 输出' },
  { id: 'shortcuts', label: 'Shortcuts', desc: '快捷键' },
  { id: 'extra', label: 'Extra', desc: '扩展参数' },
];

const scrollToSection = (id: string) => {
  const el = document.getElementById(`scrcpy-${id}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

onMounted(async () => {
  if (!isTauriEnv || device.isMobile) {
    if (window?.history?.length > 1) router.back();
    else await navigateTo('/');
    return;
  }
  await nextTick();
  const tab = typeof route.query.tab === 'string' ? route.query.tab : '';
  if (tab) scrollToSection(tab);
  gsap.from('.settings-hero', { y: 30, opacity: 0, duration: 0.8, ease: 'expo.out' });
  gsap.from('.settings-section', { y: 20, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'power2.out' });
});

watch(() => route.query.tab, async (tab) => {
  if (typeof tab === 'string') {
    await nextTick();
    scrollToSection(tab);
  }
});
</script>

<template>
  <div class="min-h-screen bg-base-100 text-base-content px-4 py-6 sm:px-6 lg:px-10">
    <div class="mx-auto max-w-6xl space-y-8">
      <header class="settings-hero relative overflow-hidden rounded-3xl border border-base-content/5 bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10 p-6 sm:p-10">
        <div class="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"></div>
        <div class="absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-secondary/10 blur-3xl"></div>
        <div class="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div class="space-y-2">
            <h1 class="text-2xl font-black tracking-tight sm:text-3xl">Scrcpy 详细配置</h1>
            <p class="text-sm text-base-content/60 sm:text-base">
              所有设置将持久化保存，并在下次连接时自动应用。
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-ghost btn-sm rounded-full" @click="navigateTo('/tools/scrcpy')">
              返回设备页
            </button>
          </div>
        </div>
      </header>

      <div class="flex flex-wrap gap-2">
        <button v-for="item in navItems" :key="item.id" class="btn btn-ghost btn-sm rounded-full"
          @click="scrollToSection(item.id)">
          {{ item.label }}
        </button>
      </div>

      <section id="scrcpy-connection" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-black">Connection</h2>
            <p class="text-sm text-base-content/60">连接与设备选择策略</p>
          </div>
        </div>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">序列号（可选）</span>
            <input v-model="scrcpyConfig.connection.serial" class="input input-bordered bg-base-100" placeholder="device serial" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">TCP/IP 地址（可选）</span>
            <input v-model="scrcpyConfig.connection.tcpipAddress" class="input input-bordered bg-base-100" placeholder="192.168.0.10:5555" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">弹出 USB 选择器</span>
            <input type="checkbox" v-model="scrcpyConfig.connection.selectUsb" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">弹出 TCP/IP 选择器</span>
            <input type="checkbox" v-model="scrcpyConfig.connection.selectTcpip" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">自动 TCP/IP（--tcpip）</span>
            <input type="checkbox" v-model="scrcpyConfig.connection.tcpipAuto" class="toggle toggle-primary toggle-sm" />
          </label>
        </div>
      </section>

      <section id="scrcpy-video" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Video</h2>
        <p class="text-sm text-base-content/60">画面与编码参数</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">启用视频</span>
            <input type="checkbox" v-model="scrcpyConfig.video.enabled" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">最大分辨率</span>
            <input v-model="scrcpyConfig.video.maxSize" class="input input-bordered bg-base-100" placeholder="1920" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">最大帧率</span>
            <input v-model="scrcpyConfig.video.maxFps" class="input input-bordered bg-base-100" placeholder="60" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">视频编码</span>
            <select v-model="scrcpyConfig.video.videoCodec" class="select select-bordered bg-base-100">
              <option value="h264">H.264</option>
              <option value="h265">H.265</option>
              <option value="av1">AV1</option>
            </select>
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">码率</span>
            <input v-model="scrcpyConfig.video.videoBitRate" class="input input-bordered bg-base-100" placeholder="8M" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">编码器</span>
            <input v-model="scrcpyConfig.video.videoEncoder" class="input input-bordered bg-base-100" placeholder="c2.android.avc.encoder" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">裁切</span>
            <input v-model="scrcpyConfig.video.crop" class="input input-bordered bg-base-100" placeholder="0:0:1080:1920" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">捕获方向</span>
            <input v-model="scrcpyConfig.video.captureOrientation" class="input input-bordered bg-base-100" placeholder="0|90|180|270" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">画面方向</span>
            <input v-model="scrcpyConfig.video.orientation" class="input input-bordered bg-base-100" placeholder="0|90|180|270" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">显示方向</span>
            <input v-model="scrcpyConfig.video.displayOrientation" class="input input-bordered bg-base-100" placeholder="0|90|180|270" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">录制方向</span>
            <input v-model="scrcpyConfig.video.recordOrientation" class="input input-bordered bg-base-100" placeholder="0|90|180|270" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">旋转角度</span>
            <input v-model="scrcpyConfig.video.angle" class="input input-bordered bg-base-100" placeholder="0|90|180|270" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">显示 ID</span>
            <input v-model="scrcpyConfig.video.displayId" class="input input-bordered bg-base-100" placeholder="0" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">视频缓冲</span>
            <input v-model="scrcpyConfig.video.videoBuffer" class="input input-bordered bg-base-100" placeholder="50" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">禁止降采样</span>
            <input type="checkbox" v-model="scrcpyConfig.video.noDownsizeOnError" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">不回放（音视频）</span>
            <input type="checkbox" v-model="scrcpyConfig.video.noPlayback" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">不回放视频</span>
            <input type="checkbox" v-model="scrcpyConfig.video.noVideoPlayback" class="toggle toggle-primary toggle-sm" />
          </label>
        </div>
      </section>

      <section id="scrcpy-audio" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Audio</h2>
        <p class="text-sm text-base-content/60">音频与同步</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">启用音频</span>
            <input type="checkbox" v-model="scrcpyConfig.audio.enabled" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">强制音频</span>
            <input type="checkbox" v-model="scrcpyConfig.audio.requireAudio" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">音频来源</span>
            <input v-model="scrcpyConfig.audio.audioSource" class="input input-bordered bg-base-100" placeholder="output|mic" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">音频编码</span>
            <input v-model="scrcpyConfig.audio.audioCodec" class="input input-bordered bg-base-100" placeholder="aac|opus" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">音频码率</span>
            <input v-model="scrcpyConfig.audio.audioBitRate" class="input input-bordered bg-base-100" placeholder="128K" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">音频缓冲</span>
            <input v-model="scrcpyConfig.audio.audioBuffer" class="input input-bordered bg-base-100" placeholder="100" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">不回放音频</span>
            <input type="checkbox" v-model="scrcpyConfig.audio.noAudioPlayback" class="toggle toggle-primary toggle-sm" />
          </label>
        </div>
      </section>

      <section id="scrcpy-control" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Control</h2>
        <p class="text-sm text-base-content/60">控制行为与剪贴板</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">启用控制</span>
            <input type="checkbox" v-model="scrcpyConfig.control.controlEnabled" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">显示触控点</span>
            <input type="checkbox" v-model="scrcpyConfig.control.showTouches" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">保持唤醒</span>
            <input type="checkbox" v-model="scrcpyConfig.control.stayAwake" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">启动后熄屏</span>
            <input type="checkbox" v-model="scrcpyConfig.control.turnScreenOff" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">关闭时关机</span>
            <input type="checkbox" v-model="scrcpyConfig.control.powerOffOnClose" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">关闭剪贴板同步</span>
            <input type="checkbox" v-model="scrcpyConfig.control.noClipboardAutosync" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">兼容粘贴模式</span>
            <input type="checkbox" v-model="scrcpyConfig.control.legacyPaste" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="form-control sm:col-span-2">
            <span class="label-text text-xs font-bold opacity-60">推送目标路径</span>
            <input v-model="scrcpyConfig.control.pushTarget" class="input input-bordered bg-base-100" placeholder="/sdcard/Download/" />
          </label>
        </div>
      </section>

      <section id="scrcpy-keyboard" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Keyboard</h2>
        <p class="text-sm text-base-content/60">键盘与输入方式</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">键盘模式</span>
            <select v-model="scrcpyConfig.keyboard.keyboardMode" class="select select-bordered bg-base-100">
              <option value="sdk">sdk</option>
              <option value="uhid">uhid</option>
              <option value="aoa">aoa</option>
              <option value="disabled">disabled</option>
              <option value="auto">auto</option>
            </select>
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">优先文本输入</span>
            <input type="checkbox" v-model="scrcpyConfig.keyboard.preferText" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">原始键值事件</span>
            <input type="checkbox" v-model="scrcpyConfig.keyboard.rawKeyEvents" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">禁用按键重复</span>
            <input type="checkbox" v-model="scrcpyConfig.keyboard.noKeyRepeat" class="toggle toggle-primary toggle-sm" />
          </label>
        </div>
      </section>

      <section id="scrcpy-mouse" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Mouse</h2>
        <p class="text-sm text-base-content/60">鼠标与指针</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">鼠标模式</span>
            <select v-model="scrcpyConfig.mouse.mouseMode" class="select select-bordered bg-base-100">
              <option value="sdk">sdk</option>
              <option value="uhid">uhid</option>
              <option value="aoa">aoa</option>
              <option value="disabled">disabled</option>
            </select>
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">鼠标映射</span>
            <input v-model="scrcpyConfig.mouse.mouseBind" class="input input-bordered bg-base-100" placeholder="right=back" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">禁用悬停</span>
            <input type="checkbox" v-model="scrcpyConfig.mouse.noMouseHover" class="toggle toggle-primary toggle-sm" />
          </label>
        </div>
      </section>

      <section id="scrcpy-gamepad" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Gamepad</h2>
        <p class="text-sm text-base-content/60">手柄映射</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">手柄模式</span>
            <select v-model="scrcpyConfig.gamepad.gamepadMode" class="select select-bordered bg-base-100">
              <option value="disabled">disabled</option>
              <option value="uhid">uhid</option>
              <option value="aoa">aoa</option>
            </select>
          </label>
        </div>
      </section>

      <section id="scrcpy-device" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Device</h2>
        <p class="text-sm text-base-content/60">设备电源与应用</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">熄屏超时</span>
            <input v-model="scrcpyConfig.device.screenOffTimeout" class="input input-bordered bg-base-100" placeholder="300" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">启动应用</span>
            <input v-model="scrcpyConfig.device.startApp" class="input input-bordered bg-base-100" placeholder="com.xxx.app/.Main" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">禁止唤醒</span>
            <input type="checkbox" v-model="scrcpyConfig.device.noPowerOn" class="toggle toggle-primary toggle-sm" />
          </label>
        </div>
      </section>

      <section id="scrcpy-window" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Window</h2>
        <p class="text-sm text-base-content/60">窗口与显示行为</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">无窗口模式</span>
            <input type="checkbox" v-model="scrcpyConfig.window.noWindow" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">窗口标题</span>
            <input v-model="scrcpyConfig.window.windowTitle" class="input input-bordered bg-base-100" placeholder="Scrcpy" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">窗口 X</span>
            <input v-model="scrcpyConfig.window.windowX" class="input input-bordered bg-base-100" placeholder="0" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">窗口 Y</span>
            <input v-model="scrcpyConfig.window.windowY" class="input input-bordered bg-base-100" placeholder="0" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">窗口宽度</span>
            <input v-model="scrcpyConfig.window.windowWidth" class="input input-bordered bg-base-100" placeholder="1280" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">窗口高度</span>
            <input v-model="scrcpyConfig.window.windowHeight" class="input input-bordered bg-base-100" placeholder="720" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">无边框</span>
            <input type="checkbox" v-model="scrcpyConfig.window.borderless" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">置顶</span>
            <input type="checkbox" v-model="scrcpyConfig.window.alwaysOnTop" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">全屏</span>
            <input type="checkbox" v-model="scrcpyConfig.window.fullscreen" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">禁用屏保</span>
            <input type="checkbox" v-model="scrcpyConfig.window.disableScreensaver" class="toggle toggle-primary toggle-sm" />
          </label>
        </div>
      </section>

      <section id="scrcpy-recording" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Recording</h2>
        <p class="text-sm text-base-content/60">录制与回放控制</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">录制文件</span>
            <input v-model="scrcpyConfig.recording.recordPath" class="input input-bordered bg-base-100" placeholder="file.mp4" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">录制格式</span>
            <input v-model="scrcpyConfig.recording.recordFormat" class="input input-bordered bg-base-100" placeholder="mp4|mkv" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">录制时长</span>
            <input v-model="scrcpyConfig.recording.timeLimit" class="input input-bordered bg-base-100" placeholder="300" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">不回放</span>
            <input type="checkbox" v-model="scrcpyConfig.recording.noPlayback" class="toggle toggle-primary toggle-sm" />
          </label>
        </div>
      </section>

      <section id="scrcpy-virtual-display" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Virtual Display</h2>
        <p class="text-sm text-base-content/60">虚拟显示与应用启动</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">启用虚拟显示</span>
            <input type="checkbox" v-model="scrcpyConfig.virtualDisplay.enabled" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">虚拟显示参数</span>
            <input v-model="scrcpyConfig.virtualDisplay.newDisplay" class="input input-bordered bg-base-100" placeholder="1920x1080" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">隐藏系统装饰</span>
            <input type="checkbox" v-model="scrcpyConfig.virtualDisplay.noSystemDecorations" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">不销毁内容</span>
            <input type="checkbox" v-model="scrcpyConfig.virtualDisplay.noDestroyContent" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="form-control sm:col-span-2">
            <span class="label-text text-xs font-bold opacity-60">输入法策略</span>
            <input v-model="scrcpyConfig.virtualDisplay.displayImePolicy" class="input input-bordered bg-base-100" placeholder="local|disabled" />
          </label>
        </div>
      </section>

      <section id="scrcpy-tunnels" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Tunnels</h2>
        <p class="text-sm text-base-content/60">隧道与端口映射</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">Tunnel Host</span>
            <input v-model="scrcpyConfig.tunnels.tunnelHost" class="input input-bordered bg-base-100" placeholder="localhost" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">Tunnel Port</span>
            <input v-model="scrcpyConfig.tunnels.tunnelPort" class="input input-bordered bg-base-100" placeholder="5555" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">Server Port</span>
            <input v-model="scrcpyConfig.tunnels.port" class="input input-bordered bg-base-100" placeholder="27183" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">强制 ADB 转发</span>
            <input type="checkbox" v-model="scrcpyConfig.tunnels.forceAdbForward" class="toggle toggle-primary toggle-sm" />
          </label>
        </div>
      </section>

      <section id="scrcpy-otg" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">OTG</h2>
        <p class="text-sm text-base-content/60">直连模式（无需 USB 调试）</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">启用 OTG</span>
            <input type="checkbox" v-model="scrcpyConfig.otg.enabled" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">禁用键盘</span>
            <input type="checkbox" v-model="scrcpyConfig.otg.keyboardDisabled" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">禁用鼠标</span>
            <input type="checkbox" v-model="scrcpyConfig.otg.mouseDisabled" class="toggle toggle-primary toggle-sm" />
          </label>
          <label class="flex items-center justify-between bg-base-200/40 rounded-2xl px-4 py-3">
            <span class="text-sm font-bold">启用手柄（AOA）</span>
            <input type="checkbox" v-model="scrcpyConfig.otg.gamepadEnabled" class="toggle toggle-primary toggle-sm" />
          </label>
        </div>
      </section>

      <section id="scrcpy-camera" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Camera</h2>
        <p class="text-sm text-base-content/60">相机投屏与取流</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">视频源</span>
            <select v-model="scrcpyConfig.camera.videoSource" class="select select-bordered bg-base-100">
              <option value="display">display</option>
              <option value="camera">camera</option>
            </select>
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">相机 ID</span>
            <input v-model="scrcpyConfig.camera.cameraId" class="input input-bordered bg-base-100" placeholder="0" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">相机朝向</span>
            <input v-model="scrcpyConfig.camera.cameraFacing" class="input input-bordered bg-base-100" placeholder="front|back|external" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">相机尺寸</span>
            <input v-model="scrcpyConfig.camera.cameraSize" class="input input-bordered bg-base-100" placeholder="1920x1080" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">画面比例</span>
            <input v-model="scrcpyConfig.camera.cameraAr" class="input input-bordered bg-base-100" placeholder="16:9" />
          </label>
        </div>
      </section>

      <section id="scrcpy-v4l2" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Video4Linux</h2>
        <p class="text-sm text-base-content/60">V4L2 输出（Linux）</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">V4L2 Sink</span>
            <input v-model="scrcpyConfig.v4l2.v4l2Sink" class="input input-bordered bg-base-100" placeholder="/dev/video2" />
          </label>
          <label class="form-control">
            <span class="label-text text-xs font-bold opacity-60">V4L2 Buffer</span>
            <input v-model="scrcpyConfig.v4l2.v4l2Buffer" class="input input-bordered bg-base-100" placeholder="4" />
          </label>
        </div>
      </section>

      <section id="scrcpy-shortcuts" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Shortcuts</h2>
        <p class="text-sm text-base-content/60">快捷键组合</p>
        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="form-control sm:col-span-2">
            <span class="label-text text-xs font-bold opacity-60">Shortcut Mod</span>
            <input v-model="scrcpyConfig.shortcuts.shortcutMod" class="input input-bordered bg-base-100" placeholder="lalt,lmeta" />
          </label>
        </div>
      </section>

      <section id="scrcpy-extra" class="settings-section rounded-3xl border border-base-content/5 bg-base-100/80 p-6 sm:p-8">
        <h2 class="text-lg font-black">Extra</h2>
        <p class="text-sm text-base-content/60">每行一个参数，直接追加到 scrcpy 命令</p>
        <textarea v-model="scrcpyConfig.extraArgs" class="textarea textarea-bordered bg-base-100 w-full min-h-[160px]" placeholder="--stay-awake\n--turn-screen-off"></textarea>
      </section>
    </div>
  </div>
</template>
