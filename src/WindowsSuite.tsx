import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent,
} from 'react';
import { usePersistentState } from './storage';

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  id: string;
  tool: 'brush' | 'eraser' | 'line';
  color: string;
  size: number;
  points: Point[];
};

const palette = [
  '#111827',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export function PaintApp() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redo, setRedo] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Stroke['tool']>('brush');
  const [color, setColor] = useState('#111827');
  const [size, setSize] = useState(6);
  const [drawing, setDrawing] = useState<Stroke | null>(null);
  const [zoom, setZoom] = useState(100);
  const [fileName, setFileName] = useState('Без имени');
  const [showGrid, setShowGrid] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  function render() {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, element.width, element.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, element.width, element.height);

    for (const stroke of drawing ? [...strokes, drawing] : strokes) {
      if (stroke.points.length < 1) continue;
      context.save();
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = stroke.size;
      context.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      if (stroke.tool === 'line') {
        const last = stroke.points[stroke.points.length - 1] || stroke.points[0];
        context.lineTo(last.x, last.y);
      } else {
        stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      }
      context.stroke();
      context.restore();
    }

    if (showGrid) {
      context.save();
      context.strokeStyle = 'rgba(80, 100, 130, 0.12)';
      context.lineWidth = 1;
      for (let x = 0; x < element.width; x += 20) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, element.height);
        context.stroke();
      }
      for (let y = 0; y < element.height; y += 20) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(element.width, y);
        context.stroke();
      }
      context.restore();
    }
  }

  useEffect(render, [strokes, drawing, showGrid]);

  function coordinates(event: PointerEvent<HTMLCanvasElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (event.currentTarget.width / bounds.width),
      y: (event.clientY - bounds.top) * (event.currentTarget.height / bounds.height),
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawing({
      id: crypto.randomUUID(),
      tool,
      color,
      size,
      points: [coordinates(event)],
    });
  }

  function continueDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const point = coordinates(event);
    setDrawing((value) => value ? {
      ...value,
      points: value.tool === 'line' ? [value.points[0], point] : [...value.points, point],
    } : null);
  }

  function finishDrawing() {
    if (!drawing) return;
    setStrokes((value) => [...value, drawing]);
    setDrawing(null);
    setRedo([]);
  }

  function undo() {
    setStrokes((value) => {
      const last = value[value.length - 1];
      if (last) setRedo((future) => [...future, last]);
      return value.slice(0, -1);
    });
  }

  function redoStroke() {
    setRedo((value) => {
      const last = value[value.length - 1];
      if (last) setStrokes((past) => [...past, last]);
      return value.slice(0, -1);
    });
  }

  function save() {
    const element = canvas.current;
    if (!element) return;
    element.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${fileName || 'Dima Paint'}.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function importImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !canvas.current) return;
    const image = new Image();
    image.onload = () => {
      const context = canvas.current?.getContext('2d');
      if (!context || !canvas.current) return;
      context.drawImage(image, 0, 0, canvas.current.width, canvas.current.height);
      URL.revokeObjectURL(image.src);
      setFileName(file.name.replace(/\.[^.]+$/, ''));
    };
    image.src = URL.createObjectURL(file);
  }

  return (
    <div className="paint-app">
<input ref={imageInput} type="file" accept="image/*" hidden onChange={importImage} />
<div className="paint-menu">
<button onClick={() => imageInput.current?.click()}>Файл</button>
<button onClick={undo} disabled={!strokes.length}>↶</button>
<button onClick={redoStroke} disabled={!redo.length}>↷</button>
<input value={fileName} onChange={(event) => setFileName(event.target.value)} />
<span>Сохранено локально</span>
</div>
<div className="paint-ribbon">
<section>
<button className={tool === 'brush' ? 'active' : ''} onClick={() => setTool('brush')}>
<i>✎</i>
<span>Кисть</span>
</button>
<button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')}>
<i>▱</i>
<span>Ластик</span>
</button>
<button className={tool === 'line' ? 'active' : ''} onClick={() => setTool('line')}>
<i>╱</i>
<span>Линия</span>
</button>
</section>
<section className="paint-size">
<label>Размер<input type="range" min="1" max="40" value={size} onChange={(event) => setSize(Number(event.target.value))} />
</label>
<strong style={{ width: Math.max(4, size), height: Math.max(4, size), background: tool === 'eraser' ? '#ffffff' : color }} />
</section>
<section className="paint-palette">
          {palette.map((item) =>
<button key={item} className={color === item ? 'active' : ''} style={{ background: item }} onClick={() => setColor(item)} />)}
          <label>
<input type="color" value={color} onChange={(event) => setColor(event.target.value)} />＋</label>
</section>
<section className="paint-actions">
<button onClick={() => setShowGrid(!showGrid)} className={showGrid ? 'active' : ''}>▦ Сетка</button>
<button onClick={() => { setStrokes([]); setRedo([]); }}>Очистить</button>
<button className="paint-save" onClick={save}>Сохранить PNG</button>
</section>
</div>
<div className="paint-workspace">
<canvas
          ref={canvas}
          width="1200"
          height="760"
          style={{ width: `${zoom}%` }}
          onPointerDown={startDrawing}
          onPointerMove={continueDrawing}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
        />
</div>
<footer>
<span>1200 × 760 пикселей</span>
<span>{strokes.length} действий</span>
<div />
<button onClick={() => setZoom(Math.max(30, zoom - 10))}>−</button>
<input type="range" min="30" max="180" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
<button onClick={() => setZoom(Math.min(180, zoom + 10))}>＋</button>
<span>{zoom}%</span>
</footer>
</div>
  );
}

type Alarm = {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
  days: string;
};

export function ClockApp() {
  const [tab, setTab] = useState<'focus' | 'timer' | 'alarm' | 'stopwatch' | 'world'>('focus');
  const [now, setNow] = useState(new Date());
  const [stopwatch, setStopwatch] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const [timerLength, setTimerLength] = useState(25 * 60);
  const [timerLeft, setTimerLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [alarms, setAlarms] = usePersistentState<Alarm[]>('clock.alarms', [
    { id: 'morning', label: 'Доброе утро', time: '07:30', enabled: true, days: 'Пн–Пт' },
    { id: 'weekend', label: 'Выходной', time: '09:00', enabled: false, days: 'Сб, Вс' },
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setStopwatch((value) => value + 10), 10);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!timerRunning) return;
    const timer = window.setInterval(() => {
      setTimerLeft((value) => {
        if (value <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timerRunning]);

  const stopwatchText = `${String(Math.floor(stopwatch / 60000)).padStart(2, '0')}:${String(Math.floor(stopwatch / 1000) % 60).padStart(2, '0')}.${String(Math.floor(stopwatch / 10) % 100).padStart(2, '0')}`;
  const timerPercent = 1 - timerLeft / Math.max(timerLength, 1);

  return (
    <div className="clock-app">
<aside>
<h2>Часы</h2>
<button className={tab === 'focus' ? 'active' : ''} onClick={() => setTab('focus')}>
<i>◉</i>Сеансы продуктивности</button>
<button className={tab === 'timer' ? 'active' : ''} onClick={() => setTab('timer')}>
<i>◷</i>Таймер</button>
<button className={tab === 'alarm' ? 'active' : ''} onClick={() => setTab('alarm')}>
<i>⌁</i>Будильник</button>
<button className={tab === 'stopwatch' ? 'active' : ''} onClick={() => setTab('stopwatch')}>
<i>◴</i>Секундомер</button>
<button className={tab === 'world' ? 'active' : ''} onClick={() => setTab('world')}>
<i>◎</i>Мировое время</button>
<div />
<button>
<i>⚙</i>Параметры</button>
</aside>
<main>
        {tab === 'focus' && <section className="focus-view">
<header>
<h1>Готовы сосредоточиться?</h1>
<p>Работайте без отвлечений и делайте регулярные перерывы.</p>
</header>
<div className="focus-card">
<div className="focus-ring">
<span>25</span>
<small>минут</small>
</div>
<div>
<h2>Сеанс продуктивности</h2>
<label>Продолжительность<input type="range" min="5" max="90" step="5" value={timerLength / 60} onChange={(event) => { const seconds = Number(event.target.value) * 60; setTimerLength(seconds); setTimerLeft(seconds); }} />
</label>
<p>Перерыв: 5 минут · 1 сеанс</p>
<button onClick={() => { setTab('timer'); setTimerRunning(true); }}>▶ Начать сеанс</button>
</div>
</div>
<div className="focus-stats">
<article>
<span>Сегодня</span>
<strong>0</strong>
<small>минут концентрации</small>
</article>
<article>
<span>Серия</span>
<strong>0</strong>
<small>дней подряд</small>
</article>
<article>
<span>Цель</span>
<strong>60</strong>
<small>минут в день</small>
</article>
</div>
</section>}
        {tab === 'timer' && <section className="timer-view">
<h1>Таймер</h1>
<div className="timer-dial" style={{ '--progress': `${timerPercent * 360}deg` } as CSSProperties}>
<div>
<strong>{String(Math.floor(timerLeft / 60)).padStart(2, '0')}:{String(timerLeft % 60).padStart(2, '0')}</strong>
<span>Сеанс DimaOS</span>
</div>
</div>
<div className="clock-controls">
<button onClick={() => setTimerRunning(!timerRunning)}>{timerRunning ? 'Ⅱ' : '▶'}</button>
<button onClick={() => { setTimerRunning(false); setTimerLeft(timerLength); }}>↻</button>
</div>
<div className="quick-timers">{[1, 5, 10, 25, 45, 60].map((minutes) =>
<button onClick={() => { setTimerLength(minutes * 60); setTimerLeft(minutes * 60); setTimerRunning(false); }}>{minutes} мин</button>)}</div>
</section>}
        {tab === 'stopwatch' && <section className="stopwatch-view">
<h1>Секундомер</h1>
<div className="stopwatch-dial">
<span>{stopwatchText}</span>
</div>
<div className="clock-controls">
<button onClick={() => setRunning(!running)}>{running ? 'Ⅱ' : '▶'}</button>
<button onClick={() => running && setLaps((value) => [...value, stopwatch])}>⚑</button>
<button onClick={() => { setRunning(false); setStopwatch(0); setLaps([]); }}>↻</button>
</div>
<div className="lap-list">{laps.map((lap, index) =>
<div>
<span>Круг {index + 1}</span>
<b>{`${String(Math.floor(lap / 60000)).padStart(2, '0')}:${String(Math.floor(lap / 1000) % 60).padStart(2, '0')}.${String(Math.floor(lap / 10) % 100).padStart(2, '0')}`}</b>
</div>)}</div>
</section>}
        {tab === 'alarm' && <section className="alarm-view">
<header>
<h1>Будильник</h1>
<button onClick={() => setAlarms((value) => [...value, { id: crypto.randomUUID(), label: 'Новый будильник', time: '08:00', enabled: true, days: 'Один раз' }])}>＋ Добавить</button>
</header>
<div className="alarm-grid">{alarms.map((alarm) =>
<article>
<time>{alarm.time}</time>
<div>
<b>{alarm.label}</b>
<span>{alarm.days}</span>
</div>
<label>
<input type="checkbox" checked={alarm.enabled} onChange={() => setAlarms((value) => value.map((item) => item.id === alarm.id ? { ...item, enabled: !item.enabled } : item))} />
<i />
</label>
<button onClick={() => setAlarms((value) => value.filter((item) => item.id !== alarm.id))}>×</button>
</article>)}</div>
</section>}
        {tab === 'world' && <section className="world-view">
<header>
<h1>Мировое время</h1>
<p>{now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
</header>
<div className="world-map">
<div className="world-globe">◎</div>{[['Москва', 0], ['Лондон', -3], ['Нью-Йорк', -7], ['Токио', 6]].map(([city, offset]) => { const date = new Date(now.getTime() + Number(offset) * 3600000); return <article>
<span>{city}</span>
<strong>{date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</strong>
<small>{Number(offset) === 0 ? 'Текущее расположение' : `${Number(offset) > 0 ? '+' : ''}${offset} ч.`}</small>
</article>})}</div>
</section>}
      </main>
</div>
  );
}

type Forecast = {
  day: string;
  icon: string;
  high: number;
  low: number;
  condition: string;
};

const forecast: Forecast[] = [
  { day: 'Сегодня', icon: '☀', high: 24, low: 15, condition: 'Ясно' },
  { day: 'Завтра', icon: '☁', high: 22, low: 14, condition: 'Облачно' },
  { day: 'Пятница', icon: '☂', high: 19, low: 12, condition: 'Дождь' },
  { day: 'Суббота', icon: '☀', high: 23, low: 13, condition: 'Солнечно' },
  { day: 'Воскресенье', icon: '◐', high: 21, low: 14, condition: 'Переменно' },
  { day: 'Понедельник', icon: '☁', high: 20, low: 11, condition: 'Облачно' },
  { day: 'Вторник', icon: '☀', high: 25, low: 15, condition: 'Ясно' },
];

export function WeatherApp() {
  const [city, setCity] = usePersistentState('weather.city', 'Москва');
  const [search, setSearch] = useState('');
  const [unit, setUnit] = usePersistentState<'c' | 'f'>('weather.unit', 'c');
  const value = (celsius: number) => unit === 'c' ? celsius : Math.round(celsius * 1.8 + 32);
  return (
    <div className="weather-app">
<header>
<div>
<span className="weather-logo">☀</span>
<b>Погода DimaOS</b>
</div>
<form onSubmit={(event) => { event.preventDefault(); if (search.trim()) { setCity(search.trim()); setSearch(''); } }}>
<span>⌕</span>
<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти город" />
</form>
<button onClick={() => setUnit(unit === 'c' ? 'f' : 'c')}>°{unit.toUpperCase()}</button>
<button>⚙</button>
</header>
<main>
<section className="weather-hero">
<div className="weather-sky">
<i className="sun"/>
<i className="cloud one"/>
<i className="cloud two"/>
</div>
<div className="weather-location">
<span>⌖ {city}</span>
<h1>{value(22)}°</h1>
<h2>Переменная облачность</h2>
<p>Ощущается как {value(21)}° · Ветер 2 м/с</p>
</div>
<div className="weather-today">
<span>Сегодня</span>
<strong>{value(24)}° / {value(15)}°</strong>
<p>Вероятность осадков: 10%</p>
</div>
</section>
<section className="hourly-weather">
<header>
<h2>Почасовой прогноз</h2>
<span>Следующие 12 часов</span>
</header>
<div>{Array.from({ length: 12 }, (_, index) => { const hour = new Date(Date.now() + index * 3600000); return <article>
<time>{hour.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time>
<i>{index > 5 ? '◐' : '☀'}</i>
<strong>{value(22 + Math.round(Math.sin(index / 3) * 3))}°</strong>
<small>{index % 4 === 0 ? '10%' : '0%'}</small>
</article>})}</div>
</section>
<section className="weather-details">
<article>
<span>Ветер</span>
<strong>2,4 м/с</strong>
<div className="wind-compass">↑</div>
<small>Северо-западный</small>
</article>
<article>
<span>Влажность</span>
<strong>54%</strong>
<div className="humidity-gauge">
<i style={{ height: '54%' }} />
</div>
<small>Комфортная</small>
</article>
<article>
<span>Видимость</span>
<strong>16 км</strong>
<div className="visibility-icon">◉</div>
<small>Отличная</small>
</article>
<article>
<span>Давление</span>
<strong>752 мм</strong>
<div className="pressure-chart">⌁</div>
<small>Стабильное</small>
</article>
</section>
<section className="weekly-weather">
<h2>Прогноз на 7 дней</h2>{forecast.map((item) =>
<article>
<b>{item.day}</b>
<i>{item.icon}</i>
<span>{item.condition}</span>
<div>
<strong>{value(item.high)}°</strong>
<small>{value(item.low)}°</small>
</div>
<em>
<i style={{ left: `${(item.low - 8) * 4}%`, width: `${(item.high - item.low) * 4}%` }} />
</em>
</article>)}</section>
</main>
</div>
  );
}
