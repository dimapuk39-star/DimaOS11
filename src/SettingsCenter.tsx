import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { formatBytes, formatUptime, useHardwareInfo } from './hardware';
import { usePersistentState } from './storage';

type Section = 'system' | 'bluetooth' | 'network' | 'personal' | 'apps' | 'accounts' | 'time' | 'privacy' | 'update';
type PreferenceValue = boolean | string | number;

type SettingsCenterProps = {
  wallpaper: number;
  onWallpaper: (wallpaper: number) => void;
  onCustomWallpaper: (file: File) => void;
};

const navigation: Array<{ id: Section; icon: string; title: string; hint: string }> = [
  { id: 'system', icon: '▣', title: 'Система', hint: 'Экран, звук, уведомления, питание' },
  { id: 'bluetooth', icon: '⌁', title: 'Bluetooth и устройства', hint: 'Устройства, мышь, принтеры' },
  { id: 'network', icon: '◉', title: 'Сеть и Интернет', hint: 'Wi‑Fi, VPN, режим полёта' },
  { id: 'personal', icon: '✦', title: 'Персонализация', hint: 'Фон, цвета, темы' },
  { id: 'apps', icon: '▦', title: 'Приложения', hint: 'Установленные приложения, запуск' },
  { id: 'accounts', icon: '●', title: 'Учётные записи', hint: 'Профиль, вход, синхронизация' },
  { id: 'time', icon: '◷', title: 'Время и язык', hint: 'Дата, регион, ввод' },
  { id: 'privacy', icon: '◇', title: 'Конфиденциальность', hint: 'Разрешения и диагностика' },
  { id: 'update', icon: '↻', title: 'Центр обновления', hint: 'Обновления DimaOS' },
];

const defaultPreferences: Record<string, PreferenceValue> = {
  darkMode: false,
  transparency: true,
  animations: true,
  compactTaskbar: false,
  nightLight: false,
  nightStrength: 32,
  scale: '100',
  resolution: 'Автоматически',
  volume: 72,
  spatialSound: true,
  notifications: true,
  doNotDisturb: false,
  batterySaver: false,
  sleep: 'Никогда',
  bluetooth: true,
  nearbyShare: true,
  swiftPair: true,
  wifi: true,
  airplane: false,
  metered: false,
  vpn: false,
  accent: '#1676d2',
  theme: 'light',
  lockTips: true,
  startupApps: true,
  appUpdates: true,
  archiveApps: false,
  sync: true,
  rememberApps: true,
  autoTime: true,
  autoZone: true,
  hour24: true,
  language: 'Русский',
  region: 'Россия',
  location: true,
  camera: true,
  microphone: true,
  diagnostics: false,
  activityHistory: true,
  clipboardSync: false,
  updateEarly: true,
};

function Toggle({ value, onChange, disabled = false }: { value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label className={`sc-toggle ${disabled ? 'disabled' : ''}`}>
<input type="checkbox" checked={value} disabled={disabled} onChange={(event) => onChange(event.target.checked)}/>
<i/>
</label>;
}

function SettingRow({ icon, title, description, children, onClick }: { icon?: string; title: string; description?: string; children?: ReactNode; onClick?: () => void }) {
  return <div className={`sc-row ${onClick ? 'clickable' : ''}`} onClick={onClick}>
    {icon && <span className="sc-row-icon">{icon}</span>}
    <div className="sc-row-copy">
<b>{title}</b>{description && <small>{description}</small>}</div>
<div className="sc-row-action">{children ?? (onClick ? '›' : null)}</div>
</div>;
}

function SettingsCard({ title, description, children }: { title?: string; description?: string; children: ReactNode }) {
  return <section className="sc-card">
    {(title || description) && <header>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</header>}
    <div>{children}</div>
</section>;
}

function PageHeader({ icon, title, description }: { icon: string; title: string; description: string }) {
  return <header className="sc-page-header">
<span>{icon}</span>
<div>
<h1>{title}</h1>
<p>{description}</p>
</div>
</header>;
}

export default function SettingsCenter({ wallpaper, onWallpaper, onCustomWallpaper }: SettingsCenterProps) {
  const [section, setSection] = usePersistentState<Section>('settings.section', 'system');
  const [preferences, setPreferences] = usePersistentState<Record<string, PreferenceValue>>('settings.preferences', defaultPreferences);
  const [query, setQuery] = useState('');
  const [deviceName, setDeviceName] = usePersistentState('settings.deviceName', 'DIMA-PC');
  const [profileName, setProfileName] = usePersistentState('settings.profileName', 'Дмитрий');
  const [toast, setToast] = useState('');

  const pref = <T extends PreferenceValue>(key: string) => (preferences[key] ?? defaultPreferences[key]) as T;
  const update = (key: string, value: PreferenceValue) => setPreferences((current) => ({ ...current, [key]: value }));
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', String(pref('accent')));
    root.dataset.dimaTheme = String(pref('theme'));
    document.body.classList.toggle('dima-dark', pref('darkMode'));
    document.body.classList.toggle('dima-no-transparency', !pref('transparency'));
    document.body.classList.toggle('dima-no-motion', !pref('animations'));
    document.body.classList.toggle('dima-compact-taskbar', pref('compactTaskbar'));
    document.body.classList.toggle('dima-night-light', pref('nightLight'));
    root.style.setProperty('--night-strength', `${Number(pref('nightStrength')) / 100}`);
  }, [preferences]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return navigation.filter((item) => `${item.title} ${item.hint}`.toLowerCase().includes(normalized));
  }, [query]);

  const openSection = (id: Section) => {
    setSection(id);
    setQuery('');
  };

  return <div className="settings-center">
<aside className="sc-sidebar">
<div className="sc-search">
<span>⌕</span>
<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти параметр"/>
        {query && <button onClick={() => setQuery('')}>×</button>}
      </div>
      {query && <div className="sc-search-results">
        {results.length ? results.map((result) =>
<button key={result.id} onClick={() => openSection(result.id)}>
<i>{result.icon}</i>
<span>
<b>{result.title}</b>
<small>{result.hint}</small>
</span>
<em>›</em>
</button>) : <p>Параметры не найдены</p>}
      </div>}
      <button className="sc-profile" onClick={() => openSection('accounts')}>
<span>{profileName.slice(0, 2).toUpperCase()}</span>
<div>
<b>{profileName}</b>
<small>Локальная учётная запись</small>
</div>
</button>
<nav>{navigation.map((item) =>
<button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => openSection(item.id)}>
<i>{item.icon}</i>
<span>{item.title}</span>
</button>)}</nav>
<footer>
<span>⚙</span>
<div>
<b>DimaOS 11 Pro</b>
<small>Версия 26H2</small>
</div>
</footer>
</aside>
<main className="sc-main">
      {section === 'system' && <SystemPage preferences={preferences} pref={pref} update={update} deviceName={deviceName} setDeviceName={setDeviceName} notify={notify}/>} 
      {section === 'bluetooth' && <BluetoothPage pref={pref} update={update} notify={notify}/>} 
      {section === 'network' && <NetworkPage pref={pref} update={update} notify={notify}/>} 
      {section === 'personal' && <PersonalPage wallpaper={wallpaper} onWallpaper={onWallpaper} onCustomWallpaper={onCustomWallpaper} pref={pref} update={update}/>} 
      {section === 'apps' && <AppsPage pref={pref} update={update} notify={notify}/>} 
      {section === 'accounts' && <AccountsPage profileName={profileName} setProfileName={setProfileName} pref={pref} update={update} notify={notify}/>} 
      {section === 'time' && <TimePage pref={pref} update={update}/>} 
      {section === 'privacy' && <PrivacyPage pref={pref} update={update}/>} 
      {section === 'update' && <UpdatePage pref={pref} update={update} notify={notify}/>} 
    </main>
    {toast && <div className="sc-toast">
<span>✓</span>{toast}</div>}
  </div>;
}

type PageProps = {
  preferences?: Record<string, PreferenceValue>;
  pref: <T extends PreferenceValue>(key: string) => T;
  update: (key: string, value: PreferenceValue) => void;
  notify?: (message: string) => void;
};

function SystemPage({ pref, update, deviceName, setDeviceName, notify }: PageProps & { deviceName: string; setDeviceName: (value: string) => void }) {
  const { data, loading, refresh } = useHardwareInfo();
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(deviceName);
  const saveName = () => {
    const next = draftName.trim().slice(0, 24);
    if (!next) return;
    setDeviceName(next);
    setEditingName(false);
    notify?.('Имя устройства сохранено');
  };
  return <div className="sc-page system-page">
<PageHeader icon="▣" title="Система" description="Экран, звук, уведомления, питание и сведения об устройстве"/>
<section className="sc-device-hero">
<div className="sc-device-visual">
<div>
<i/>
<i/>
<i/>
<i/>
</div>
<span/>
</div>
<div className="sc-device-copy">
        {editingName ? <div className="sc-name-editor">
<input value={draftName} onChange={(event) => setDraftName(event.target.value)} autoFocus/>
<button onClick={saveName}>Сохранить</button>
<button onClick={() => setEditingName(false)}>Отмена</button>
</div> : <>
<h2>{deviceName}</h2>
<p>DimaOS 11 Pro · {data?.operatingSystem || 'определение системы'}</p>
<button onClick={() => { setDraftName(deviceName); setEditingName(true) }}>Переименовать</button>
</>}
      </div>
<div className="sc-device-spec">
<b>{data?.processor || 'Процессор определяется…'}</b>
<span>{data?.memoryTotal ? formatBytes(data.memoryTotal) : 'Память скрыта браузером'}</span>
<span>{data?.architecture || 'Архитектура определяется'}</span>
</div>
</section>
<div className="sc-two-column">
<SettingsCard title="Дисплей" description="Яркость, цвет и масштаб">
<SettingRow icon="☀" title="Ночной свет" description="Тёплые цвета для комфорта глаз">
<Toggle value={pref('nightLight')} onChange={(value) => update('nightLight', value)}/>
</SettingRow>
<SettingRow title="Интенсивность">
<input className="sc-range" type="range" min="0" max="100" value={Number(pref('nightStrength'))} onChange={(event) => update('nightStrength', Number(event.target.value))}/>
<em>{String(pref('nightStrength'))}%</em>
</SettingRow>
<SettingRow icon="▤" title="Масштаб">
<select value={String(pref('scale'))} onChange={(event) => update('scale', event.target.value)}>
<option>100</option>
<option>125</option>
<option>150</option>
<option>175</option>
</select>
</SettingRow>
<SettingRow icon="▱" title="Разрешение экрана">
<select value={String(pref('resolution'))} onChange={(event) => update('resolution', event.target.value)}>
<option>Автоматически</option>
<option>1920 × 1080</option>
<option>2560 × 1440</option>
<option>3840 × 2160</option>
</select>
</SettingRow>
</SettingsCard>
<SettingsCard title="Звук" description="Громкость и пространственный звук">
<SettingRow icon="◖" title="Общая громкость">
<input className="sc-range" type="range" min="0" max="100" value={Number(pref('volume'))} onChange={(event) => update('volume', Number(event.target.value))}/>
<em>{String(pref('volume'))}%</em>
</SettingRow>
<SettingRow icon="◉" title="Пространственный звук" description="Объёмная сцена Dima Spatial">
<Toggle value={pref('spatialSound')} onChange={(value) => update('spatialSound', value)}/>
</SettingRow>
<SettingRow icon="⌁" title="Устройство вывода" description="Динамики · Realtek Audio">
<span className="sc-status online">Используется</span>
</SettingRow>
</SettingsCard>
</div>
<SettingsCard title="Уведомления и питание">
<SettingRow icon="♢" title="Уведомления" description="Получать уведомления приложений">
<Toggle value={pref('notifications')} onChange={(value) => update('notifications', value)}/>
</SettingRow>
<SettingRow icon="☾" title="Не беспокоить" description="Скрывать баннеры и звуки">
<Toggle value={pref('doNotDisturb')} onChange={(value) => update('doNotDisturb', value)}/>
</SettingRow>
<SettingRow icon="♧" title="Экономия энергии" description="Уменьшить фоновую активность">
<Toggle value={pref('batterySaver')} onChange={(value) => update('batterySaver', value)}/>
</SettingRow>
<SettingRow icon="◷" title="Переход в спящий режим">
<select value={String(pref('sleep'))} onChange={(event) => update('sleep', event.target.value)}>
<option>Никогда</option>
<option>Через 5 минут</option>
<option>Через 15 минут</option>
<option>Через 30 минут</option>
</select>
</SettingRow>
</SettingsCard>
<SettingsCard title="О системе" description={data?.source === 'system' ? 'Точные данные локальной системы' : 'Данные, разрешённые браузером'}>
<SettingRow title="Процессор" description={data?.processor || 'Определение…'}/>
<SettingRow title="Оперативная память" description={data?.memoryTotal ? `${formatBytes(data.memoryTotal)} установлено` : 'Недоступно'}/>
<SettingRow title="Видеокарта" description={data?.gpu?.map((gpu) => gpu.name).join(', ') || 'Определение…'}/>
<SettingRow title="Время работы" description={data ? formatUptime(data.uptime) : 'Определение…'}/>
<SettingRow title="Экран" description={data?.screen || 'Определение…'}>
<button onClick={refresh} disabled={loading}>{loading ? 'Обновление…' : 'Обновить'}</button>
</SettingRow>
</SettingsCard>
</div>;
}

function BluetoothPage({ pref, update, notify }: PageProps) {
  const [devices, setDevices] = usePersistentState('settings.bluetoothDevices', [
    { id: 1, name: 'Dima Buds Pro', type: 'Аудио', battery: 86, connected: true },
    { id: 2, name: 'Dima Mouse S', type: 'Мышь', battery: 64, connected: false },
    { id: 3, name: 'Wireless Controller', type: 'Геймпад', battery: 91, connected: false },
  ]);
  const toggleDevice = (id: number) => setDevices((current) => current.map((device) => device.id === id ? { ...device, connected: !device.connected } : device));
  const addDevice = () => {
    const id = Date.now();
    setDevices((current) => [...current, { id, name: `Новое устройство ${current.length + 1}`, type: 'Bluetooth', battery: 100, connected: true }]);
    notify?.('Новое устройство подключено');
  };
  return <div className="sc-page">
<PageHeader icon="⌁" title="Bluetooth и устройства" description="Подключение устройств, мыши, клавиатуры и принтеров"/>
<section className={`sc-radio-hero ${pref('bluetooth') ? 'enabled' : ''}`}>
<div>
<span>ᛒ</span>
<i/>
<i/>
<i/>
</div>
<section>
<h2>Bluetooth</h2>
<p>{pref('bluetooth') ? 'Компьютер доступен для обнаружения как DIMA-PC' : 'Bluetooth выключен'}</p>
</section>
<Toggle value={pref('bluetooth')} onChange={(value) => update('bluetooth', value)}/>
</section>
<div className="sc-section-title">
<div>
<h2>Ваши устройства</h2>
<p>{devices.filter((device) => device.connected).length} подключено</p>
</div>
<button onClick={addDevice} disabled={!pref('bluetooth')}>＋ Добавить устройство</button>
</div>
<div className="sc-device-grid">{devices.map((device) =>
<article key={device.id} className={device.connected ? 'connected' : ''}>
<span>{device.type === 'Аудио' ? '♬' : device.type === 'Мышь' ? '⌁' : '✣'}</span>
<div>
<h3>{device.name}</h3>
<p>{device.type} · заряд {device.battery}%</p>
</div>
<i>{device.connected ? '● Подключено' : 'Не подключено'}</i>
<button onClick={() => toggleDevice(device.id)} disabled={!pref('bluetooth')}>{device.connected ? 'Отключить' : 'Подключить'}</button>
</article>)}</div>
<SettingsCard title="Дополнительные параметры">
<SettingRow icon="⇄" title="Обмен с устройствами поблизости" description="Отправка файлов между устройствами">
<Toggle value={pref('nearbyShare')} onChange={(value) => update('nearbyShare', value)}/>
</SettingRow>
<SettingRow icon="⚡" title="Быстрое подключение" description="Показывать уведомления о новых устройствах">
<Toggle value={pref('swiftPair')} onChange={(value) => update('swiftPair', value)}/>
</SettingRow>
<SettingRow icon="▣" title="Принтеры и сканеры" description="Управление устройствами печати" onClick={() => notify?.('Поиск принтеров завершён')}/>
<SettingRow icon="⌨" title="Ввод" description="Клавиатура, сенсорная панель и перо" onClick={() => notify?.('Параметры ввода сохранены')}/>
</SettingsCard>
</div>;
}

function NetworkPage({ pref, update, notify }: PageProps) {
  const [network, setNetwork] = usePersistentState('settings.networkName', 'DimaNet 5G');
  const networks = ['DimaNet 5G', 'Home Fiber', 'Coffee_Free_WiFi', 'Android Hotspot'];
  return <div className="sc-page">
<PageHeader icon="◉" title="Сеть и Интернет" description="Состояние подключения, Wi‑Fi, VPN и сетевые параметры"/>
<section className="sc-network-hero">
<div className="sc-wifi-radar">
<i/>
<i/>
<i/>
<span>●</span>
</div>
<div>
<span className="sc-status online">● Подключено</span>
<h2>{pref('wifi') && !pref('airplane') ? network : 'Нет подключения'}</h2>
<p>Защищённая сеть · Интернет доступен</p>
</div>
<strong>{pref('wifi') ? 'Wi‑Fi' : 'Отключено'}</strong>
</section>
<div className="sc-two-column">
<SettingsCard title="Беспроводная сеть">
<SettingRow icon="◉" title="Wi‑Fi" description="Поиск доступных сетей">
<Toggle value={pref('wifi')} onChange={(value) => update('wifi', value)}/>
</SettingRow>
<SettingRow icon="✈" title="Режим в самолёте" description="Отключить беспроводные соединения">
<Toggle value={pref('airplane')} onChange={(value) => update('airplane', value)}/>
</SettingRow>
<SettingRow icon="▥" title="Лимитное подключение" description="Уменьшить использование данных">
<Toggle value={pref('metered')} onChange={(value) => update('metered', value)}/>
</SettingRow>
</SettingsCard>
<SettingsCard title="VPN и безопасность">
<SettingRow icon="◆" title="Dima Secure VPN" description={pref('vpn') ? 'Туннель активен · Москва' : 'Не подключено'}>
<Toggle value={pref('vpn')} onChange={(value) => { update('vpn', value); notify?.(value ? 'VPN подключён' : 'VPN отключён') }}/>
</SettingRow>
<SettingRow icon="⌂" title="Профиль сети" description="Частная сеть">
<span>Частная</span>
</SettingRow>
<SettingRow icon="▤" title="Использование данных" description="4,8 ГБ за последние 30 дней" onClick={() => notify?.('Статистика обновлена')}/>
</SettingsCard>
</div>
<SettingsCard title="Доступные сети">{networks.map((item, index) =>
<SettingRow key={item} icon="◉" title={item} description={`${index === 0 ? 'Защищено · Wi‑Fi 6 · ' : 'Защищено · '}${90 - index * 17}% сигнала`}>
<button disabled={!pref('wifi') || pref('airplane')} onClick={() => { setNetwork(item); notify?.(`Подключено к ${item}`) }}>{network === item ? 'Подключено' : 'Подключиться'}</button>
</SettingRow>)}</SettingsCard>
</div>;
}

function PersonalPage({ wallpaper, onWallpaper, onCustomWallpaper, pref, update }: PageProps & SettingsCenterProps) {
  const colors = ['#1676d2', '#7057d8', '#d24778', '#008f8c', '#dd6b20', '#3a7d44', '#202a44', '#bf3b30'];
  const handleWallpaper = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onCustomWallpaper(file);
  };
  return <div className="sc-page">
<PageHeader icon="✦" title="Персонализация" description="Сделайте DimaOS действительно своей системой"/>
<section className="sc-personal-preview">
<div className={`preview-wall wall-${wallpaper}`}>
<div className="preview-window">
<header/>
<main/>
<aside/>
</div>
<footer>
<i/>
<i/>
<i/>
<i/>
</footer>
</div>
<div>
<h2>Текущий рабочий стол</h2>
<p>Изменения применяются сразу и сохраняются в браузере</p>
</div>
</section>
<SettingsCard title="Фон рабочего стола" description="Выберите встроенный фон или загрузите свой">
<div className="sc-wallpapers">{[0, 1, 2].map((item) =>
<button key={item} className={`wall-${item} ${wallpaper === item ? 'selected' : ''}`} onClick={() => onWallpaper(item)}>
<span>{wallpaper === item ? '✓' : ''}</span>
<b>Коллекция {item + 1}</b>
</button>)}<label>
<input type="file" accept="image/*" onChange={handleWallpaper}/>
<span>＋</span>
<b>Свои обои</b>
</label>
</div>
</SettingsCard>
<div className="sc-two-column">
<SettingsCard title="Режим приложения">
<div className="sc-theme-choices">
<button className={String(pref('theme')) === 'light' ? 'selected' : ''} onClick={() => { update('theme', 'light'); update('darkMode', false) }}>
<span className="theme-light">
<i/>
<i/>
</span>
<b>Светлая</b>
</button>
<button className={String(pref('theme')) === 'dark' ? 'selected' : ''} onClick={() => { update('theme', 'dark'); update('darkMode', true) }}>
<span className="theme-dark">
<i/>
<i/>
</span>
<b>Тёмная</b>
</button>
</div>
</SettingsCard>
<SettingsCard title="Цвет элементов">
<div className="sc-accent-grid">{colors.map((color) =>
<button key={color} style={{ background: color }} className={String(pref('accent')) === color ? 'selected' : ''} onClick={() => update('accent', color)}>{String(pref('accent')) === color ? '✓' : ''}</button>)}</div>
</SettingsCard>
</div>
<SettingsCard title="Визуальные эффекты">
<SettingRow icon="◈" title="Эффекты прозрачности" description="Стеклянные поверхности и размытие">
<Toggle value={pref('transparency')} onChange={(value) => update('transparency', value)}/>
</SettingRow>
<SettingRow icon="≈" title="Анимации" description="Плавное открытие окон и панелей">
<Toggle value={pref('animations')} onChange={(value) => update('animations', value)}/>
</SettingRow>
<SettingRow icon="▱" title="Компактная панель задач" description="Уменьшенные значки и высота панели">
<Toggle value={pref('compactTaskbar')} onChange={(value) => update('compactTaskbar', value)}/>
</SettingRow>
<SettingRow icon="▧" title="Советы на экране блокировки" description="Показывать приветствие и рекомендации">
<Toggle value={pref('lockTips')} onChange={(value) => update('lockTips', value)}/>
</SettingRow>
</SettingsCard>
</div>;
}

function AppsPage({ pref, update, notify }: PageProps) {
  const [filter, setFilter] = useState('');
  const installed = [
    ['Dima Browser', '308 МБ', 'Сегодня'], ['Проводник', '86 МБ', 'Системное'], ['Dima Player', '124 МБ', 'Сегодня'],
    ['Фотографии', '95 МБ', 'Вчера'], ['Dima Paint', '72 МБ', 'Сегодня'], ['Dima AI', '110 МБ', 'Системное'],
    ['Калькулятор', '18 МБ', 'Системное'], ['Блокнот', '24 МБ', 'Системное'], ['Погода', '45 МБ', 'Сегодня'],
  ].filter((app) => app[0].toLowerCase().includes(filter.toLowerCase()));
  return <div className="sc-page">
<PageHeader icon="▦" title="Приложения" description="Установленные приложения, компоненты и параметры запуска"/>
<div className="sc-app-summary">
<article>
<span>▦</span>
<div>
<b>14</b>
<small>установленных приложений</small>
</div>
</article>
<article>
<span>◫</span>
<div>
<b>1,8 ГБ</b>
<small>использовано приложениями</small>
</div>
</article>
<article>
<span>↻</span>
<div>
<b>Все</b>
<small>приложения обновлены</small>
</div>
</article>
</div>
<SettingsCard title="Параметры приложений">
<SettingRow icon="▷" title="Автозагрузка" description="Разрешать выбранным приложениям запускаться при входе">
<Toggle value={pref('startupApps')} onChange={(value) => update('startupApps', value)}/>
</SettingRow>
<SettingRow icon="↻" title="Автоматические обновления" description="Получать новые версии из Dima Store">
<Toggle value={pref('appUpdates')} onChange={(value) => update('appUpdates', value)}/>
</SettingRow>
<SettingRow icon="□" title="Архивация приложений" description="Освобождать место, сохраняя данные">
<Toggle value={pref('archiveApps')} onChange={(value) => update('archiveApps', value)}/>
</SettingRow>
<SettingRow icon="◇" title="Приложения по умолчанию" description="Dima Browser, Фотографии, Dima Player" onClick={() => notify?.('Приложения по умолчанию проверены')}/>
</SettingsCard>
<div className="sc-section-title">
<div>
<h2>Установленные приложения</h2>
<p>Управление и дополнительные параметры</p>
</div>
<div className="sc-inline-search">
<span>⌕</span>
<input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Найти приложение"/>
</div>
</div>
<div className="sc-installed-list">{installed.map((app, index) =>
<article key={app[0]}>
<span style={{ '--app-hue': `${200 + index * 23}` } as CSSProperties}>{app[0].slice(0, 1)}</span>
<div>
<h3>{app[0]}</h3>
<p>{app[1]} · {app[2]}</p>
</div>
<button onClick={() => notify?.(`Открыты параметры ${app[0]}`)}>•••</button>
</article>)}</div>
</div>;
}

function AccountsPage({ profileName, setProfileName, pref, update, notify }: PageProps & { profileName: string; setProfileName: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profileName);
  return <div className="sc-page">
<PageHeader icon="●" title="Учётные записи" description="Профиль, параметры входа, резервное копирование и синхронизация"/>
<section className="sc-account-hero">
<div>{profileName.slice(0, 2).toUpperCase()}</div>
<section>{editing ? <div className="sc-name-editor">
<input value={draft} onChange={(event) => setDraft(event.target.value)}/>
<button onClick={() => { if (draft.trim()) setProfileName(draft.trim()); setEditing(false); notify?.('Имя профиля обновлено') }}>Сохранить</button>
</div> : <>
<h2>{profileName}</h2>
<p>Локальная учётная запись · Администратор</p>
<button onClick={() => { setDraft(profileName); setEditing(true) }}>Изменить имя</button>
</>}</section>
<span className="sc-status online">● Защищено</span>
</section>
<SettingsCard title="Параметры учётной записи">
<SettingRow icon="◇" title="Варианты входа" description="PIN-код, пароль и динамическая блокировка" onClick={() => notify?.('Проверка безопасности завершена')}/>
<SettingRow icon="☁" title="Резервное копирование" description="Сохранять параметры DimaOS в браузере">
<Toggle value={pref('sync')} onChange={(value) => update('sync', value)}/>
</SettingRow>
<SettingRow icon="▦" title="Запоминать приложения" description="Восстанавливать открытые приложения после входа">
<Toggle value={pref('rememberApps')} onChange={(value) => update('rememberApps', value)}/>
</SettingRow>
<SettingRow icon="⌂" title="Семья и другие пользователи" description="Добавление локальных профилей" onClick={() => notify?.('Можно добавить пользователя в следующем обновлении')}/>
</SettingsCard>
<section className="sc-security-score">
<div className="sc-score-ring">
<span>92</span>
</div>
<div>
<h2>Отличная защита</h2>
<p>Пароль установлен, локальное хранилище защищено, разрешения приложений проверены.</p>
</div>
<button onClick={() => notify?.('Проверка безопасности выполнена')}>Проверить</button>
</section>
</div>;
}

function TimePage({ pref, update }: PageProps) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, []);
  return <div className="sc-page">
<PageHeader icon="◷" title="Время и язык" description="Дата, часовой пояс, регион и параметры ввода"/>
<section className="sc-time-hero">
<div>
<strong>{now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: !pref('hour24') })}</strong>
<span>{now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
</div>
<i>Europe/Moscow<br/>UTC+03:00</i>
</section>
<SettingsCard title="Дата и время">
<SettingRow icon="◷" title="Устанавливать время автоматически" description="Синхронизация с системными часами">
<Toggle value={pref('autoTime')} onChange={(value) => update('autoTime', value)}/>
</SettingRow>
<SettingRow icon="◎" title="Определять часовой пояс автоматически">
<Toggle value={pref('autoZone')} onChange={(value) => update('autoZone', value)}/>
</SettingRow>
<SettingRow icon="24" title="24-часовой формат">
<Toggle value={pref('hour24')} onChange={(value) => update('hour24', value)}/>
</SettingRow>
</SettingsCard>
<div className="sc-two-column">
<SettingsCard title="Язык">
<SettingRow title="Язык интерфейса">
<select value={String(pref('language'))} onChange={(event) => update('language', event.target.value)}>
<option>Русский</option>
<option>English</option>
<option>Deutsch</option>
<option>Français</option>
</select>
</SettingRow>
<SettingRow title="Клавиатура" description="Русская · Английская" onClick={() => undefined}/>
</SettingsCard>
<SettingsCard title="Регион">
<SettingRow title="Страна или регион">
<select value={String(pref('region'))} onChange={(event) => update('region', event.target.value)}>
<option>Россия</option>
<option>Казахстан</option>
<option>Беларусь</option>
<option>Германия</option>
</select>
</SettingRow>
<SettingRow title="Региональный формат" description="Русский (Россия)"/>
</SettingsCard>
</div>
</div>;
}

function PrivacyPage({ pref, update }: PageProps) {
  const permissions = [
    ['location', '⌖', 'Расположение', 'Доступ к приблизительному местоположению'],
    ['camera', '◉', 'Камера', 'Разрешить приложениям использовать камеру'],
    ['microphone', '♬', 'Микрофон', 'Разрешить приложениям использовать микрофон'],
    ['activityHistory', '◷', 'Журнал действий', 'Сохранять недавнюю активность локально'],
    ['clipboardSync', '▣', 'Буфер обмена', 'Синхронизировать текст между вкладками'],
  ];
  return <div className="sc-page">
<PageHeader icon="◇" title="Конфиденциальность и безопасность" description="Разрешения приложений, диагностика и защита данных"/>
<section className="sc-privacy-hero">
<div className="sc-shield">◇<i>✓</i>
</div>
<div>
<span className="sc-status online">Защита активна</span>
<h2>Ваши данные остаются на устройстве</h2>
<p>DimaOS хранит персонализацию и файлы в локальном хранилище браузера.</p>
</div>
</section>
<SettingsCard title="Разрешения приложений">{permissions.map(([key, icon, title, description]) =>
<SettingRow key={key} icon={icon} title={title} description={description}>
<Toggle value={pref(key)} onChange={(value) => update(key, value)}/>
</SettingRow>)}</SettingsCard>
<SettingsCard title="Диагностические данные">
<SettingRow icon="▥" title="Дополнительная диагностика" description="Отправка необязательных сведений отключена">
<Toggle value={pref('diagnostics')} onChange={(value) => update('diagnostics', value)}/>
</SettingRow>
<SettingRow icon="□" title="Очистить локальную историю" description="Удалить историю поиска и рекомендации">
<button onClick={() => { localStorage.removeItem('dimaos-ai-history'); localStorage.removeItem('dimaos-note') }}>Очистить</button>
</SettingRow>
</SettingsCard>
</div>;
}

function UpdatePage({ pref, update, notify }: PageProps) {
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastCheck, setLastCheck] = usePersistentState('settings.lastUpdateCheck', 'Сегодня, 19:30');
  const check = () => {
    if (checking) return;
    setChecking(true);
    setProgress(8);
    const timer = window.setInterval(() => setProgress((value) => {
      const next = Math.min(100, value + 8 + Math.round(Math.random() * 11));
      if (next >= 100) {
        clearInterval(timer);
        setChecking(false);
        setLastCheck(new Date().toLocaleString('ru-RU'));
        notify?.('Установлена последняя версия DimaOS');
      }
      return next;
    }), 180);
  };
  return <div className="sc-page update-page">
<PageHeader icon="↻" title="Центр обновления DimaOS" description="Новые функции, улучшения качества и безопасности"/>
<section className="sc-update-hero">
<div className={checking ? 'checking' : ''}>↻</div>
<section>
<span className="sc-status online">✓ Система обновлена</span>
<h2>DimaOS 11, версия 26H2</h2>
<p>Последняя проверка: {lastCheck}</p>{checking && <div className="sc-update-progress">
<i style={{ width: `${progress}%` }}/>
<span>{progress}%</span>
</div>}</section>
<button onClick={check} disabled={checking}>{checking ? 'Проверка…' : 'Проверить обновления'}</button>
</section>
<div className="sc-update-grid">
<article>
<span>✦</span>
<h3>Эффектный интерфейс</h3>
<p>Новые материалы, анимации и персонализация.</p>
</article>
<article>
<span>⚡</span>
<h3>Быстрый запуск</h3>
<p>Оптимизирована загрузка приложений и рабочего стола.</p>
</article>
<article>
<span>◇</span>
<h3>Безопасность</h3>
<p>Улучшена изоляция локальных данных и ключей.</p>
</article>
</div>
<SettingsCard title="Параметры обновлений">
<SettingRow icon="⚡" title="Получать новые возможности раньше" description="Предварительный доступ к функциям DimaOS">
<Toggle value={pref('updateEarly')} onChange={(value) => update('updateEarly', value)}/>
</SettingRow>
<SettingRow icon="◷" title="Журнал обновлений" description="DimaOS 11 26H2 · успешно установлено" onClick={() => notify?.('Журнал обновлений открыт')}/>
<SettingRow icon="↻" title="Восстановление" description="Сброс параметров без удаления личных файлов" onClick={() => notify?.('Точка восстановления создана')}/>
</SettingsCard>
</div>;
}
