import { emit, listen } from '@tauri-apps/api/event'
import { Window } from '@tauri-apps/api/window'
import { createTimeline } from 'animejs'
import { type } from '@tauri-apps/plugin-os';

export class AppTheme {
    private static instance: AppTheme | null = null
    public isDark = ref<boolean>(true)
    public isBgTransparent = ref<boolean>(true);
    public isTransitioning = ref<boolean>(false)

    private theme = {
        dark: 'dark',
        light: 'light'
    }

    private constructor() { }

    public static getInstance() {
        if (!this.instance) this.instance = new AppTheme()
        return this.instance
    }

    public async init() {
        const saved = localStorage.getItem('theme')
        if (saved) {
            this.setTheme(saved === this.theme.dark, true)
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            this.setTheme(prefersDark, true)
        }
        const isBgTransparentSaved = localStorage.getItem('bg-transparent');
        if (isBgTransparentSaved) {
            this.setBgTransparent(isBgTransparentSaved === 'true');
        } else {
            this.setBgTransparent(true);
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            this.setTheme(e.matches)
        })
        if (isTauri())
            await listen('theme-changed', (event) => {
                const { dark } = event.payload as { dark: boolean }
                this.setTheme(dark, false)
            })
    }

    public async setTheme(dark: boolean, broadcast = true, clickPos?: { x: number; y: number }) {
        if (this.isDark.value === dark) return

        this.isTransitioning.value = true
        const html = document.documentElement
        html.classList.add('theme-transition')

        const current = dark ? this.theme.dark : this.theme.light
        this.isDark.value = dark
        html.setAttribute('data-theme', current)
        localStorage.setItem('theme', current)
        if (isTauri()) {
            if (broadcast) {
                emit('theme-changed', { dark })
                const windows = await Window.getAll();
                let theme: null | 'light' | 'dark' = null;
                if (dark === true) theme = 'dark';
                else if (dark === false) theme = 'light'
                windows.map(win => win.setTheme(theme))
            }
        }

        if (clickPos) this.playAdvancedRipple(clickPos, dark)

        setTimeout(() => {
            html.classList.remove('theme-transition')
            this.isTransitioning.value = false
        }, 1000)
    }

    public async toggleTheme(clickPos?: { x: number; y: number }) {
        await this.setTheme(!this.isDark.value, true, clickPos)
        return this.isDark.value;
    }

    public getIsDark() {
        return this.isDark
    }

    public setBgTransparent(trans: boolean) {
        const html = document.documentElement
        if (!(html && isTauri() && (type() === 'windows' || type() === 'macos'))) return;
        html.style.background = (trans ? 'transparent' : '');
        this.isBgTransparent.value = trans;
        localStorage.setItem('bg-transparent', trans + "");
    }

    public getIsBgTransparent() {
        return this.isBgTransparent;
    }

    private playAdvancedRipple(pos: { x: number; y: number }, dark: boolean) {
        const ripple = document.createElement('div')
        ripple.className = 'theme-ripple-anime'
        document.body.appendChild(ripple)

        const maxDim = Math.hypot(window.innerWidth, window.innerHeight)
        const size = maxDim * 2
        ripple.style.left = `${pos.x - size / 2}px`
        ripple.style.top = `${pos.y - size / 2}px`
        ripple.style.width = `${size}px`
        ripple.style.height = `${size}px`
        ripple.style.borderRadius = '50%'
        ripple.style.position = 'fixed'
        ripple.style.pointerEvents = 'none'
        ripple.style.zIndex = '9999'
        ripple.style.mixBlendMode = 'overlay'
        ripple.style.background = dark
            ? 'radial-gradient(circle at center, rgba(255,255,255,0.12) 0%, rgba(0,0,0,0.3) 80%)'
            : 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, rgba(0,0,0,0.05) 80%)'
        ripple.style.backdropFilter = dark
            ? 'blur(35px) saturate(160%) brightness(0.75)'
            : 'blur(40px) saturate(150%) brightness(1.25)'
        ripple.style.willChange = 'transform, opacity, backdrop-filter'
        ripple.style.opacity = '0.8'
        ripple.style.transform = 'scale(0)'

        const tl = createTimeline({ defaults: { duration: 1000 } })

        tl.add(ripple, {
            scale: [0, 1.05],
            opacity: [0.8, 0.5],
            filter: dark ? ['blur(10px)', 'blur(25px)'] : ['blur(12px)', 'blur(30px)']
        })

        tl.add(ripple, {
            scale: 1.4,
            opacity: 0,
            filter: dark ? 'blur(40px)' : 'blur(45px)',
            easing: 'easeInOutQuad'
        }, '-=200')

        tl.call(() => ripple.remove())
    }
}
