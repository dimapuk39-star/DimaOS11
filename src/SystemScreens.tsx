import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { usePersistentState } from './storage';

export type SystemMode = 'desktop' | 'locked' | 'sleep';

type SystemScreensProps = {
  mode: SystemMode;
  wallpaper: number;
  customWallpaper: string;
  onMode: (mode: SystemMode) => void;
  onRestart: () => void;
};

const lockNotices = [
  { icon: '◆', color: '#6457d2', app: 'Dima Board', title: 'Одна важная задача на сегодня', time: '5 мин' },
  { icon: '◇', color: '#397bd0', app: 'Dima Connect', title: 'Алексей: Договорились ✦', time: '12 мин' },
  { icon: '↻', color: '#258d83', app: 'DimaOS', title: 'Система обновлена до версии 26H2', time: '25 мин' },
];

export default function SystemScreens({ mode, wallpaper, customWallpaper, onMode, onRestart }: SystemScreensProps) {
  const [stage, setStage] = useState<'glance' | 'signin'>('glance');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [sleepClock, setSleepClock] = useState(false);
  const [waking, setWaking] = useState(false);
  const [selectedUser, setSelectedUser] = useState<'dmitry' | 'guest'>('dmitry');
  const [pinCode] = usePersistentState('security.pin', '1111');
  const pinInput = useRef<HTMLInputElement>(null);

  const backdropStyle = customWallpaper ? {
    backgroundImage: `linear-gradient(rgba(3, 12, 28, .2), rgba(3, 12, 28, .35)), url(${customWallpaper})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } as CSSProperties : undefined;

  const stars = useMemo(() => Array.from({ length: 42 }, (_, index) => ({
    id: index,
    left: (index * 37 + 11) % 100,
    top: (index * 61 + 7) % 100,
    size: 1 + index % 3,
    delay: (index % 9) * .23,
  })), []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (mode === 'locked') {
      setStage('glance');
      setPin('');
      setError('');
    }
    if (mode === 'sleep') {
      setSleepClock(false);
      setWaking(false);
      const reveal = window.setTimeout(() => setSleepClock(true), 1800);
      return () => window.clearTimeout(reveal);
    }
  }, [mode]);

  useEffect(() => {
    if (stage === 'signin') window.setTimeout(() => pinInput.current?.focus(), 120);
  }, [stage]);

  useEffect(() => {
    if (mode === 'desktop') return;
    const keyboard = (event: KeyboardEvent) => {
      if (mode === 'sleep') {
        event.preventDefault();
        wake();
        return;
      }
      if (stage === 'glance') {
        if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) setStage('signin');
        return;
      }
      if (event.key === 'Escape') setStage('glance');
    };
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [mode, stage]);

  function wake() {
    if (waking) return;
    setWaking(true);
    window.setTimeout(() => {
      onMode('locked');
      setWaking(false);
    }, 680);
  }

  function unlock() {
    if (selectedUser === 'guest' || pin === pinCode) {
      setError('');
      setPin('');
      onMode('desktop');
      return;
    }
    setError('Неверный PIN-код. Подсказка: 1111');
    setPin('');
    setShaking(true);
    window.setTimeout(() => setShaking(false), 520);
    window.setTimeout(() => pinInput.current?.focus(), 30);
  }

  if (mode === 'desktop') return null;

  if (mode === 'sleep') return <div className={`sleep-screen ${waking ? 'waking' : ''}`} onPointerDown={wake}>
<div className="sleep-vignette"/>
<div className="sleep-stars">{stars.map((star) =>
<i key={star.id} style={{ left: `${star.left}%`, top: `${star.top}%`, width: star.size, height: star.size, animationDelay: `${star.delay}s` }}/>)}</div>
<div className="sleep-orb">
<i/>
<i/>
<i/>
<span>D</span>
</div>
<section className={sleepClock ? 'visible' : ''}>
<time>{clock.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time>
<p>DimaOS находится в спящем режиме</p>
<small>Нажмите любую клавишу или коснитесь экрана для пробуждения</small>
</section>
<footer>
<span>◉ Система работает в режиме низкого энергопотребления</span>
<div>⌁　♬　🔋 96%</div>
</footer>
    {waking && <div className="sleep-wake-message">
<span>D</span>
<p>Пробуждение…</p>
<div>
<i/>
<i/>
<i/>
</div>
</div>}
  </div>;

  return <div className={`lock-screen wallpaper-${wallpaper} stage-${stage}`} style={backdropStyle}>
<div className="lock-depth depth-one"/>
<div className="lock-depth depth-two"/>
<header className="lock-topbar">
<div>
<span>◉</span>DimaOS Spotlight</div>
<section>
<span>⌁</span>
<span>♬</span>
<span>🔋 96%</span>
</section>
</header>
<section className="lock-glance" onPointerDown={() => setStage('signin')}>
<div className="lock-clock">
<time>{clock.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time>
<p>{clock.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
</div>
<div className="lock-dashboard">
<article className="lock-weather">
<header>
<span>Москва</span>
<i>···</i>
</header>
<main>
<strong>18°</strong>
<div>
<span>☀</span>
<p>Ясно<br/>
<small>Ощущается как 17°</small>
</p>
</div>
</main>
<footer>
<span>Ср　19°</span>
<span>Чт　21°</span>
<span>Пт　17°</span>
</footer>
</article>
<article className="lock-agenda">
<header>
<span>Следующее событие</span>
<i>◷</i>
</header>
<main>
<b>Работа над DimaOS</b>
<p>Сегодня · 20:00–21:30</p>
<div>
<span>ДК</span>
<em>Личный календарь</em>
</div>
</main>
</article>
</div>
<div className="lock-notifications">{lockNotices.map((notice) =>
<article key={notice.app}>
<span style={{ background: notice.color }}>{notice.icon}</span>
<div>
<header>
<b>{notice.app}</b>
<time>{notice.time}</time>
</header>
<p>{notice.title}</p>
</div>
</article>)}</div>
<button className="lock-enter">⌃<span>Нажмите для входа</span>
</button>
</section>
<section className="lock-signin">
<div className={`signin-card ${shaking ? 'shake' : ''}`}>
<div className="signin-avatar">
<span>{selectedUser === 'dmitry' ? 'ДК' : 'Г'}</span>
<i/>
</div>
<h1>{selectedUser === 'dmitry' ? 'Дмитрий' : 'Гость'}</h1>
<p>{selectedUser === 'dmitry' ? 'Введите PIN-код для входа' : 'Гостевой сеанс без PIN-кода'}</p>
        {selectedUser === 'dmitry' ? <form onSubmit={(event) => { event.preventDefault(); unlock() }}>
<label className={error ? 'error' : ''}>
<input ref={pinInput} type="password" inputMode="numeric" maxLength={8} value={pin} onChange={(event) => { setPin(event.target.value.replace(/\D/g, '')); setError('') }} placeholder="PIN-код"/>
<button type="submit">→</button>
</label>
<div className="pin-dots">{Array.from({ length: 4 }, (_, index) =>
<i key={index} className={index < pin.length ? 'filled' : ''}/>)}</div>{error && <div className="signin-error">
<span>!</span>{error}</div>}<button type="button" className="forgot-pin" onClick={() => setError('Стандартный PIN-код этой демонстрации: 1111')}>Я забыл PIN-код</button>
</form> : <button className="guest-enter" onClick={unlock}>Войти в гостевой режим</button>}
        <div className="signin-status">
<span>◇ Защищённый вход DimaOS</span>
<span>RU</span>
</div>
</div>
<aside className="user-switcher">
<button className={selectedUser === 'dmitry' ? 'active' : ''} onClick={() => { setSelectedUser('dmitry'); setError('') }}>
<span>ДК</span>
<div>
<b>Дмитрий</b>
<small>Администратор</small>
</div>
</button>
<button className={selectedUser === 'guest' ? 'active' : ''} onClick={() => { setSelectedUser('guest'); setError('') }}>
<span>Г</span>
<div>
<b>Гость</b>
<small>Временный профиль</small>
</div>
</button>
</aside>
<div className="signin-actions">
<button title="Специальные возможности">◉</button>
<button title="Сеть">⌁</button>
<button title="Спящий режим" onClick={() => onMode('sleep')}>☾</button>
<div className="signin-power">
<button title="Питание">⏻</button>
<section>
<button onClick={() => onMode('sleep')}>☾ Спящий режим</button>
<button onClick={onRestart}>↻ Перезапустить</button>
</section>
</div>
</div>
<button className="signin-back" onClick={() => setStage('glance')}>← Назад</button>
</section>
</div>;
}
