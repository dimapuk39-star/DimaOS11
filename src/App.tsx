import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import ExplorerApp from './Explorer';
import { CalculatorApp, DimaAiApp, TaskManagerApp } from './SystemApps';
import BrowserApp from './BrowserApp';
import MediaPlayer from './MediaPlayer';
import { loadBlob, saveBlob, usePersistentState } from './storage';
import { formatBytes, formatUptime, useHardwareInfo } from './hardware';
import { ClockApp, PaintApp, WeatherApp } from './WindowsSuite';
import DesktopWidgets from './DesktopExperience';
import Photos from './PhotosApp';
import SettingsCenter from './SettingsCenter';
import { DimaArcadeApp, DimaBoardApp, DimaCodeApp } from './DimaSuite';
import DimaConnectApp from './DimaConnect';
import ShellExperience from './ShellExperience';

type AppId = 'explorer' | 'settings' | 'browser' | 'store' | 'terminal' | 'photos' | 'notepad' | 'calculator' | 'taskmanager' | 'dimaai' | 'player' | 'paint' | 'clock' | 'weather' | 'board' | 'code' | 'arcade' | 'connect';
type Win = { id: AppId; open: boolean; minimized: boolean; maximized: boolean; z: number; x: number; y: number };

const glyphs: Record<string, ReactNode> = {
  search: <>
<circle cx="11" cy="11" r="6"/>
<path d="m16 16 4 4"/>
</>,
  folder: <>
<path d="M3 7.5h7l2-2h9v14H3z"/>
<path d="M3 9h18"/>
</>,
  gear: <>
<circle cx="12" cy="12" r="3"/>
<path d="M19 13.5v-3l-2-.6-.8-1.8 1-1.8-2.1-2.1-1.8 1-1.8-.8-.6-2h-3l-.6 2-1.8.8-1.8-1-2.1 2.1 1 1.8-.8 1.8-2 .6v3l2 .6.8 1.8-1 1.8 2.1 2.1 1.8-1 1.8.8.6 2h3l.6-2 1.8-.8 1.8 1 2.1-2.1-1-1.8.8-1.8z"/>
</>,
  wifi: <>
<path d="M3 9a14 14 0 0 1 18 0M6.5 13a9 9 0 0 1 11 0M10 17a4 4 0 0 1 4 0"/>
<circle cx="12" cy="20" r=".8" fill="currentColor"/>
</>,
  volume: <>
<path d="M4 10v4h4l5 4V6l-5 4zM16 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/>
</>,
  battery: <>
<rect x="3" y="7" width="17" height="10" rx="2"/>
<path d="M20 10h2v4h-2M6 10h10v4H6z"/>
</>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  back: <path d="m15 18-6-6 6-6"/>,
  grid: <>
<rect x="4" y="4" width="6" height="6" rx="1"/>
<rect x="14" y="4" width="6" height="6" rx="1"/>
<rect x="4" y="14" width="6" height="6" rx="1"/>
<rect x="14" y="14" width="6" height="6" rx="1"/>
</>,
  pc: <>
<rect x="3" y="4" width="18" height="13" rx="2"/>
<path d="M8 21h8M12 17v4"/>
</>,
  moon: <path d="M20 15.5A8 8 0 0 1 8.5 4 8 8 0 1 0 20 15.5z"/>,
  bluetooth: <path d="m8 7 8 10V7l-8 10M12 3l4 4M12 21l4-4"/>,
};

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{glyphs[name] ?? glyphs.grid}</svg>;
}

function DimaMark({ small = false }: { small?: boolean }) {
  return <span className={`dima-mark ${small ? 'small' : ''}`}>
<i/>
<i/>
<i/>
<i/>
</span>;
}

const apps: { id: AppId; title: string; short: string; icon: string; color: string }[] = [
  { id: 'browser', title: 'Dima Edge', short: 'E', icon: '◉', color: '#18a6d9' },
  { id: 'explorer', title: 'Проводник', short: 'П', icon: '▰', color: '#f4bd32' },
  { id: 'store', title: 'Dima Store', short: 'S', icon: '▣', color: '#27a9e8' },
  { id: 'settings', title: 'Параметры', short: '⚙', icon: '⚙', color: '#7b8799' },
  { id: 'photos', title: 'Фотографии', short: 'Ф', icon: '◫', color: '#23a9a2' },
  { id: 'notepad', title: 'Блокнот', short: 'Б', icon: '▤', color: '#6db2e5' },
  { id: 'terminal', title: 'Терминал', short: '>_', icon: '>_', color: '#202630' },
  { id: 'calculator', title: 'Калькулятор', short: 'К', icon: '＋', color: '#4d6078' },
  { id: 'taskmanager', title: 'Диспетчер задач', short: 'Д', icon: '▦', color: '#397db2' },
  { id: 'dimaai', title: 'Dima AI', short: 'AI', icon: 'D', color: '#7657d6' },
  { id: 'player', title: 'Dima Player', short: 'MP', icon: '▶', color: '#d44c76' },
  { id: 'paint', title: 'Dima Paint', short: 'P', icon: '✎', color: '#6a58c8' },
  { id: 'clock', title: 'Часы', short: 'Ч', icon: '◷', color: '#477cac' },
  { id: 'weather', title: 'Погода', short: 'П', icon: '☀', color: '#348fc5' },
  { id: 'board', title: 'Dima Board', short: 'DB', icon: '◆', color: '#4a78db' },
  { id: 'code', title: 'Dima Code', short: 'DC', icon: '⌁', color: '#2779c9' },
  { id: 'arcade', title: 'Dima Arcade', short: 'DA', icon: '✣', color: '#7b54dc' },
  { id: 'connect', title: 'Dima Connect', short: 'DC', icon: '◇', color: '#446fd1' },
];

const pinnedTaskbarIds: AppId[] = ['explorer', 'settings', 'browser'];

const initialWins: Win[] = apps.map((a, i) => ({ id: a.id, open: false, minimized: false, maximized: false, z: i + 1, x: 150 + i * 24, y: 70 + i * 15 }));

function WindowFrame({ win, title, children, onFocus, onClose, onMin, onMax, onMove }: { win: Win; title: string; children: ReactNode; onFocus: () => void; onClose: () => void; onMin: () => void; onMax: () => void; onMove: (x: number, y: number) => void }) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const down = (e: ReactPointerEvent) => {
    if (win.maximized || (e.target as HTMLElement).closest('.window-buttons')) return;
    drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    onMove(Math.max(0, Math.min(innerWidth - 500, e.clientX - drag.current.dx)), Math.max(0, Math.min(innerHeight - 160, e.clientY - drag.current.dy)));
  };
  if (!win.open || win.minimized) return null;
  const style = win.maximized ? { zIndex: win.z } : { zIndex: win.z, left: win.x, top: win.y };
  return <section className={`window ${win.maximized ? 'maximized' : ''}`} style={style} onPointerDown={onFocus}>
<header className="window-titlebar" onPointerDown={down} onPointerMove={move} onPointerUp={() => drag.current = null} onDoubleClick={onMax}>
<div className="window-title">
<DimaMark small/>
<span>{title}</span>
</div>
<div className="window-buttons">
<button onClick={onMin}>—</button>
<button onClick={onMax}>{win.maximized ? '❐' : '□'}</button>
<button className="close" onClick={onClose}>×</button>
</div>
</header>
<div className="window-content">{children}</div>
</section>;
}

function Settings({ onWallpaper, onCustomWallpaper, wallpaper }: { onWallpaper: (n: number) => void; onCustomWallpaper: (file: File) => void; wallpaper: number }) {
  const [section, setSection] = useState('system');
  const nav = [['system','▣','Система'],['bluetooth','⌁','Bluetooth и устройства'],['network','◉','Сеть и Интернет'],['personal','✦','Персонализация'],['apps','▦','Приложения'],['accounts','●','Учетные записи'],['time','◷','Время и язык'],['privacy','◇','Конфиденциальность'],['update','↻','Центр обновления']];
  return <div className="settings-layout">
<aside className="settings-side">
<div className="settings-search">
<Icon name="search"/>
<input placeholder="Найти параметр"/>
</div>
<div className="user-card">
<span>ДК</span>
<div>
<b>Дмитрий</b>
<small>Локальная учетная запись</small>
</div>
</div>
<nav>{nav.map(n =>
<button className={section === n[0] ? 'active' : ''} onClick={() => setSection(n[0])} key={n[0]}>
<i>{n[1]}</i>{n[2]}</button>)}</nav>
</aside>
<main className="settings-main">
      {section === 'system' && <About/>}
      {section === 'personal' && <>
<h1>Персонализация</h1>
<p className="lead">Настройте внешний вид DimaOS под себя</p>
<div className="setting-card personal-card">
<h3>Выберите фон рабочего стола</h3>
<div className="wallpaper-list">{[0,1,2].map(n =>
<button key={n} className={`wall-mini wall-${n} ${wallpaper === n ? 'chosen' : ''}`} onClick={() => onWallpaper(n)}>
<span>{wallpaper === n ? '✓' : ''}</span>
</button>)}<label className="wall-upload">
<input type="file" accept="image/*" onChange={e=>{const file=e.target.files?.[0];if(file)onCustomWallpaper(file)}}/>
<b>＋</b>
<span>Свои обои</span>
</label>
</div>
</div>
<SettingRows/>
</>}
      {!['system','personal'].includes(section) && <GenericSettings title={nav.find(n => n[0] === section)?.[2] || ''}/>} 
    </main>
</div>;
}

function About() {
  const {data,loading,error,refresh}=useHardwareInfo();
  const memory=data?.memoryTotal?`${formatBytes(data.memoryTotal)}${data.memoryFree!==null?` · свободно ${formatBytes(data.memoryFree)}`:''}`:'Браузер ограничил доступ';
  const gpu=data?.gpu?.length?data.gpu.map(item=>`${item.name}${item.memory?` · ${formatBytes(item.memory)}`:''}`).join('; '):'Браузер ограничил доступ';
  const disks=data?.disks?.length?data.disks.map(item=>`${item.name} ${item.label} · ${formatBytes(item.total)} · свободно ${formatBytes(item.free)}`).join('; '):(data?.storageQuota?`Хранилище сайта: ${formatBytes(data.storageQuota)} · занято ${formatBytes(data.storageUsage)}`:'Браузер ограничил доступ');
  return <>
<div className="crumb">Система <span>›</span> О системе</div>
<div className="hardware-source">
<span className={data?.source==='system'?'exact':'limited'}>{loading?'Определение…':data?.source==='system'?'● Точные данные локальной системы':'◐ Данные, доступные браузеру'}</span>
<button onClick={refresh} disabled={loading}>↻ Обновить</button>
</div>
<div className="device-hero">
<div className="device-art">
<div className="monitor">
<DimaMark/>
</div>
<div className="stand"/>
</div>
<div>
<h1>{data?.computerName||'DIMA-PC'}</h1>
<p>DimaOS 11 Pro · {data?.operatingSystem||'Определение системы…'}</p>
<button>Переименовать этот компьютер</button>
</div>
</div>
    {error&&<div className="hardware-warning">Не удалось определить часть характеристик: {error}</div>}
    <h2>Реальные характеристики устройства</h2>
<div className="specs">
<Spec k="Имя устройства" v={data?.computerName||'Определение…'}/>
<Spec k="Процессор" v={data?.processor||'Определение…'}/>
<Spec k="Логические процессоры" v={data?.logicalProcessors?`${data.logicalProcessors}`:'Недоступно'}/>
<Spec k="Оперативная память" v={memory}/>
<Spec k="Видеокарта" v={gpu}/>
<Spec k="Накопители" v={disks}/>
<Spec k="Тип системы" v={`${data?.architecture||'Не определена'} · ${data?.platform||'Не определена'}`}/>
<Spec k="Время работы системы" v={data?formatUptime(data.uptime):'Определение…'}/>
<Spec k="Экран" v={data?.screen||'Определение…'}/>
<Spec k="Сенсорный ввод" v={data?data.touchPoints?`${data.touchPoints} точек касания`:'Поддержка не обнаружена':'Определение…'}/>
<Spec k="Браузер" v={data?.browser||'Определение…'}/>
</div>
    {data?.source==='browser'&&<div className="hardware-note">
<b>Почему часть данных недоступна?</b>
<p>Браузер скрывает точную модель CPU, диски и часть сведений о GPU для защиты приватности. Запустите DimaOS через START-DimaOS.cmd, чтобы локальный сервер предоставил точные системные данные.</p>
</div>}
    <h2>Характеристики DimaOS</h2>
<div className="specs">
<Spec k="Выпуск" v="DimaOS 11 Pro"/>
<Spec k="Версия" v="26H2"/>
<Spec k="Установлено" v="22.07.2026"/>
<Spec k="Сборка ОС" v="26100.4351"/>
<Spec k="Источник данных" v={data?.source==='system'?'Локальная системная служба DimaOS':'Безопасные браузерные API'}/>
<Spec k="Последнее измерение" v={data?.measuredAt?new Date(data.measuredAt).toLocaleString('ru-RU'):'—'}/>
</div>
</>;
}
function Spec({ k, v }: { k: string; v: string }) { return <div className="spec">
<b>{k}</b>
<span>{v}</span>
</div>; }
function SettingRows() { return <div className="setting-card rows">
<div>
<b>Темы</b>
<span>Выбор сочетания фона, цвета и звуков</span>
<Icon name="chevron"/>
</div>
<div>
<b>Цвета</b>
<span>Цвет элементов и режим приложения</span>
<Icon name="chevron"/>
</div>
<div>
<b>Экран блокировки</b>
<span>Изображение и уведомления</span>
<Icon name="chevron"/>
</div>
</div>; }
function GenericSettings({ title }: { title: string }) { return <>
<h1>{title}</h1>
<p className="lead">Управление параметрами устройства</p>
<div className="setting-card rows">
<div>
<b>Основные параметры</b>
<span>Настройка доступных возможностей</span>
<label className="toggle">
<input type="checkbox" defaultChecked/>
<i/>
</label>
</div>
<div>
<b>Дополнительные параметры</b>
<span>Просмотр и изменение конфигурации</span>
<Icon name="chevron"/>
</div>
<div>
<b>Состояние</b>
<span>Все работает нормально</span>
<em className="ok">Готово</em>
</div>
</div>
</>; }

function Explorer() { const files = [['Загрузки','↓','12 элементов'],['Документы','▤','34 элемента'],['Изображения','▧','128 элементов'],['Музыка','♫','24 элемента'],['Видео','▶','8 элементов']]; return <div className="explorer">
<div className="commandbar">
<button>＋ Создать</button>
<button>✂</button>
<button>▣</button>
<button>↗</button>
<button>•••</button>
</div>
<div className="address">
<button>‹</button>
<button>›</button>
<span>⌂  Этот компьютер  ›  Главная</span>
<div>
<Icon name="search"/>Поиск в: Главная</div>
</div>
<div className="explorer-body">
<aside>
<b>⌂ Главная</b>
<span>▣ Галерея</span>
<small>OneDrive</small>
<span>☁ Дмитрий</span>
<small>Закрепленные</small>
<span>▤ Рабочий стол</span>
<span>↓ Загрузки</span>
<span>▧ Изображения</span>
</aside>
<main>
<h2>Главная</h2>
<h3>Быстрый доступ</h3>
<div className="file-grid">{files.map(f =>
<div key={f[0]}>
<i>{f[1]}</i>
<span>
<b>{f[0]}</b>
<small>{f[2]}</small>
</span>
</div>)}</div>
<h3>Последние</h3>
<div className="recent">
<span>Документ DimaOS.docx</span>
<small>Сегодня, 12:41</small>
</div>
<div className="recent">
<span>Wallpaper.png</span>
<small>Вчера, 19:20</small>
</div>
</main>
</div>
</div>; }

function Browser() {
  const home = 'dima://start'; const [history,setHistory]=useState([home]); const [index,setIndex]=useState(0); const [input,setInput]=useState(home); const [loading,setLoading]=useState(false); const [favorite,setFavorite]=useState(false); const [reload,setReload]=useState(0); const current=history[index];
  const normalize=(value:string)=>{const v=value.trim();if(!v)return home;if(v===home)return home;if(/^https?:\/\//i.test(v))return v;if(v.includes('.')&&!v.includes(' '))return `https://${v}`;return `https://www.bing.com/search?q=${encodeURIComponent(v)}`};
  const go=(value=input)=>{const next=normalize(value);setHistory(h=>[...h.slice(0,index+1),next]);setIndex(index+1);setInput(next);setLoading(next!==home)};
  const travel=(next:number)=>{if(next<0||next>=history.length)return;setIndex(next);setInput(history[next]);setLoading(history[next]!==home)};
  const shortcut=(url:string)=>go(url);
  return <div className="browser">
<div className="tabs">
<span>＋</span>
<b>{current===home?'Новая вкладка':new URL(current).hostname}</b>
</div>
<div className="browserbar">
<button disabled={index===0} onClick={()=>travel(index-1)}>←</button>
<button disabled={index===history.length-1} onClick={()=>travel(index+1)}>→</button>
<button onClick={()=>{if(current===home)go(home);else{setLoading(true);setReload(r=>r+1)}}}>↻</button>
<form onSubmit={e=>{e.preventDefault();go()}}>
<span>{current===home?'⌂':'🔒'}</span>
<input value={input} onChange={e=>setInput(e.target.value)} aria-label="Адрес сайта"/>
<button type="submit">Перейти</button>
</form>
<button className={favorite?'fav':''} onClick={()=>setFavorite(!favorite)}>☆</button>
<button title="Открыть в новой вкладке" onClick={()=>current!==home&&window.open(current,'_blank','noopener,noreferrer')}>↗</button>
</div>{loading&&<div className="browser-progress"/>}{current===home?<main>
<div className="browser-brand">
<DimaMark/>
<h1>Dima</h1>
</div>
<form className="websearch" onSubmit={e=>{e.preventDefault();const q=new FormData(e.currentTarget).get('q')?.toString()||'';go(q)}}>
<Icon name="search"/>
<input name="q" placeholder="Поиск в Интернете или адрес сайта"/>
<button>⌕</button>
</form>
<div className="site-links">
<button onClick={()=>shortcut('https://www.youtube.com')}>
<i>▶</i>YouTube</button>
<button onClick={()=>shortcut('https://web.telegram.org')}>
<i>✈</i>Telegram</button>
<button onClick={()=>shortcut('https://vk.com')}>
<i>VK</i>VK</button>
<button onClick={()=>shortcut('https://wikipedia.org')}>
<i>W</i>Wikipedia</button>
</div>
<p className="browser-hint">Некоторые сайты запрещают встраивание. Для них нажмите ↗ справа от адресной строки.</p>
</main>:<div className="webview">
<iframe key={`${current}-${reload}`} src={current} title="Dima Edge web page" onLoad={()=>setLoading(false)}/>
<div className="frame-help">Сайт не появился? Нажмите ↗ — некоторые сайты разрешают работу только в отдельной вкладке.</div>
</div>}</div>;
}
function Store() { const [installed,setInstalled]=useState<string[]>([]); const install=(id:string)=>setInstalled(s=>s.includes(id)?s:[...s,id]); return <div className="store">
<aside>
<DimaMark/>
<Icon name="search"/>
<span>⌂</span>
<span>▦</span>
<span>🎮</span>
</aside>
<main>
<h1>Добро пожаловать в Dima Store</h1>
<div className="store-hero">
<span>Приложение недели</span>
<h2>Dima Creative Studio</h2>
<p>Создавайте идеи без ограничений</p>
<button onClick={()=>install('studio')}>{installed.includes('studio')?'Установлено ✓':'Получить'}</button>
</div>
<h2>Лучшие приложения</h2>
<div className="store-apps">{apps.slice(0,4).map(a =>
<div key={a.id}>
<AppTile app={a}/>
<b>{a.title}</b>
<button onClick={()=>install(a.id)}>{installed.includes(a.id)?'Установлено':'Получить'}</button>
</div>)}</div>
</main>
</div>; }
function Terminal() { return <div className="terminal">
<p>Dima Terminal [Версия 11.0.26100.4351]</p>
<p>(c) Dima Corporation. Все права защищены.</p>
<br/>
<p>C:\Users\Дмитрий&gt; <span className="caret">_</span>
</p>
</div>; }
function Notepad() { const [text,setText]=useState(()=>localStorage.getItem('dimaos-note')||'Добро пожаловать в DimaOS 11!\n\nЭто браузерная операционная система, созданная специально для Дмитрия.'); const [saved,setSaved]=useState(false); const save=()=>{localStorage.setItem('dimaos-note',text);setSaved(true);setTimeout(()=>setSaved(false),1200)}; return <div className="notepad">
<div>
<button onClick={save}>Сохранить</button>
<button onClick={()=>setText('')}>Новый</button>
<span>{saved?'Сохранено ✓':'Изменения сохраняются локально'}</span>
</div>
<textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.ctrlKey&&e.key==='s'){e.preventDefault();save()}}}/>
</div>; }

function AppTile({ app }: { app: typeof apps[number] }) { return <span className="app-tile" style={{'--tile': app.color} as CSSProperties}>{app.icon}</span>; }

export default function App() {
  const [wins, setWins] = usePersistentState<Win[]>('desktop.windows',initialWins); const [start, setStart] = useState(false); const [quick, setQuick] = useState(false); const [calendar, setCalendar] = useState(false); const [search, setSearch] = useState(''); const [wallpaper, setWallpaper] = usePersistentState('desktop.wallpaper',0); const [customWallpaper,setCustomWallpaper]=useState(''); const [clock, setClock] = useState(new Date()); const [bootPhase,setBootPhase]=useState<'boot'|'hello'|'done'>('boot'); const [brightness,setBrightness]=usePersistentState('desktop.brightness',78); const [toggles,setToggles]=usePersistentState<Record<string,boolean>>('desktop.quickToggles',{wifi:true,bluetooth:true,focus:false,airplane:false,night:false,access:false});
  const [taskbarOrder,setTaskbarOrder]=usePersistentState<AppId[]>('desktop.taskbarOrder',pinnedTaskbarIds); const [draggedTaskbarApp,setDraggedTaskbarApp]=useState<AppId|null>(null);
  const [widgetsOpen,setWidgetsOpen]=useState(false);
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); const hello=setTimeout(()=>setBootPhase('hello'),1800); const done=setTimeout(()=>setBootPhase('done'),3400); loadBlob('wallpaper:custom').then(blob=>{if(blob)setCustomWallpaper(URL.createObjectURL(blob))}); return () => {clearInterval(t);clearTimeout(hello);clearTimeout(done)}; }, []);
  useEffect(()=>{setWins(current=>[...current,...initialWins.filter(template=>!current.some(win=>win.id===template.id))])},[]);
  useEffect(()=>{setTaskbarOrder(current=>{
    const openIds=wins.filter(win=>win.open).map(win=>win.id);
    const visibleIds=[...pinnedTaskbarIds,...openIds];
    const next=[...current.filter(id=>visibleIds.includes(id)),...visibleIds.filter(id=>!current.includes(id))];
    return next.length===current.length&&next.every((id,index)=>id===current[index])?current:next;
  })},[wins]);
  const topZ = useMemo(() => Math.max(...wins.map(w => w.z), 1), [wins]);
  const patchWin = (id: AppId, patch: Partial<Win>) => setWins(ws => ws.map(w => w.id === id ? {...w, ...patch} : w));
  const focus = (id: AppId) => patchWin(id, { z: topZ + 1 });
  const openApp = (id: AppId) => { setWins(ws => ws.map(w => w.id === id ? {...w, open: true, minimized: false, z: topZ + 1} : w)); setStart(false); };
  const taskbarClick=(id:AppId)=>{const win=wins.find(item=>item.id===id);if(!win?.open){openApp(id);return}if(win.minimized){setWins(current=>current.map(item=>item.id===id?{...item,minimized:false,z:topZ+1}:item));return}if(win.z===topZ){patchWin(id,{minimized:true});return}focus(id)};
  const moveTaskbarApp=(targetId:AppId)=>{if(!draggedTaskbarApp||draggedTaskbarApp===targetId)return;setTaskbarOrder(order=>{const sourceIndex=order.indexOf(draggedTaskbarApp);const targetIndex=order.indexOf(targetId);if(sourceIndex<0||targetIndex<0)return order;const next=[...order];next.splice(sourceIndex,1);next.splice(targetIndex,0,draggedTaskbarApp);return next})};
  const orderedTaskbarApps=taskbarOrder.map(id=>apps.find(app=>app.id===id)).filter((app):app is typeof apps[number]=>Boolean(app));
  const chooseWallpaper=(n:number)=>{setWallpaper(n);setCustomWallpaper('')};
  const useCustomWallpaper=async(file:File)=>{await saveBlob('wallpaper:custom',file);if(customWallpaper)URL.revokeObjectURL(customWallpaper);setCustomWallpaper(URL.createObjectURL(file));setWallpaper(3)};
  const restart=()=>{setStart(false);setBootPhase('boot');setTimeout(()=>setBootPhase('hello'),1700);setTimeout(()=>setBootPhase('done'),3300)};
  const content: Record<AppId, ReactNode> = { explorer:<ExplorerApp onOpenApp={(id)=>openApp(id as AppId)}/>, settings:<SettingsCenter wallpaper={wallpaper} onWallpaper={chooseWallpaper} onCustomWallpaper={useCustomWallpaper}/>, browser:<BrowserApp/>, store:<Store/>, terminal:<Terminal/>, photos:<Photos/>, notepad:<Notepad/>, calculator:<CalculatorApp/>, taskmanager:<TaskManagerApp/>, dimaai:<DimaAiApp onOpenApp={(id)=>openApp(id as AppId)}/>, player:<MediaPlayer/>, paint:<PaintApp/>, clock:<ClockApp/>, weather:<WeatherApp/>, board:<DimaBoardApp/>, code:<DimaCodeApp/>, arcade:<DimaArcadeApp/>, connect:<DimaConnectApp/> };
  const shownApps = apps.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));
  if(bootPhase==='boot')return <div className="boot-screen">
<div className="boot-brand">
<DimaMark/>
<h1>DimaOS <b>11</b>
</h1>
</div>
<div className="boot-spinner">
<i/>
<i/>
<i/>
<i/>
<i/>
</div>
<span>Запуск системы</span>
</div>;
  if(bootPhase==='hello')return <div className="hello-screen">
<div className="hello-avatar">ДК</div>
<h1>Hello, Дмитрий</h1>
<p>Добро пожаловать в DimaOS 11</p>
<div className="hello-dots">
<i/>
<i/>
<i/>
</div>
</div>;
  return <div className={`desktop wallpaper-${wallpaper} ${toggles.night?'night-mode':''}`} style={customWallpaper?{backgroundImage:`url(${customWallpaper})`,backgroundSize:'cover',backgroundPosition:'center'}:undefined} onPointerDown={(e) => { if ((e.target as HTMLElement).classList.contains('desktop')) { setStart(false); setQuick(false); setCalendar(false); } }}>
<div className="brightness-shade" style={{opacity:(100-brightness)/170}}/>
<div className="wallpaper-glow"/>
<div className="wallpaper-logo">
<DimaMark/>
</div>
<div className="desktop-icons">
<button onDoubleClick={() => openApp('explorer')}>
<AppTile app={apps[1]}/>
<span>Этот компьютер</span>
</button>
<button onDoubleClick={() => openApp('browser')}>
<AppTile app={apps[0]}/>
<span>Dima Edge</span>
</button>
<button onDoubleClick={() => openApp('settings')}>
<AppTile app={apps[3]}/>
<span>Параметры</span>
</button>
<button>
<span className="bin">♲</span>
<span>Корзина</span>
</button>
</div>
    {wins.map(w =>
<WindowFrame key={w.id} win={w} title={apps.find(a=>a.id===w.id)!.title} onFocus={() => focus(w.id)} onClose={() => patchWin(w.id,{open:false})} onMin={() => patchWin(w.id,{minimized:true})} onMax={() => patchWin(w.id,{maximized:!w.maximized})} onMove={(x,y)=>patchWin(w.id,{x,y})}>{content[w.id]}</WindowFrame>)}
    {start && <div className="start-menu glass">
<div className="start-search">
<Icon name="search"/>
<input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Введите здесь текст для поиска"/>
</div>
<div className="start-head">
<b>{search ? 'Результаты' : 'Закрепленные'}</b>
<button onClick={()=>setSearch('')}>Все приложения ›</button>
</div>
<div className="pinned">{shownApps.map(a =>
<button key={a.id} onClick={()=>openApp(a.id)}>
<AppTile app={a}/>
<span>{a.title}</span>
</button>)}</div>{!search && <>
<div className="start-head">
<b>Рекомендуем</b>
<button onClick={()=>openApp('explorer')}>Дополнительно ›</button>
</div>
<div className="recommended">
<div onClick={()=>openApp('notepad')}>
<AppTile app={apps[5]}/>
<span>
<b>Добро пожаловать в DimaOS</b>
<small>Недавно добавлено</small>
</span>
</div>
<div onClick={()=>openApp('explorer')}>
<span className="doc-icon">W</span>
<span>
<b>Проект DimaOS</b>
<small>2 мин. назад</small>
</span>
</div>
</div>
</>}<footer>
<div className="profile">ДК</div>
<b>Дмитрий</b>
<button title="Перезапустить DimaOS" onClick={restart}>⏻</button>
</footer>
</div>}
    {quick && <div className="quick-panel glass">
<div className="quick-grid">
<button className={toggles.wifi?'on':''} onClick={()=>setToggles(t=>({...t,wifi:!t.wifi,airplane:false}))}>
<Icon name="wifi"/>
<span>Wi-Fi</span>
<small>›</small>
</button>
<button className={toggles.bluetooth?'on':''} onClick={()=>setToggles(t=>({...t,bluetooth:!t.bluetooth}))}>
<Icon name="bluetooth"/>
<span>Bluetooth</span>
<small>›</small>
</button>
<button className={toggles.focus?'on':''} onClick={()=>setToggles(t=>({...t,focus:!t.focus}))}>
<Icon name="moon"/>
<span>Фокус</span>
</button>
<button className={toggles.airplane?'on':''} onClick={()=>setToggles(t=>({...t,airplane:!t.airplane,wifi:t.airplane?t.wifi:false}))}>
<span>✈</span>
<span>В самолете</span>
</button>
<button className={toggles.night?'on':''} onClick={()=>setToggles(t=>({...t,night:!t.night}))}>
<span>☼</span>
<span>Ночной свет</span>
</button>
<button className={toggles.access?'on':''} onClick={()=>setToggles(t=>({...t,access:!t.access}))}>
<span>◉</span>
<span>Спец. возможности</span>
</button>
</div>
<div className="slider">
<span>☼</span>
<input type="range" value={brightness} onChange={e=>setBrightness(Number(e.target.value))}/>
</div>
<div className="slider">
<Icon name="volume"/>
<input type="range" defaultValue="55"/>
</div>
<footer>
<span>🔋 96%</span>
<button onClick={()=>openApp('settings')}>⚙</button>
</footer>
</div>}
    {calendar && <div className="calendar glass">
<header>
<b>{clock.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})}</b>
<button>⌃</button>
</header>
<h1>{clock.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</h1>
<div className="cal-head">
<b>Июль 2026</b>
<span>⌃ &nbsp;⌄</span>
</div>
<div className="cal-grid">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>
<b>{d}</b>)}{Array.from({length:35},(_,i)=>{const n=i-1; return <span className={n===22?'today':''}>{n>0&&n<32?n:''}</span>})}</div>
</div>}
    <DesktopWidgets open={widgetsOpen} onClose={()=>setWidgetsOpen(false)} onOpenApp={(id)=>openApp(id as AppId)}/>
<ShellExperience onOpenApp={(id)=>openApp(id as AppId)}/>
<footer className="taskbar">
<div className="task-center">
<button className={start?'active':''} onClick={()=>{setStart(!start);setQuick(false);setCalendar(false)}}>
<DimaMark small/>
</button>
<button onClick={()=>setStart(true)}>
<Icon name="search"/>
</button>
<button className={widgetsOpen?'active':''} onClick={()=>{setWidgetsOpen(!widgetsOpen);setStart(false);setQuick(false);setCalendar(false)}} title="Виджеты">▥</button>{orderedTaskbarApps.map(a=>{const win=wins.find(w=>w.id===a.id);return <button key={a.id} draggable className={`${win?.open?'running':''} ${win?.minimized?'minimized':''} ${draggedTaskbarApp===a.id?'dragging':''}`} title={a.title} onClick={()=>taskbarClick(a.id)} onDragStart={event=>{setDraggedTaskbarApp(a.id);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',a.id)}} onDragEnter={()=>moveTaskbarApp(a.id)} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect='move'}} onDrop={event=>{event.preventDefault();moveTaskbarApp(a.id);setDraggedTaskbarApp(null)}} onDragEnd={()=>setDraggedTaskbarApp(null)}>
<AppTile app={a}/>
</button>})}</div>
<div className="tray">
<span>⌃</span>
<button onClick={()=>{setQuick(!quick);setCalendar(false);setStart(false)}}>
<Icon name="wifi"/>
<Icon name="volume"/>
<Icon name="battery"/>
</button>
<button className="clock" onClick={()=>{setCalendar(!calendar);setQuick(false);setStart(false)}}>
<span>{clock.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span>
<span>{clock.toLocaleDateString('ru-RU')}</span>
</button>
<i/>
</div>
</footer>
</div>;
}
