import { useEffect, useMemo, useState } from 'react';
import { usePersistentState } from './storage';

type ShellProps = { onOpenApp: (id: string) => void };
type Notice = { id: string; app: string; icon: string; title: string; text: string; time: string; color: string; read: boolean };

const shellApps = [
  ['explorer', 'Проводник', '▰', 'Файлы и папки'], ['settings', 'Параметры', '⚙', 'Настройка DimaOS'], ['browser', 'Dima Browser', '◉', 'Интернет'],
  ['board', 'Dima Board', '◆', 'Задачи и идеи'], ['code', 'Dima Code', '⌁', 'Редактор кода'], ['arcade', 'Dima Arcade', '✣', 'Игровой центр'],
  ['connect', 'Dima Connect', '◇', 'Сообщения и звонки'], ['photos', 'Фотографии', '▧', 'Галерея'], ['player', 'Dima Player', '▶', 'Музыка и видео'],
  ['paint', 'Dima Paint', '✎', 'Рисование'], ['dimaai', 'Dima AI', 'D', 'Помощник'], ['calculator', 'Калькулятор', '＋', 'Вычисления'],
];

const starterNotices: Notice[] = [
  { id: 'welcome', app: 'DimaOS', icon: 'D', title: 'Добро пожаловать в новую DimaOS', text: 'Полноценные Параметры и новые приложения уже готовы.', time: 'Сейчас', color: '#416fd1', read: false },
  { id: 'board', app: 'Dima Board', icon: '◆', title: 'Задачи ждут вас', text: 'Одна важная задача запланирована на сегодня.', time: '5 мин', color: '#6858d4', read: false },
  { id: 'update', app: 'Центр обновления', icon: '↻', title: 'DimaOS обновлена', text: 'Установлена версия 26H2. Перезапуск не требуется.', time: '18 мин', color: '#287dbd', read: true },
];

export default function ShellExperience({ onOpenApp }: ShellProps) {
  const [palette, setPalette] = useState(false);
  const [query, setQuery] = useState('');
  const [notices, setNotices] = usePersistentState<Notice[]>('shell.notifications', starterNotices);
  const [noticePanel, setNoticePanel] = useState(false);
  const [context, setContext] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPalette((value) => !value) }
      if (event.key === 'Escape') { setPalette(false); setNoticePanel(false); setContext(null) }
    };
    const menu = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.desktop') && !(event.target as HTMLElement).closest('.window,.taskbar,.start-menu,.quick-panel')) { event.preventDefault(); setContext({ x: event.clientX, y: event.clientY }) }
    };
    const close = (event: MouseEvent) => { if (!(event.target as HTMLElement).closest('.desktop-context')) setContext(null) };
    window.addEventListener('keydown', keyboard);
    window.addEventListener('contextmenu', menu);
    window.addEventListener('pointerdown', close);
    return () => { window.removeEventListener('keydown', keyboard); window.removeEventListener('contextmenu', menu); window.removeEventListener('pointerdown', close) };
  }, []);

  const results = useMemo(() => {
    const value = query.toLowerCase().trim();
    return shellApps.filter((app) => !value || `${app[1]} ${app[3]}`.toLowerCase().includes(value)).slice(0, 8);
  }, [query]);
  const unread = notices.filter((notice) => !notice.read).length;
  const announce = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 1700) };
  const open = (id: string) => { onOpenApp(id); setPalette(false); setQuery(''); setContext(null) };

  return <>
<button className={`shell-notice-trigger ${noticePanel ? 'active' : ''}`} onClick={() => setNoticePanel(!noticePanel)} title="Центр уведомлений">
<span>♢</span>{unread > 0 && <i>{unread}</i>}</button>
    {noticePanel && <aside className="notification-center">
<header>
<div>
<h2>Уведомления</h2>
<span>{unread ? `${unread} новых` : 'Новых нет'}</span>
</div>
<button onClick={() => setNotices((current) => current.map((notice) => ({ ...notice, read: true })))}>Прочитать все</button>
<button onClick={() => setNoticePanel(false)}>×</button>
</header>
<section>{notices.length ? notices.map((notice) =>
<article key={notice.id} className={notice.read ? 'read' : ''} onClick={() => setNotices((current) => current.map((item) => item.id === notice.id ? { ...item, read: true } : item))}>
<span style={{ background: notice.color }}>{notice.icon}</span>
<div>
<header>
<b>{notice.app}</b>
<time>{notice.time}</time>
</header>
<h3>{notice.title}</h3>
<p>{notice.text}</p>
</div>
<button onClick={(event) => { event.stopPropagation(); setNotices((current) => current.filter((item) => item.id !== notice.id)) }}>×</button>
</article>) : <div className="notification-empty">
<span>✓</span>
<h3>Всё спокойно</h3>
<p>Новых уведомлений нет</p>
</div>}</section>
<footer>
<div>
<span>☾</span>
<section>
<b>Не беспокоить</b>
<small>До следующего часа</small>
</section>
<label>
<input type="checkbox"/>
<i/>
</label>
</div>
<button onClick={() => open('settings')}>Параметры уведомлений</button>
</footer>
</aside>}
    {palette && <div className="command-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPalette(false) }}>
<section className="command-palette">
<header>
<span>⌕</span>
<input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти приложение, файл или действие…"/>
<kbd>ESC</kbd>
</header>
<div className="command-hint">
<span>Быстрый запуск</span>
<em>Ctrl + K</em>
</div>
<main>{results.map((app, index) =>
<button key={app[0]} className={index === 0 ? 'selected' : ''} onClick={() => open(app[0])}>
<i>{app[2]}</i>
<span>
<b>{app[1]}</b>
<small>{app[3]}</small>
</span>
<kbd>{index < 5 ? `Alt+${index + 1}` : '↵'}</kbd>
</button>)}</main>
<footer>
<span>
<kbd>↑</kbd>
<kbd>↓</kbd> навигация</span>
<span>
<kbd>↵</kbd> открыть</span>
<span>
<kbd>Esc</kbd> закрыть</span>
</footer>
</section>
</div>}
    {context && <div className="desktop-context" style={{ left: Math.min(context.x, innerWidth - 230), top: Math.min(context.y, innerHeight - 330) }}>
<button onClick={() => announce('Рабочий стол обновлён')}>
<span>↻</span>Обновить<kbd>F5</kbd>
</button>
<button>
<span>▦</span>Вид<i>›</i>
</button>
<button>
<span>⇅</span>Сортировка<i>›</i>
</button>
<hr/>
<button onClick={() => open('board')}>
<span>＋</span>Создать задачу</button>
<button onClick={() => open('notepad')}>
<span>▤</span>Новая заметка</button>
<hr/>
<button onClick={() => open('settings')}>
<span>✦</span>Персонализация</button>
<button onClick={() => open('settings')}>
<span>▱</span>Параметры экрана</button>
<footer>DimaOS 11 · 26H2</footer>
</div>}
    {toast && <div className="shell-toast">
<span>✓</span>{toast}</div>}
  </>;
}
