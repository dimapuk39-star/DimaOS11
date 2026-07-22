import { useCallback, useEffect, useState } from 'react';

export type DiskInfo = {
  name: string;
  label: string;
  total: number;
  free: number;
  fileSystem?: string;
};

export type GpuInfo = {
  name: string;
  memory?: number;
  driver?: string;
  status?: string;
};

export type HardwareInfo = {
  source: 'system' | 'browser';
  computerName: string;
  processor: string;
  logicalProcessors: number;
  architecture: string;
  memoryTotal: number | null;
  memoryFree: number | null;
  operatingSystem: string;
  platform: string;
  uptime: number | null;
  gpu: GpuInfo[];
  disks: DiskInfo[];
  browser: string;
  screen: string;
  touchPoints: number;
  storageQuota: number | null;
  storageUsage: number | null;
  measuredAt: string;
};

type HardwareState = {
  data: HardwareInfo | null;
  loading: boolean;
  error: string;
};

type NavigatorWithMemory = Navigator & {
  deviceMemory?: number;
  userAgentData?: {
    platform?: string;
    mobile?: boolean;
  };
};

function getBrowserName(): string {
  const agent = navigator.userAgent;
  if (/Edg\//.test(agent)) return `Microsoft Edge ${agent.match(/Edg\/([\d.]+)/)?.[1] || ''}`;
  if (/OPR\//.test(agent)) return `Opera ${agent.match(/OPR\/([\d.]+)/)?.[1] || ''}`;
  if (/Chrome\//.test(agent)) return `Chromium ${agent.match(/Chrome\/([\d.]+)/)?.[1] || ''}`;
  if (/Firefox\//.test(agent)) return `Firefox ${agent.match(/Firefox\/([\d.]+)/)?.[1] || ''}`;
  if (/Safari\//.test(agent)) return 'Safari';
  return 'Современный браузер';
}

function getWebGlGpu(): GpuInfo[] {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!context) return [{ name: 'WebGL недоступен' }];
    const extension = context.getExtension('WEBGL_debug_renderer_info');
    if (extension) {
      const renderer = context.getParameter(extension.UNMASKED_RENDERER_WEBGL);
      const vendor = context.getParameter(extension.UNMASKED_VENDOR_WEBGL);
      return [{ name: String(renderer || vendor || 'GPU скрыта браузером') }];
    }
    return [{ name: String(context.getParameter(context.RENDERER) || 'GPU скрыта браузером') }];
  } catch {
    return [{ name: 'GPU скрыта браузером' }];
  }
}

async function getBrowserHardware(): Promise<HardwareInfo> {
  const extended = navigator as NavigatorWithMemory;
  let storageQuota: number | null = null;
  let storageUsage: number | null = null;

  try {
    const estimate = await navigator.storage?.estimate();
    storageQuota = estimate?.quota ?? null;
    storageUsage = estimate?.usage ?? null;
  } catch {
    // Storage estimation is optional and may be blocked by the browser.
  }

  const memory = extended.deviceMemory
    ? extended.deviceMemory * 1024 ** 3
    : null;

  return {
    source: 'browser',
    computerName: 'DIMA-PC',
    processor: 'Точная модель скрыта браузером',
    logicalProcessors: navigator.hardwareConcurrency || 0,
    architecture: /(?:Win64|x64|x86_64|amd64)/i.test(navigator.userAgent) ? 'x64' : 'Не определена',
    memoryTotal: memory,
    memoryFree: null,
    operatingSystem: extended.userAgentData?.platform || navigator.platform || 'Не определена',
    platform: extended.userAgentData?.mobile ? 'Мобильное устройство' : 'Настольное устройство',
    uptime: null,
    gpu: getWebGlGpu(),
    disks: [],
    browser: getBrowserName(),
    screen: `${screen.width} × ${screen.height} · ${window.devicePixelRatio.toFixed(2)}x · ${screen.colorDepth} бит`,
    touchPoints: navigator.maxTouchPoints || 0,
    storageQuota,
    storageUsage,
    measuredAt: new Date().toISOString(),
  };
}

async function requestHardware(): Promise<HardwareInfo> {
  if (import.meta.env.VITE_STATIC_HOST === 'true') {
    return getBrowserHardware();
  }
  try {
    const response = await fetch('/api/system', { cache: 'no-store' });
    if (!response.ok) throw new Error(`System API returned ${response.status}`);
    const system = await response.json() as HardwareInfo;
    const browser = await getBrowserHardware();
    return {
      ...browser,
      ...system,
      source: 'system',
      browser: browser.browser,
      screen: browser.screen,
      touchPoints: browser.touchPoints,
      storageQuota: browser.storageQuota,
      storageUsage: browser.storageUsage,
      measuredAt: new Date().toISOString(),
    };
  } catch {
    return getBrowserHardware();
  }
}

export function useHardwareInfo() {
  const [state, setState] = useState<HardwareState>({
    data: null,
    loading: true,
    error: '',
  });

  const refresh = useCallback(async () => {
    setState((value) => ({ ...value, loading: true, error: '' }));
    try {
      const data = await requestHardware();
      setState({ data, loading: false, error: '' });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Не удалось определить характеристики',
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}

export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Недоступно';
  if (value < 1024) return `${value} Б`;
  const units = ['КБ', 'МБ', 'ГБ', 'ТБ'];
  let amount = value;
  let unit = -1;
  do {
    amount /= 1024;
    unit += 1;
  } while (amount >= 1024 && unit < units.length - 1);
  return `${amount.toFixed(amount >= 100 ? 0 : amount >= 10 ? 1 : 2)} ${units[unit]}`;
}

export function formatUptime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return 'Недоступно';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days ? `${days} д. ` : ''}${hours} ч. ${minutes} мин.`;
}
