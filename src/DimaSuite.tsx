import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { usePersistentState } from './storage';

type TaskState = 'ideas' | 'progress' | 'done';
type BoardTask = { id: string; title: string; description: string; state: TaskState; color: string; due: string; priority: 'Низкий' | 'Средний' | 'Высокий'; tags: string[] };

const starterTasks: BoardTask[] = [
  { id: 'welcome', title: 'Исследовать DimaOS 11', description: 'Открыть новые приложения и настроить систему под себя.', state: 'progress', color: '#3d8fe8', due: 'Сегодня', priority: 'Высокий', tags: ['DimaOS', 'Старт'] },
  { id: 'design', title: 'Новая идея интерфейса', description: 'Собрать визуальные идеи и выбрать лучшие решения.', state: 'ideas', color: '#8b63da', due: 'Завтра', priority: 'Средний', tags: ['Дизайн'] },
  { id: 'music', title: 'Собрать плейлист', description: 'Добавить любимые треки в Dima Player.', state: 'ideas', color: '#da5f8b', due: 'Пятница', priority: 'Низкий', tags: ['Музыка'] },
  { id: 'wallpaper', title: 'Выбрать собственные обои', description: 'Загрузить авторский фон через Параметры.', state: 'done', color: '#29a67a', due: 'Выполнено', priority: 'Средний', tags: ['Красота'] },
];

const columns: Array<{ id: TaskState; title: string; icon: string }> = [
  { id: 'ideas', title: 'Идеи', icon: '✦' },
  { id: 'progress', title: 'В работе', icon: '◷' },
  { id: 'done', title: 'Готово', icon: '✓' },
];

export function DimaBoardApp() {
  const [tasks, setTasks] = usePersistentState<BoardTask[]>('board.tasks', starterTasks);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<BoardTask | null>(null);
  const [creatingIn, setCreatingIn] = useState<TaskState | null>(null);
  const [view, setView] = usePersistentState<'board' | 'list'>('board.view', 'board');
  const [dragged, setDragged] = useState<string | null>(null);

  const visible = useMemo(() => tasks.filter((task) => `${task.title} ${task.description} ${task.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [tasks, query]);
  const completed = tasks.filter((task) => task.state === 'done').length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;

  function createTask(state: TaskState, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTasks((current) => [...current, { id: crypto.randomUUID(), title: trimmed, description: 'Добавьте описание задачи', state, color: '#3d8fe8', due: 'Без срока', priority: 'Средний', tags: [] }]);
    setCreatingIn(null);
  }

  function moveTask(id: string, state: TaskState) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, state, due: state === 'done' ? 'Выполнено' : task.due } : task));
  }

  function saveTask(task: BoardTask) {
    setTasks((current) => current.map((item) => item.id === task.id ? task : item));
    setEditing(null);
  }

  function removeTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
    setEditing(null);
  }

  return <div className="dima-board">
<aside className="board-sidebar">
<div className="board-brand">
<span>◆</span>
<div>
<b>Dima Board</b>
<small>Пространство идей</small>
</div>
</div>
<button className="active">
<span>▦</span>Моя доска<em>{tasks.length}</em>
</button>
<button>
<span>☆</span>Избранное</button>
<button>
<span>◷</span>Недавние</button>
<h4>Коллекции</h4>
<button>
<i style={{ background: '#4a91e2' }}/>DimaOS</button>
<button>
<i style={{ background: '#9b64db' }}/>Творчество</button>
<button>
<i style={{ background: '#36aa78' }}/>Личное</button>
<div className="board-progress">
<header>
<span>Прогресс недели</span>
<b>{progress}%</b>
</header>
<div>
<i style={{ width: `${progress}%` }}/>
</div>
<small>{completed} из {tasks.length} задач выполнено</small>
</div>
<footer>
<span>ДК</span>
<div>
<b>Дмитрий</b>
<small>Личная доска</small>
</div>
<button>•••</button>
</footer>
</aside>
<main className="board-main">
<header className="board-header">
<div>
<p>Рабочее пространство / Моя доска</p>
<h1>Большие идеи начинаются здесь <span>✦</span>
</h1>
</div>
<nav>
<label>
<span>⌕</span>
<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск задач"/>
</label>
<button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>▦</button>
<button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>☷</button>
<button className="board-share">＋ Новая задача</button>
</nav>
</header>
<section className="board-stats">
<article>
<span className="blue">✦</span>
<div>
<b>{tasks.length}</b>
<small>Всего задач</small>
</div>
</article>
<article>
<span className="violet">◷</span>
<div>
<b>{tasks.filter((task) => task.state === 'progress').length}</b>
<small>В работе</small>
</div>
</article>
<article>
<span className="green">✓</span>
<div>
<b>{completed}</b>
<small>Выполнено</small>
</div>
</article>
<article>
<span className="orange">⚡</span>
<div>
<b>{tasks.filter((task) => task.priority === 'Высокий').length}</b>
<small>Важные</small>
</div>
</article>
</section>
      {view === 'board' ? <div className="board-columns">{columns.map((column) =>
<section key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged) moveTask(dragged, column.id); setDragged(null) }}>
<header>
<div>
<span>{column.icon}</span>
<h2>{column.title}</h2>
<em>{visible.filter((task) => task.state === column.id).length}</em>
</div>
<button onClick={() => setCreatingIn(column.id)}>＋</button>
</header>
        {creatingIn === column.id && <QuickTask onSave={(title) => createTask(column.id, title)} onCancel={() => setCreatingIn(null)}/>} 
        <div className="board-task-list">{visible.filter((task) => task.state === column.id).map((task) =>
<article key={task.id} draggable onDragStart={() => setDragged(task.id)} onDragEnd={() => setDragged(null)} onClick={() => setEditing(task)} style={{ '--task-color': task.color } as CSSProperties}>
<i/>
<header>
<span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>
<button onClick={(event) => { event.stopPropagation(); setEditing(task) }}>•••</button>
</header>
<h3>{task.title}</h3>
<p>{task.description}</p>
<div className="task-tags">{task.tags.map((tag) =>
<span key={tag}>#{tag}</span>)}</div>
<footer>
<span>{task.state === 'done' ? '✓' : '◷'} {task.due}</span>
<div>
<i>ДК</i>
</div>
</footer>
</article>)}</div>
<button className="add-card" onClick={() => setCreatingIn(column.id)}>＋ Добавить карточку</button>
</section>)}</div> : <div className="board-list">
<header>
<span>Задача</span>
<span>Статус</span>
<span>Приоритет</span>
<span>Срок</span>
</header>{visible.map((task) =>
<button key={task.id} onClick={() => setEditing(task)}>
<span>
<i style={{ background: task.color }}/>
<b>{task.title}</b>
</span>
<em>{columns.find((column) => column.id === task.state)?.title}</em>
<strong>{task.priority}</strong>
<small>{task.due}</small>
</button>)}</div>}
    </main>
    {editing && <TaskEditor task={editing} onSave={saveTask} onDelete={() => removeTask(editing.id)} onClose={() => setEditing(null)}/>} 
  </div>;
}

function QuickTask({ onSave, onCancel }: { onSave: (title: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  return <div className="quick-task">
<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSave(title); if (event.key === 'Escape') onCancel() }} placeholder="Название задачи"/>
<div>
<button onClick={() => onSave(title)}>Добавить</button>
<button onClick={onCancel}>Отмена</button>
</div>
</div>;
}

function TaskEditor({ task, onSave, onDelete, onClose }: { task: BoardTask; onSave: (task: BoardTask) => void; onDelete: () => void; onClose: () => void }) {
  const [draft, setDraft] = useState(task);
  return <div className="task-editor-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
<section className="task-editor">
<header>
<div>
<span style={{ background: draft.color }}/>Карточка задачи</div>
<button onClick={onClose}>×</button>
</header>
<label>Название<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/>
</label>
<label>Описание<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/>
</label>
<div className="task-editor-grid">
<label>Статус<select value={draft.state} onChange={(event) => setDraft({ ...draft, state: event.target.value as TaskState })}>
<option value="ideas">Идеи</option>
<option value="progress">В работе</option>
<option value="done">Готово</option>
</select>
</label>
<label>Приоритет<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as BoardTask['priority'] })}>
<option>Низкий</option>
<option>Средний</option>
<option>Высокий</option>
</select>
</label>
<label>Срок<input value={draft.due} onChange={(event) => setDraft({ ...draft, due: event.target.value })}/>
</label>
<label>Цвет<input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })}/>
</label>
</div>
<label>Теги<input value={draft.tags.join(', ')} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })}/>
</label>
<footer>
<button className="delete" onClick={onDelete}>Удалить</button>
<span/>
<button onClick={onClose}>Отмена</button>
<button className="primary" onClick={() => onSave(draft)}>Сохранить</button>
</footer>
</section>
</div>;
}

const starterCode = `<!doctype html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<style>
      body { margin: 0; font-family: system-ui; background: #07152c; color: white; }
      main { min-height: 100vh; display: grid; place-items: center; text-align: center; }
      .card { padding: 42px; border: 1px solid #398fe8; border-radius: 24px; background: #10284c; }
      h1 { margin: 0; font-size: 42px; background: linear-gradient(90deg,#54b8ff,#b784ff); color: transparent; background-clip: text; }
      button { padding: 11px 18px; border: 0; border-radius: 9px; color: white; background: #2687df; }
    </style>
</head>
<body>
<main>
<div class="card">
<h1>Создано в Dima Code</h1>
<p>Меняйте код слева — результат появится справа.</p>
<button onclick="this.textContent='Работает!'">Проверить</button>
</div>
</main>
</body>
</html>`;

export function DimaCodeApp() {
  const [code, setCode] = usePersistentState('code.document', starterCode);
  const [savedCode, setSavedCode] = useState(code);
  const [activeFile, setActiveFile] = useState('index.html');
  const [consoleLines, setConsoleLines] = useState<string[]>(['Dima Code Studio готов.', 'Предпросмотр запущен в безопасной песочнице.']);
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [theme, setTheme] = usePersistentState<'midnight' | 'aurora'>('code.theme', 'midnight');
  const lines = code.split('\n');
  const textarea = useRef<HTMLTextAreaElement>(null);

  function run() {
    setSavedCode(code);
    setConsoleLines((current) => [...current.slice(-6), `[${new Date().toLocaleTimeString('ru-RU')}] Проект успешно собран за ${18 + Math.floor(Math.random() * 35)} мс.`]);
  }

  function download() {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([code], { type: 'text/html' }));
    anchor.download = 'dima-project.html';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  return <div className={`dima-code ${theme}`}>
<header className="code-top">
<div className="code-logo">⌁</div>
<nav>
<button>Файл</button>
<button>Правка</button>
<button>Вид</button>
<button>Запуск</button>
</nav>
<div className="code-project">
<i/>dima-project <span>— сохранено</span>
</div>
<div className="code-actions">
<button onClick={() => setTheme(theme === 'midnight' ? 'aurora' : 'midnight')}>◐</button>
<button onClick={download}>⇩ Экспорт</button>
<button className="run" onClick={run}>▶ Запустить</button>
</div>
</header>
<div className="code-workspace">
<aside className="code-rail">
<button className={sidebarOpen ? 'active' : ''} onClick={() => setSidebarOpen(!sidebarOpen)}>▱</button>
<button>⌕</button>
<button>⑂</button>
<button>▦</button>
<span/>
<button>⚙</button>
</aside>
      {sidebarOpen && <aside className="code-explorer">
<header>ПРОВОДНИК <button>•••</button>
</header>
<h3>⌄ DIMA-PROJECT</h3>
<button className={activeFile === 'index.html' ? 'active' : ''} onClick={() => setActiveFile('index.html')}>
<i className="html">◇</i>index.html</button>
<button onClick={() => setActiveFile('styles.css')}>
<i className="css">#</i>styles.css</button>
<button onClick={() => setActiveFile('script.js')}>
<i className="js">JS</i>script.js</button>
<h3>⌄ ASSETS</h3>
<button>
<i>▧</i>preview.png</button>
<footer>
<span>СТРУКТУРА</span>
<span>ВРЕМЕННАЯ ШКАЛА</span>
</footer>
</aside>}
      <main className="code-editor-area">
<div className="code-tabs">
<button className="active">
<i className="html">◇</i>{activeFile}<span>×</span>
</button>
<div/>
<button onClick={() => setZoom(Math.max(70, zoom - 10))}>−</button>
<em>{zoom}%</em>
<button onClick={() => setZoom(Math.min(150, zoom + 10))}>＋</button>
</div>
<div className="code-breadcrumbs">dima-project <span>›</span> {activeFile} <span>›</span> document</div>
<section className="code-editor">
<div className="line-numbers">{lines.map((_, index) =>
<span key={index}>{index + 1}</span>)}</div>
<textarea ref={textarea} value={code} onChange={(event) => setCode(event.target.value)} spellCheck={false} style={{ fontSize: `${13 * zoom / 100}px`, lineHeight: `${21 * zoom / 100}px` }} onKeyDown={(event) => { if (event.ctrlKey && event.key === 's') { event.preventDefault(); run() } }}/>
</section>{consoleOpen && <section className="code-console">
<header>
<nav>
<button className="active">ТЕРМИНАЛ</button>
<button>ВЫВОД</button>
<button>ПРОБЛЕМЫ <i>0</i>
</button>
</nav>
<button onClick={() => setConsoleLines([])}>♲</button>
<button onClick={() => setConsoleOpen(false)}>×</button>
</header>
<div>{consoleLines.map((line, index) =>
<p key={`${line}-${index}`}>
<span>{index === consoleLines.length - 1 ? '➜' : '›'}</span>{line}</p>)}<p>
<span>➜</span>
<i className="console-caret"/>
</p>
</div>
</section>}</main>
<aside className="code-preview">
<header>
<div>
<button>‹</button>
<button>›</button>
<button onClick={run}>↻</button>
</div>
<label>
<span>◇</span>preview://dima-project</label>
<button onClick={() => window.open(URL.createObjectURL(new Blob([savedCode], { type: 'text/html' })))}>↗</button>
</header>
<iframe title="Предпросмотр Dima Code" sandbox="allow-scripts" srcDoc={savedCode}/>
<footer>
<span>
<i/> Live Preview</span>
<span>{new Blob([savedCode]).size} байт</span>
</footer>
</aside>
</div>
<footer className="code-status">
<div>
<span>⑂ main*</span>
<span>↻</span>
<span>ⓧ 0</span>
<span>△ 0</span>
</div>
<div>
<span>Ln {lines.length}, Col 1</span>
<span>Пробелы: 2</span>
<span>UTF-8</span>
<span>HTML</span>
<span>⌁ Dima Code</span>
</div>
</footer>
</div>;
}

type Game = 'memory' | 'reaction' | 'sequence';

export function DimaArcadeApp() {
  const [game, setGame] = useState<Game>('memory');
  const [xp, setXp] = usePersistentState('arcade.xp', 1240);
  const [sound, setSound] = usePersistentState('arcade.sound', true);
  const [bestReaction, setBestReaction] = usePersistentState('arcade.reactionBest', 0);
  return <div className="dima-arcade">
<aside className="arcade-sidebar">
<div className="arcade-brand">
<span>✣</span>
<div>
<b>Dima Arcade</b>
<small>Играй. Побеждай. Удивляй.</small>
</div>
</div>
<nav>
<button className={game === 'memory' ? 'active' : ''} onClick={() => setGame('memory')}>
<span>◇</span>
<div>
<b>Нейро-пары</b>
<small>Память и внимание</small>
</div>
</button>
<button className={game === 'reaction' ? 'active' : ''} onClick={() => setGame('reaction')}>
<span>⚡</span>
<div>
<b>Импульс</b>
<small>Скорость реакции</small>
</div>
</button>
<button className={game === 'sequence' ? 'active' : ''} onClick={() => setGame('sequence')}>
<span>◉</span>
<div>
<b>Синтез</b>
<small>Повтори последовательность</small>
</div>
</button>
</nav>
<section className="arcade-profile">
<div className="arcade-avatar">ДК<i>12</i>
</div>
<h3>Игрок Дмитрий</h3>
<p>Уровень 12 · Искатель</p>
<div>
<i style={{ width: '68%' }}/>
</div>
<small>{xp} / 1800 XP</small>
</section>
<footer>
<button onClick={() => setSound(!sound)}>{sound ? '♪ Звук включён' : '♩ Без звука'}</button>
<button>⚙</button>
</footer>
</aside>
<main className="arcade-main">
<header>
<div>
<p>АРКАДНЫЙ ЦЕНТР</p>
<h1>{game === 'memory' ? 'Нейро-пары' : game === 'reaction' ? 'Импульс' : 'Синтез'}</h1>
</div>
<section>
<article>
<span>★</span>
<div>
<b>{xp.toLocaleString('ru-RU')}</b>
<small>Всего XP</small>
</div>
</article>
<article>
<span>♜</span>
<div>
<b>#42</b>
<small>Рейтинг</small>
</div>
</article>
<button>🏆 Достижения</button>
</section>
</header>{game === 'memory' && <MemoryGame onWin={(score) => setXp((value) => value + score)}/>} {game === 'reaction' && <ReactionGame best={bestReaction} onBest={setBestReaction} onScore={(score) => setXp((value) => value + score)}/>} {game === 'sequence' && <SequenceGame onScore={(score) => setXp((value) => value + score)}/>}</main>
</div>;
}

function MemoryGame({ onWin }: { onWin: (score: number) => void }) {
  const symbols = ['◆', '✦', '◉', '⌁', '⚡', '◇', '✣', '♜'];
  const [cards, setCards] = useState(() => [...symbols, ...symbols].sort(() => Math.random() - .5).map((symbol, index) => ({ id: index, symbol, open: false, found: false })));
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(Date.now());
  const [time, setTime] = useState(0);
  const [won, setWon] = useState(false);
  useEffect(() => { const timer = window.setInterval(() => setTime(Math.floor((Date.now() - started) / 1000)), 1000); return () => clearInterval(timer) }, [started]);
  const reset = () => { setCards([...symbols, ...symbols].sort(() => Math.random() - .5).map((symbol, index) => ({ id: index, symbol, open: false, found: false }))); setMoves(0); setStarted(Date.now()); setWon(false) };
  const flip = (id: number) => {
    if (won || cards.filter((card) => card.open && !card.found).length >= 2) return;
    const target = cards.find((card) => card.id === id);
    if (!target || target.open || target.found) return;
    const next = cards.map((card) => card.id === id ? { ...card, open: true } : card);
    setCards(next);
    const opened = next.filter((card) => card.open && !card.found);
    if (opened.length === 2) {
      setMoves((value) => value + 1);
      window.setTimeout(() => setCards((current) => {
        const match = opened[0].symbol === opened[1].symbol;
        const updated = current.map((card) => opened.some((item) => item.id === card.id) ? { ...card, open: match, found: match } : card);
        if (match && updated.every((card) => card.found)) { setWon(true); onWin(Math.max(50, 400 - moves * 12)) }
        return updated;
      }), 650);
    }
  };
  return <section className="arcade-game memory-game">
<div className="game-stage">
<div className="game-toolbar">
<span>
<i>◷</i>
<b>{Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}</b>
<small>Время</small>
</span>
<span>
<i>↻</i>
<b>{moves}</b>
<small>Ходы</small>
</span>
<span>
<i>✓</i>
<b>{cards.filter((card) => card.found).length / 2}/8</b>
<small>Пары</small>
</span>
<button onClick={reset}>Новая игра</button>
</div>
<div className="memory-grid">{cards.map((card) =>
<button key={card.id} className={`${card.open || card.found ? 'open' : ''} ${card.found ? 'found' : ''}`} onClick={() => flip(card.id)}>
<span>✣</span>
<b>{card.symbol}</b>
</button>)}</div>{won && <div className="game-win">
<span>🏆</span>
<h2>Великолепно!</h2>
<p>Все пары найдены за {moves} ходов.</p>
<button onClick={reset}>Играть ещё</button>
</div>}</div>
<GameMission title="Мастер памяти" description="Найдите все пары меньше чем за 20 ходов" progress={Math.min(100, cards.filter((card) => card.found).length / 16 * 100)}/>
</section>;
}

function ReactionGame({ best, onBest, onScore }: { best: number; onBest: (value: number) => void; onScore: (value: number) => void }) {
  const [state, setState] = useState<'idle' | 'waiting' | 'ready' | 'result' | 'early'>('idle');
  const [result, setResult] = useState(0);
  const started = useRef(0);
  const timer = useRef<number | null>(null);
  const begin = () => { setState('waiting'); timer.current = window.setTimeout(() => { started.current = performance.now(); setState('ready') }, 1200 + Math.random() * 2600) };
  const hit = () => {
    if (state === 'idle' || state === 'result' || state === 'early') { begin(); return }
    if (state === 'waiting') { if (timer.current) clearTimeout(timer.current); setState('early'); return }
    const value = Math.round(performance.now() - started.current); setResult(value); setState('result'); if (!best || value < best) onBest(value); onScore(Math.max(5, Math.round((500 - value) / 5)));
  };
  return <section className="arcade-game reaction-game">
<div className={`reaction-pad ${state}`} onClick={hit}>
<div className="reaction-rings">
<i/>
<i/>
<i/>
<span>{state === 'ready' ? '⚡' : state === 'waiting' ? '…' : state === 'result' ? `${result}` : state === 'early' ? '!' : '▶'}</span>
</div>
<h2>{state === 'idle' ? 'Нажмите, чтобы начать' : state === 'waiting' ? 'Ждите зелёного сигнала…' : state === 'ready' ? 'ЖМИТЕ!' : state === 'result' ? `${result} мс` : 'Слишком рано!'}</h2>
<p>{state === 'result' ? result < 200 ? 'Невероятная реакция!' : result < 280 ? 'Отличный результат!' : 'Попробуйте ещё раз' : state === 'early' ? 'Дождитесь сигнала и попробуйте снова' : 'Проверьте скорость своей реакции'}</p>
</div>
<div className="reaction-stats">
<article>
<span>⚡</span>
<div>
<b>{best ? `${best} мс` : '—'}</b>
<small>Личный рекорд</small>
</div>
</article>
<article>
<span>◎</span>
<div>
<b>250 мс</b>
<small>Средний результат</small>
</div>
</article>
<article>
<span>♜</span>
<div>
<b>{best && best < 230 ? 'Элита' : 'Новичок'}</b>
<small>Класс реакции</small>
</div>
</article>
</div>
</section>;
}

function SequenceGame({ onScore }: { onScore: (score: number) => void }) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [input, setInput] = useState<number[]>([]);
  const [flash, setFlash] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'showing' | 'playing' | 'lost'>('idle');
  const startRound = (base = sequence) => {
    const next = [...base, Math.floor(Math.random() * 4)]; setSequence(next); setInput([]); setStatus('showing'); next.forEach((value, index) => window.setTimeout(() => { setFlash(value); window.setTimeout(() => setFlash(null), 330); if (index === next.length - 1) window.setTimeout(() => setStatus('playing'), 430) }, index * 650));
  };
  const press = (value: number) => {
    if (status !== 'playing') return; setFlash(value); window.setTimeout(() => setFlash(null), 180); const next = [...input, value]; setInput(next); if (sequence[next.length - 1] !== value) { setStatus('lost'); return } if (next.length === sequence.length) { onScore(sequence.length * 12); window.setTimeout(() => startRound(sequence), 500) }
  };
  return <section className="arcade-game sequence-game">
<div className="sequence-copy">
<p>УРОВЕНЬ</p>
<strong>{sequence.length || 1}</strong>
<h2>{status === 'idle' ? 'Запомните ритм' : status === 'showing' ? 'Смотрите внимательно…' : status === 'playing' ? 'Теперь повторите' : 'Последовательность потеряна'}</h2>
<span>Каждый раунд добавляет один новый сигнал.</span>
<button onClick={() => { setSequence([]); startRound([]) }}>{status === 'idle' || status === 'lost' ? 'Начать игру' : 'Начать заново'}</button>
</div>
<div className="sequence-orbit">
<div className="sequence-core">
<span>{status === 'showing' ? '◉' : status === 'playing' ? '✦' : '◆'}</span>
</div>{[0,1,2,3].map((value) =>
<button key={value} className={`tone tone-${value} ${flash === value ? 'flash' : ''}`} onClick={() => press(value)}>
<i>{['◆','●','▲','■'][value]}</i>
</button>)}</div>
<GameMission title="Синтетический разум" description="Повторите последовательность из 12 сигналов" progress={Math.min(100, sequence.length / 12 * 100)}/>
</section>;
}

function GameMission({ title, description, progress }: { title: string; description: string; progress: number }) {
  return <aside className="game-mission">
<span>ЕЖЕДНЕВНАЯ МИССИЯ</span>
<h3>{title}</h3>
<p>{description}</p>
<div>
<i style={{ width: `${progress}%` }}/>
</div>
<footer>
<b>{Math.round(progress)}%</b>
<em>＋250 XP</em>
</footer>
</aside>;
}
