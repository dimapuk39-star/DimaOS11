import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { usePersistentState } from './storage';

type AppId = 'explorer' | 'settings' | 'browser' | 'store' | 'terminal' | 'photos' | 'notepad' | 'calculator' | 'taskmanager' | 'dimaai' | 'player' | 'paint' | 'clock' | 'weather' | 'board' | 'code' | 'arcade' | 'connect' | 'mail' | 'calendarapp' | 'vault' | 'focus';
type SystemMode = 'desktop' | 'locked' | 'sleep';
type LineKind = 'command' | 'output' | 'success' | 'error' | 'muted' | 'accent' | 'art';
type TerminalLine = { id: number; kind: LineKind; text: string };
type FileEntry = { type: 'file' | 'dir'; content?: string; created: number };
type VirtualFiles = Record<string, FileEntry>;

const appAliases: Record<string, AppId> = {
  explorer: 'explorer', проводник: 'explorer', settings: 'settings', параметры: 'settings',
  browser: 'browser', браузер: 'browser', store: 'store', магазин: 'store', photos: 'photos', фото: 'photos',
  notepad: 'notepad', блокнот: 'notepad', calc: 'calculator', calculator: 'calculator', калькулятор: 'calculator',
  taskmanager: 'taskmanager', tasks: 'taskmanager', ai: 'dimaai', dimaai: 'dimaai', player: 'player', плеер: 'player',
  paint: 'paint', clock: 'clock', часы: 'clock', weather: 'weather', погода: 'weather', board: 'board', code: 'code',
  arcade: 'arcade', connect: 'connect', terminal: 'terminal', терминал: 'terminal',
  mail: 'mail', почта: 'mail', calendar: 'calendarapp', календарь: 'calendarapp', vault: 'vault', хранилище: 'vault', focus: 'focus', фокус: 'focus',
};

const commandNames = [
  'help', 'clear', 'cls', 'ver', 'about', 'whoami', 'hostname', 'pwd', 'cd', 'dir', 'ls', 'tree', 'cat', 'type',
  'echo', 'touch', 'mkdir', 'rm', 'del', 'write', 'rename', 'date', 'time', 'history', 'systeminfo', 'neofetch',
  'tasklist', 'ipconfig', 'ping', 'calc', 'color', 'theme', 'start', 'open', 'lock', 'sleep', 'fortune', 'cowsay',
  'matrix', 'motd', 'credits', 'reboot', 'exit',
];

const initialFiles: VirtualFiles = {
  '/': { type: 'dir', created: Date.now() },
  '/home': { type: 'dir', created: Date.now() },
  '/home/dmitry': { type: 'dir', created: Date.now() },
  '/home/dmitry/documents': { type: 'dir', created: Date.now() },
  '/home/dmitry/downloads': { type: 'dir', created: Date.now() },
  '/home/dmitry/pictures': { type: 'dir', created: Date.now() },
  '/home/dmitry/readme.txt': { type: 'file', content: 'Добро пожаловать в Dima Terminal!\nВведите help, чтобы увидеть все доступные команды.', created: Date.now() },
  '/home/dmitry/documents/ideas.txt': { type: 'file', content: '1. Сделать DimaOS лучшей браузерной ОС\n2. Добавить новые приложения\n3. Не останавливаться', created: Date.now() },
  '/system': { type: 'dir', created: Date.now() },
  '/system/version.txt': { type: 'file', content: 'DimaOS 11 Pro — 26H2 (Build 26100.4351)', created: Date.now() },
};

const fortunes = [
  'Лучший способ предсказать будущее — написать его самому.',
  'Код работает. Не трогай. Хотя нет — сделай ещё красивее.',
  'Каждая великая система начиналась с мигающего курсора.',
  'Сегодня хороший день, чтобы создать что-нибудь невозможное.',
  'Ошибка — это функция, которая пока не получила документацию.',
  'DimaOS считает, что у тебя всё получится.',
];

const themes = ['dima', 'matrix', 'amber', 'ice', 'light'] as const;
type Theme = typeof themes[number];

function line(kind: LineKind, text: string): TerminalLine {
  return { id: Date.now() + Math.random(), kind, text };
}

function tokenize(input: string) {
  const tokens: string[] = [];
  input.replace(/"([^"]*)"|'([^']*)'|(\S+)/g, (_, double, single, plain) => {
    tokens.push(double ?? single ?? plain);
    return '';
  });
  return tokens;
}

function normalizePath(current: string, requested = '') {
  if (!requested || requested === '~') return requested === '~' ? '/home/dmitry' : current;
  const translated = requested.replace(/\\/g, '/').replace(/^C:\/Users\/Дмитрий/i, '/home/dmitry').replace(/^C:/i, '');
  const source = translated.startsWith('/') ? translated : `${current}/${translated}`;
  const parts: string[] = [];
  source.split('/').forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') parts.pop(); else parts.push(part.toLowerCase());
  });
  return `/${parts.join('/')}`;
}

function displayPath(path: string) {
  if (path === '/home/dmitry') return 'C:\\Users\\Дмитрий';
  if (path.startsWith('/home/dmitry/')) return `C:\\Users\\Дмитрий\\${path.slice(14).split('/').join('\\')}`;
  if (path === '/') return 'C:\\';
  return `C:${path.split('/').join('\\')}`;
}

function childrenOf(files: VirtualFiles, path: string) {
  const prefix = path === '/' ? '/' : `${path}/`;
  return Object.entries(files).filter(([key]) => key.startsWith(prefix) && key !== path && !key.slice(prefix.length).includes('/'));
}

function calculate(source: string): number {
  const tokens = source.match(/\d+(?:\.\d+)?|[()+\-*/%]/g) ?? [];
  if (tokens.join('') !== source.replace(/\s/g, '')) throw new Error('Недопустимое выражение');
  let index = 0;
  const primary = (): number => {
    const token = tokens[index++];
    if (token === '(') { const value = expression(); if (tokens[index++] !== ')') throw new Error('Ожидается )'); return value; }
    if (token === '-') return -primary();
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error('Ожидается число');
    return value;
  };
  const term = (): number => {
    let value = primary();
    while (['*', '/', '%'].includes(tokens[index])) {
      const operation = tokens[index++]; const right = primary();
      value = operation === '*' ? value * right : operation === '/' ? value / right : value % right;
    }
    return value;
  };
  const expression = (): number => {
    let value = term();
    while (['+', '-'].includes(tokens[index])) { const operation = tokens[index++]; const right = term(); value = operation === '+' ? value + right : value - right; }
    return value;
  };
  const result = expression();
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error('Невозможно вычислить выражение');
  return result;
}

function helpLines(): TerminalLine[] {
  return [
    line('accent', 'Dima Terminal — справка по командам'),
    line('muted', 'Использование: команда [аргументы]. Имена файлов с пробелами заключайте в кавычки.'),
    line('output', ''),
    line('success', 'ФАЙЛЫ И ПАПКИ'),
    line('output', '  dir, ls [путь]          показать содержимое папки'),
    line('output', '  cd <путь>               перейти в папку (поддерживаются .. и ~)'),
    line('output', '  tree [путь]             показать дерево файлов'),
    line('output', '  cat, type <файл>        прочитать файл'),
    line('output', '  touch <файл>            создать пустой файл'),
    line('output', '  mkdir <папка>           создать папку'),
    line('output', '  write <файл> <текст>    записать текст в файл'),
    line('output', '  rm, del <путь>          удалить файл или пустую папку'),
    line('output', '  rename <старое> <новое> переименовать объект'),
    line('output', ''),
    line('success', 'СИСТЕМА'),
    line('output', '  systeminfo, neofetch    сведения об устройстве и DimaOS'),
    line('output', '  tasklist                список процессов'),
    line('output', '  ipconfig, ping <адрес>  сведения о сети'),
    line('output', '  ver, about, whoami, hostname, date, time'),
    line('output', '  start <приложение>      открыть приложение DimaOS'),
    line('output', '  lock, sleep, reboot     управление сеансом'),
    line('output', ''),
    line('success', 'ИНСТРУМЕНТЫ И СЕКРЕТЫ'),
    line('output', '  calc <выражение>        безопасный калькулятор'),
    line('output', '  echo <текст>            вывести текст'),
    line('output', '  color <тема>            темы: dima, matrix, amber, ice, light'),
    line('output', '  history                 история введённых команд'),
    line('output', '  fortune, cowsay, matrix, motd, credits'),
    line('output', '  clear, cls              очистить экран'),
    line('muted', 'Подсказка: ↑/↓ — история, Tab — автодополнение, Ctrl+L — очистить экран.'),
  ];
}

export default function TerminalApp({ onOpenApp, onMode, onRestart }: { onOpenApp: (id: AppId) => void; onMode: (mode: SystemMode) => void; onRestart: () => void }) {
  const [files, setFiles] = usePersistentState<VirtualFiles>('terminal.files', initialFiles);
  const [history, setHistory] = usePersistentState<string[]>('terminal.history', []);
  const [theme, setTheme] = usePersistentState<Theme>('terminal.theme', 'dima');
  const [cwd, setCwd] = useState('/home/dmitry');
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lines, setLines] = useState<TerminalLine[]>([
    line('accent', 'Dima Terminal [Версия 11.0.26100.4351]'),
    line('output', '(c) Dima Corporation. Все права защищены.'),
    line('muted', 'Введите help для просмотра доступных команд.'),
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prompt = `${displayPath(cwd)}>`;

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [lines]);
  const fileNames = useMemo(() => childrenOf(files, cwd).map(([path]) => path.split('/').pop() ?? ''), [files, cwd]);

  const append = (...next: TerminalLine[]) => setLines(current => [...current, ...next]);

  function execute(raw: string) {
    const trimmed = raw.trim();
    append(line('command', `${prompt} ${raw}`));
    setInput('');
    setHistoryIndex(-1);
    if (!trimmed) return;
    setHistory(current => [...current.filter(item => item !== trimmed), trimmed].slice(-100));
    const [rawCommand, ...args] = tokenize(trimmed);
    const command = rawCommand.toLowerCase();
    const joined = args.join(' ');

    if (command === 'clear' || command === 'cls') { setLines([]); return; }
    if (command === 'help' || command === '?') { append(...helpLines()); return; }
    if (command === 'echo') { append(line('output', joined)); return; }
    if (command === 'pwd') { append(line('output', displayPath(cwd))); return; }
    if (command === 'ver') { append(line('output', 'DimaOS 11 Pro [Версия 26H2, сборка 26100.4351]')); return; }
    if (command === 'whoami') { append(line('output', 'dimaos\\дмитрий')); return; }
    if (command === 'hostname') { append(line('output', 'DIMA-PC')); return; }
    if (command === 'date') { append(line('output', new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))); return; }
    if (command === 'time') { append(line('output', new Date().toLocaleTimeString('ru-RU'))); return; }
    if (command === 'motd') { append(line('accent', 'Сегодня DimaOS работает идеально. Создавай, исследуй, удивляй.')); return; }
    if (command === 'fortune') { append(line('success', fortunes[Math.floor(Math.random() * fortunes.length)])); return; }
    if (command === 'credits') { append(line('accent', 'DimaOS 11 создан Дмитрием вместе с Codex. Идея принадлежит мечтателям.')); return; }
    if (command === 'about') { append(line('art', '╔══════════════════════════════╗\n║       D I M A O S   1 1      ║\n║  Browser Edition · 26H2 Pro  ║\n╚══════════════════════════════╝')); return; }
    if (command === 'history') { append(...(history.length ? history.map((item, index) => line('output', `${String(index + 1).padStart(3)}  ${item}`)) : [line('muted', 'История команд пуста')])); return; }
    if (command === 'calc') { try { append(line('success', `${joined} = ${calculate(joined)}`)); } catch (error) { append(line('error', `Ошибка: ${(error as Error).message}`)); } return; }
    if (command === 'color' || command === 'theme') {
      if (!joined) { append(line('output', `Текущая тема: ${theme}. Доступно: ${themes.join(', ')}`)); return; }
      if (!themes.includes(joined as Theme)) { append(line('error', `Неизвестная тема «${joined}»`)); return; }
      setTheme(joined as Theme); append(line('success', `Тема изменена: ${joined}`)); return;
    }
    if (command === 'cowsay') { const message = joined || 'DimaOS — это красиво!'; const roof = '─'.repeat(message.length + 2); append(line('art', `┌${roof}┐\n│ ${message} │\n└${roof}┘\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`)); return; }
    if (command === 'matrix') { append(line('art', Array.from({ length: 8 }, () => Array.from({ length: 56 }, () => Math.random() > .5 ? '1' : '0').join('')).join('\n'))); setTheme('matrix'); return; }

    if (command === 'cd') {
      const target = normalizePath(cwd, args[0] ?? '~');
      if (files[target]?.type !== 'dir') append(line('error', `Путь не найден: ${args[0] ?? ''}`)); else setCwd(target);
      return;
    }
    if (command === 'dir' || command === 'ls') {
      const target = normalizePath(cwd, args[0] ?? '.');
      if (files[target]?.type !== 'dir') { append(line('error', `Папка не найдена: ${args[0] ?? target}`)); return; }
      const children = childrenOf(files, target);
      append(line('accent', ` Содержимое ${displayPath(target)}`), line('output', ''));
      if (!children.length) append(line('muted', '  Папка пуста'));
      else append(...children.map(([path, entry]) => line(entry.type === 'dir' ? 'success' : 'output', `${new Date(entry.created).toLocaleDateString('ru-RU')}  ${entry.type === 'dir' ? '<DIR>       ' : String(entry.content?.length ?? 0).padStart(7)}  ${path.split('/').pop()}`)));
      append(line('muted', `  ${children.filter(([, value]) => value.type === 'file').length} файлов, ${children.filter(([, value]) => value.type === 'dir').length} папок`)); return;
    }
    if (command === 'tree') {
      const target = normalizePath(cwd, args[0] ?? '.');
      if (files[target]?.type !== 'dir') { append(line('error', 'Указанная папка не найдена')); return; }
      const descendants = Object.keys(files).filter(path => path.startsWith(`${target === '/' ? '' : target}/`) && path !== target).slice(0, 80);
      append(line('accent', displayPath(target)), ...descendants.map(path => { const relative = path.slice(target === '/' ? 1 : target.length + 1); const depth = relative.split('/').length; return line(files[path].type === 'dir' ? 'success' : 'output', `${'│  '.repeat(depth - 1)}${depth > 1 ? '├─ ' : '├─ '}${relative.split('/').pop()}`); })); return;
    }
    if (command === 'cat' || command === 'type') {
      if (!args[0]) { append(line('error', 'Укажите имя файла')); return; }
      const target = normalizePath(cwd, args[0]); const entry = files[target];
      if (!entry || entry.type !== 'file') append(line('error', `Файл не найден: ${args[0]}`)); else append(line('output', entry.content || ''));
      return;
    }
    if (command === 'mkdir' || command === 'touch') {
      if (!args[0]) { append(line('error', `Использование: ${command} <имя>`)); return; }
      const target = normalizePath(cwd, args[0]); const parent = target.slice(0, target.lastIndexOf('/')) || '/';
      if (files[target]) { append(line('error', 'Объект с таким именем уже существует')); return; }
      if (files[parent]?.type !== 'dir') { append(line('error', 'Родительская папка не существует')); return; }
      setFiles(current => ({ ...current, [target]: { type: command === 'mkdir' ? 'dir' : 'file', content: command === 'touch' ? '' : undefined, created: Date.now() } }));
      append(line('success', `${command === 'mkdir' ? 'Папка' : 'Файл'} создан: ${args[0]}`)); return;
    }
    if (command === 'write') {
      if (args.length < 2) { append(line('error', 'Использование: write <файл> <текст>')); return; }
      const target = normalizePath(cwd, args[0]); const parent = target.slice(0, target.lastIndexOf('/')) || '/';
      if (files[parent]?.type !== 'dir') { append(line('error', 'Папка не существует')); return; }
      setFiles(current => ({ ...current, [target]: { type: 'file', content: args.slice(1).join(' '), created: current[target]?.created ?? Date.now() } }));
      append(line('success', `Записано в ${args[0]}`)); return;
    }
    if (command === 'rm' || command === 'del') {
      if (!args[0]) { append(line('error', `Использование: ${command} <путь>`)); return; }
      const target = normalizePath(cwd, args[0]);
      if (!files[target]) { append(line('error', 'Объект не найден')); return; }
      if (target === '/' || target === '/home' || target === '/home/dmitry') { append(line('error', 'Системную папку удалить нельзя')); return; }
      if (files[target].type === 'dir' && childrenOf(files, target).length) { append(line('error', 'Папка не пуста')); return; }
      setFiles(current => { const next = { ...current }; delete next[target]; return next; }); append(line('success', `Удалено: ${args[0]}`)); return;
    }
    if (command === 'rename') {
      if (args.length < 2) { append(line('error', 'Использование: rename <старое> <новое>')); return; }
      const source = normalizePath(cwd, args[0]); const target = normalizePath(cwd, args[1]);
      if (!files[source] || files[target]) { append(line('error', 'Исходный объект не найден или новое имя уже занято')); return; }
      setFiles(current => { const next = { ...current, [target]: current[source] }; delete next[source]; return next; }); append(line('success', `Переименовано: ${args[0]} → ${args[1]}`)); return;
    }

    if (command === 'systeminfo' || command === 'neofetch') {
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      const details = [
        line('art', '        ████  ████\n        ████  ████\n        ████  ████\n        ████  ████'),
        line('accent', 'Дмитрий@DIMA-PC'), line('muted', '────────────────────────────'),
        line('output', 'OS: DimaOS 11 Pro Browser Edition 26H2'),
        line('output', `Браузер: ${navigator.userAgent.includes('Edg') ? 'Microsoft Edge' : navigator.userAgent.includes('Chrome') ? 'Chromium' : 'Web Browser'}`),
        line('output', `Процессор: ${navigator.hardwareConcurrency || '?'} логических потоков`),
        line('output', `Память: ${memory ? `${memory} ГБ (оценка браузера)` : 'скрыто браузером'}`),
        line('output', `Экран: ${screen.width}×${screen.height}, ${window.devicePixelRatio}x DPR`),
        line('output', `Язык: ${navigator.language}`), line('output', `Сеть: ${navigator.onLine ? 'подключено' : 'нет подключения'}`),
        line('output', `Платформа: ${navigator.platform || 'Web'}`), line('success', 'Статус: все системы работают нормально'),
      ];
      append(...details); return;
    }
    if (command === 'tasklist') {
      const tasks = [['System', '4', '18 МБ'], ['DimaShell.exe', '418', '76 МБ'], ['DesktopHost.exe', '712', '124 МБ'], ['DimaTerminal.exe', '1337', '42 МБ'], ['BrowserRuntime.exe', '2026', '286 МБ']];
      append(line('accent', 'Имя процесса              PID      Память'), line('muted', '─────────────────────────────────────────'), ...tasks.map(task => line('output', `${task[0].padEnd(25)} ${task[1].padEnd(8)} ${task[2]}`))); return;
    }
    if (command === 'ipconfig') { append(line('accent', 'Настройка IP для DimaOS'), line('output', ''), line('success', 'Беспроводной адаптер Wi-Fi:'), line('output', '   Состояние подключения . . . . : Подключено'), line('output', '   IPv4-адрес . . . . . . . . . : 192.168.1.11'), line('output', '   Маска подсети . . . . . . . . : 255.255.255.0'), line('output', '   Основной шлюз . . . . . . . . : 192.168.1.1'), line('muted', 'Адреса показаны в демонстрационных целях: браузер скрывает локальную сетевую конфигурацию.')); return; }
    if (command === 'ping') {
      const host = args[0] || 'dimaos.local'; const ms = 8 + Math.floor(Math.random() * 24);
      append(line('accent', `Обмен пакетами с ${host}:`), ...Array.from({ length: 4 }, (_, index) => line('output', `Ответ от ${host}: число байт=32 время=${ms + index * 2}мс TTL=118`)), line('success', 'Пакетов: отправлено = 4, получено = 4, потеряно = 0 (0% потерь)')); return;
    }
    if (command === 'start' || command === 'open') {
      const app = appAliases[joined.toLowerCase()];
      if (!app) { append(line('error', `Приложение не найдено. Доступно: ${Object.keys(appAliases).filter(name => /^[a-z]/.test(name)).join(', ')}`)); return; }
      onOpenApp(app); append(line('success', `Запущено приложение: ${joined}`)); return;
    }
    if (command === 'lock') { append(line('success', 'Сеанс заблокирован')); window.setTimeout(() => onMode('locked'), 250); return; }
    if (command === 'sleep') { append(line('success', 'Переход в спящий режим…')); window.setTimeout(() => onMode('sleep'), 250); return; }
    if (command === 'reboot') { append(line('success', 'Перезапуск DimaOS…')); window.setTimeout(onRestart, 450); return; }
    if (command === 'exit') { append(line('muted', 'Чтобы закрыть терминал, нажмите × в заголовке окна.')); return; }
    append(line('error', `«${rawCommand}» не является командой DimaOS. Введите help для справки.`));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') { execute(input); return; }
    if (event.key === 'ArrowUp') { event.preventDefault(); if (!history.length) return; const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1); setHistoryIndex(next); setInput(history[next]); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); if (historyIndex < 0) return; const next = historyIndex + 1; if (next >= history.length) { setHistoryIndex(-1); setInput(''); } else { setHistoryIndex(next); setInput(history[next]); } return; }
    if (event.key === 'Tab') {
      event.preventDefault(); const parts = input.split(/\s+/); const fragment = parts[parts.length - 1]?.toLowerCase() ?? '';
      const choices = parts.length === 1 ? commandNames : fileNames; const matches = choices.filter(item => item.toLowerCase().startsWith(fragment));
      if (matches.length === 1) setInput([...parts.slice(0, -1), matches[0]].join(' ') + (parts.length === 1 ? ' ' : ''));
      else if (matches.length > 1) append(line('muted', matches.join('    ')));
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); setLines([]); }
    if (event.ctrlKey && event.key.toLowerCase() === 'c') { event.preventDefault(); append(line('command', `${prompt} ${input}^C`)); setInput(''); }
  }

  return <div className={`terminal terminal-${theme}`} onPointerDown={() => inputRef.current?.focus()}>
    <div className="terminal-toolbar">
      <span className="terminal-tab"><i>›_</i> Dima Terminal</span>
      <button onClick={() => execute('clear')} title="Очистить консоль">⌫</button>
      <button onClick={() => execute('help')} title="Справка">?</button>
      <button className="terminal-new-tab" onClick={() => append(line('accent', 'Новая сессия готова'))}>＋</button>
    </div>
    <div className="terminal-screen" ref={scrollRef}>
      {lines.map(item => <div key={item.id} className={`terminal-line ${item.kind}`}>{item.text || '\u00a0'}</div>)}
      <div className="terminal-prompt-row">
        <span>{prompt}</span>
        <input ref={inputRef} value={input} onChange={event => setInput(event.target.value)} onKeyDown={onKeyDown} autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Командная строка"/>
        <i className="terminal-caret"/>
      </div>
    </div>
    <footer className="terminal-status"><span>● PowerShell совместимый режим</span><span>UTF-8</span><span>{displayPath(cwd)}</span></footer>
  </div>;
}
