import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { usePersistentState } from './storage';

type WidgetId = 'weather' | 'focus' | 'calendar' | 'system' | 'photos' | 'notes';

type WidgetDefinition = {
  id: WidgetId;
  title: string;
  icon: string;
  color: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenApp: (id: string) => void;
};

const definitions: WidgetDefinition[] = [
  { id: 'weather', title: 'Погода', icon: '☀', color: '#3699ce' },
  { id: 'focus', title: 'Фокус', icon: '◉', color: '#7958ca' },
  { id: 'calendar', title: 'Календарь', icon: '▦', color: '#e25367' },
  { id: 'system', title: 'Система', icon: '⌁', color: '#3483b7' },
  { id: 'photos', title: 'Фотографии', icon: '▧', color: '#31a89d' },
  { id: 'notes', title: 'Быстрая заметка', icon: '▤', color: '#e6a937' },
];

const months = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

export default function DesktopWidgets({ open, onClose, onOpenApp }: Props) {
  const [enabled, setEnabled] = usePersistentState<WidgetId[]>('widgets.enabled', [
    'weather',
    'focus',
    'calendar',
    'system',
    'notes',
  ]);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(new Date());
  const [note, setNote] = usePersistentState('widgets.note', 'Записать новую идею для DimaOS…');
  const [focusMinutes, setFocusMinutes] = usePersistentState('widgets.focusMinutes', 25);
  const [focusLeft, setFocusLeft] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setFocusLeft(focusMinutes * 60);
  }, [focusMinutes]);

  useEffect(() => {
    if (!focusRunning) return;
    const timer = window.setInterval(() => {
      setFocusLeft((value) => {
        if (value <= 1) {
          setFocusRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [focusRunning]);

  const filtered = useMemo(
    () => definitions.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  function toggleWidget(id: WidgetId) {
    setEnabled((value) =>
      value.includes(id)
        ? value.filter((item) => item !== id)
        : [...value, id],
    );
  }

  if (!open) return null;

  return (
    <div className="widgets-backdrop" onPointerDown={onClose}>
      <aside className="widgets-panel" onPointerDown={(event) => event.stopPropagation()}>
        <header className="widgets-header">
          <div className="widgets-profile">ДК</div>
          <div>
            <b>Добрый день, Дмитрий</b>
            <span>{now.getDate()} {months[now.getMonth()]}</span>
          </div>
          <button onClick={() => setEditing(!editing)}>＋</button>
          <button onClick={() => setEditing(!editing)}>⚙</button>
          <button onClick={onClose}>×</button>
        </header>

        {editing && (
          <section className="widget-picker">
            <header>
              <h2>Добавить виджеты</h2>
              <label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти виджет" /></label>
            </header>
            <div>
              {filtered.map((item) => (
                <button key={item.id} onClick={() => toggleWidget(item.id)}>
                  <i style={{ background: item.color }}>{item.icon}</i>
                  <span><b>{item.title}</b><small>DimaOS</small></span>
                  <em>{enabled.includes(item.id) ? '✓' : '＋'}</em>
                </button>
              ))}
            </div>
          </section>
        )}

        <main className="widgets-grid">
          {enabled.includes('weather') && (
            <article className="desktop-widget widget-weather" onDoubleClick={() => onOpenApp('weather')}>
              <header><span>Погода · Москва</span><button>•••</button></header>
              <div><strong>22°</strong><i>☀</i></div>
              <h3>Переменная облачность</h3>
              <p>Ощущается как 21°</p>
              <footer><span>Ср<br /><b>24°</b></span><span>Чт<br /><b>22°</b></span><span>Пт<br /><b>19°</b></span><span>Сб<br /><b>23°</b></span></footer>
            </article>
          )}

          {enabled.includes('focus') && (
            <article className="desktop-widget widget-focus">
              <header><span>Сеанс продуктивности</span><button>•••</button></header>
              <div className="widget-focus-time">
                <strong>{String(Math.floor(focusLeft / 60)).padStart(2, '0')}:{String(focusLeft % 60).padStart(2, '0')}</strong>
                <span>{focusRunning ? 'Не отвлекайтесь' : 'Готовы начать?'}</span>
              </div>
              <input type="range" min="5" max="60" step="5" value={focusMinutes} onChange={(event) => setFocusMinutes(Number(event.target.value))} disabled={focusRunning} />
              <button className="widget-primary" onClick={() => setFocusRunning(!focusRunning)}>{focusRunning ? 'Приостановить' : '▶ Начать'}</button>
            </article>
          )}

          {enabled.includes('calendar') && (
            <article className="desktop-widget widget-calendar" onDoubleClick={() => onOpenApp('clock')}>
              <header><span>Календарь</span><button>•••</button></header>
              <div className="widget-date"><strong>{now.getDate()}</strong><span>{months[now.getMonth()]}<br />{now.toLocaleDateString('ru-RU', { weekday: 'long' })}</span></div>
              <div className="widget-event"><i /><span><b>Работа над DimaOS</b><small>Сегодня · весь день</small></span></div>
              <div className="widget-event purple"><i /><span><b>Время для отдыха</b><small>19:00 – 20:00</small></span></div>
            </article>
          )}

          {enabled.includes('system') && (
            <article className="desktop-widget widget-system" onDoubleClick={() => onOpenApp('taskmanager')}>
              <header><span>Производительность</span><button>•••</button></header>
              <div className="system-rings"><div style={{ '--value': '17%' } as CSSProperties}><span><b>17%</b>ЦП</span></div><div style={{ '--value': '48%' } as CSSProperties}><span><b>48%</b>RAM</span></div><div style={{ '--value': '11%' } as CSSProperties}><span><b>11%</b>GPU</span></div></div>
              <footer>Система работает нормально <b>✓</b></footer>
            </article>
          )}

          {enabled.includes('photos') && (
            <article className="desktop-widget widget-photos" onDoubleClick={() => onOpenApp('photos')}>
              <header><span>Воспоминания</span><button>•••</button></header>
              <div className="widget-photo-art"><i /><i /><i /></div>
              <footer><b>Этот день</b><span>Посмотрите фотографии</span></footer>
            </article>
          )}

          {enabled.includes('notes') && (
            <article className="desktop-widget widget-note">
              <header><span>Быстрая заметка</span><button onClick={() => setNote('')}>×</button></header>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} />
              <footer><span>Сохранено автоматически</span><button onClick={() => onOpenApp('notepad')}>Открыть в Блокноте ↗</button></footer>
            </article>
          )}
        </main>

        <footer className="widgets-footer">
          <span>Контент персонализирован для вас</span>
          <button onClick={() => setEditing(!editing)}>Настроить виджеты</button>
        </footer>
      </aside>
    </div>
  );
}
