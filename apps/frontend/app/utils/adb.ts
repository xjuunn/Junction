import { isTauri } from '~/utils/check';

export interface ShellResult {
  code: number;
  stdout: string;
  stderr: string;
  ok: boolean;
}

export interface AdbDevice {
  serial: string;
  status: string;
  product?: string;
  model?: string;
  device?: string;
  transportId?: string;
  isTcp?: boolean;
  displayName: string;
}

export interface AdbConnectResult {
  ip: string;
  port: number;
  message: string;
}

const ensureTauri = () => {
  if (!isTauri()) {
    throw new Error('当前环境不支持本地命令调用');
  }
};

type ShellTarget = { name: string; args: string[]; platform: 'windows' | 'macos' | 'linux' | 'unknown' };

let shellTargetPromise: Promise<ShellTarget> | null = null;

const getShellTarget = async (): Promise<ShellTarget> => {
  if (shellTargetPromise) return shellTargetPromise;
  shellTargetPromise = (async () => {
    const mod = await import('@tauri-apps/plugin-os');
    const platform = await mod.type();
    if (platform === 'windows') {
      return { name: 'run-powershell', args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command'], platform };
    }
    if (platform === 'macos' || platform === 'linux') {
      return { name: 'run-sh', args: ['-lc'], platform };
    }
    return { name: 'run-sh', args: ['-lc'], platform: 'unknown' };
  })();
  return shellTargetPromise;
};

const escapeForPowerShell = (value: string) => value.replace(/"/g, '`"');
const escapeForBash = (value: string) => value.replace(/"/g, '\\"');

const buildShellScript = (program: string, args: string[], platform: ShellTarget['platform']) => {
  if (platform === 'windows') {
    const safeProgram = `"${escapeForPowerShell(program)}"`;
    const safeArgs = args.map(arg => `"${escapeForPowerShell(arg)}"`).join(' ');
    return `& ${safeProgram} ${safeArgs}`.trim();
  }
  const safeProgram = `"${escapeForBash(program)}"`;
  const safeArgs = args.map(arg => `"${escapeForBash(arg)}"`).join(' ');
  return `${safeProgram} ${safeArgs}`.trim();
};

const safeDecode = (input: Uint8Array | string | null | undefined): string => {
  if (input == null) return '';
  if (typeof input === 'string') return input.trim();
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(input).trim();
  } catch {
    return '';
  }
};

const runCommand = async (program: string, args: string[] = []): Promise<ShellResult> => {
  ensureTauri();
  const shellTarget = await getShellTarget();
  const script = buildShellScript(program, args, shellTarget.platform);
  const mod = await import('@tauri-apps/plugin-shell');
  const Command = mod.Command as unknown as {
    create?: (program: string, args?: string[]) => { execute: () => Promise<any>; spawn?: () => Promise<any> };
    new(program: string, args?: string[]): { execute: () => Promise<any>; spawn?: () => Promise<any> };
  };
  const command = Command.create
    ? Command.create(shellTarget.name, [...shellTarget.args, script])
    : new Command(shellTarget.name, [...shellTarget.args, script]);
  const output = await command.execute();
  const stdout = safeDecode(output?.stdout);
  const stderr = safeDecode(output?.stderr);
  return {
    code: output?.code ?? 0,
    stdout,
    stderr,
    ok: (output?.code ?? 0) === 0,
  };
};

const spawnCommand = async (program: string, args: string[] = []): Promise<ShellResult> => {
  ensureTauri();
  const shellTarget = await getShellTarget();
  const script = buildShellScript(program, args, shellTarget.platform);
  const mod = await import('@tauri-apps/plugin-shell');
  const Command = mod.Command as unknown as {
    create?: (program: string, args?: string[]) => { spawn: () => Promise<any> };
    new(program: string, args?: string[]): { spawn: () => Promise<any> };
  };
  const command = Command.create
    ? Command.create(shellTarget.name, [...shellTarget.args, script])
    : new Command(shellTarget.name, [...shellTarget.args, script]);
  if (typeof command.spawn === 'function') {
    await command.spawn();
    return { code: 0, stdout: '', stderr: '', ok: true };
  }
  return runCommand(program, args);
};

const parseDeviceLine = (line: string): AdbDevice | null => {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 2) return null;
  const [serial, status] = tokens;
  const rest = tokens.slice(2).join(' ');
  const meta: Record<string, string> = {};
  const metaMatches = Array.from(rest.matchAll(/(\w+):([^\s]+)/g));
  for (const match of metaMatches) {
    if (match[1]) {
      meta[match[1]] = match[2] ?? '';
    }
  }
  const model = meta.model?.replace(/_/g, ' ') ?? '';
  const displayName = model || meta.device || serial || 'Unknown Device';
  return {
    serial: serial ?? '',
    status: status ?? '',
    product: meta.product,
    model,
    device: meta.device,
    transportId: meta.transport_id,
    isTcp: (serial ?? '').includes(':'),
    displayName,
  };
};

const parseIpFromText = (text: string): string | null => {
  const candidates = Array.from(text.matchAll(/inet\s+(\d+\.\d+\.\d+\.\d+)/g)).map(m => m[1] ?? '');
  const srcMatch = text.match(/src\s+(\d+\.\d+\.\d+\.\d+)/);
  if (srcMatch?.[1]) return srcMatch[1];
  const preferred = candidates.find(ip => ip.startsWith('192.') || ip.startsWith('10.') || ip.startsWith('172.'));
  return preferred || candidates[0] || null;
};

const normalizeTextInput = (text: string): string => {
  return text.replace(/ /g, '%s').replace(/"/g, '\\"');
};

export const createAdbClient = (options?: { adbPath?: string; scrcpyPath?: string }) => {
  const adbPath = options?.adbPath || 'adb';
  const scrcpyPath = options?.scrcpyPath || 'scrcpy';
  return {
    runCommand,
    async checkBinary(program: 'adb' | 'scrcpy'): Promise<ShellResult> {
      const args = program === 'adb' ? ['version'] : ['--version'];
      const bin = program === 'adb' ? adbPath : scrcpyPath;
      return runCommand(bin, args);
    },
    async listDevices(): Promise<AdbDevice[]> {
      const result = await runCommand(adbPath, ['devices', '-l']);
      if (!result.ok) return [];
      const lines = result.stdout.split(/\r?\n/).filter(line => line.trim());
      const listStart = lines.findIndex(line => line.startsWith('List of devices'));
      const deviceLines = listStart >= 0 ? lines.slice(listStart + 1) : lines;
      return deviceLines
        .map(parseDeviceLine)
        .filter((item): item is AdbDevice => !!item);
    },
    async getDeviceIp(serial: string): Promise<string | null> {
      const route = await runCommand(adbPath, ['-s', serial, 'shell', 'ip', 'route']);
      const ipFromRoute = parseIpFromText(route.stdout);
      if (ipFromRoute) return ipFromRoute;
      const addr = await runCommand(adbPath, ['-s', serial, 'shell', 'ip', '-f', 'inet', 'addr', 'show']);
      return parseIpFromText(addr.stdout);
    },
    async enableTcpip(serial: string, port: number): Promise<ShellResult> {
      return runCommand(adbPath, ['-s', serial, 'tcpip', String(port)]);
    },
    async connect(ip: string, port: number): Promise<AdbConnectResult> {
      const result = await runCommand(adbPath, ['connect', `${ip}:${port}`]);
      return {
        ip,
        port,
        message: result.stdout || result.stderr || '连接完成',
      };
    },
    async disconnect(target?: string): Promise<ShellResult> {
      const args = target ? ['disconnect', target] : ['disconnect'];
      return runCommand(adbPath, args);
    },
    async listArpIps(): Promise<string[]> {
      const parseIps = (text: string): string[] => {
        if (!text) return [];
        const matches = Array.from(text.matchAll(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/g)).map(m => m[1] ?? '');
        const filtered = matches.filter((ip): ip is string => {
          if (ip.startsWith('0.') || ip.startsWith('127.') || ip.startsWith('169.254.')) return false;
          return true;
        });
        return Array.from(new Set(filtered));
      };
      try {
        const shellTarget = await getShellTarget();
        const results: ShellResult[] = [];
        if (shellTarget.platform === 'windows') {
          results.push(await runCommand('$env:SystemRoot\System32\arp.exe', ['-a']));
          results.push(await runCommand('arp', ['-a']));
          results.push(
            await runCommand('powershell', [
              '-NoProfile',
              '-Command',
              'Get-NetNeighbor -AddressFamily IPv4 | Select-Object -ExpandProperty IPAddress',
            ]),
          );
        } else if (shellTarget.platform === 'linux') {
          results.push(await runCommand('arp', ['-a']));
          results.push(await runCommand('ip', ['neigh']));
        } else if (shellTarget.platform === 'macos') {
          results.push(await runCommand('arp', ['-a']));
        } else {
          results.push(await runCommand('arp', ['-a']));
        }
        for (const result of results) {
          const ips = parseIps(result.stdout || result.stderr);
          if (ips.length) return ips;
        }
        return [];
      } catch {
        return [];
      }
    },
    async keyEvent(serial: string, keyCode: string): Promise<ShellResult> {
      return runCommand(adbPath, ['-s', serial, 'shell', 'input', 'keyevent', keyCode]);
    },
    async inputText(serial: string, text: string): Promise<ShellResult> {
      const safeText = normalizeTextInput(text);
      return runCommand(adbPath, ['-s', serial, 'shell', 'input', 'text', safeText]);
    },
    async launchScrcpy(serial: string, extraArgs: string[] = []): Promise<ShellResult> {
      return spawnCommand(scrcpyPath, ['-s', serial, ...extraArgs]);
    },
  };
};
