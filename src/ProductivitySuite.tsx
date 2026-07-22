import { useEffect, useMemo, useRef, useState } from 'react';
import { readSetting, usePersistentState } from './storage';

type MailFolder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'trash';
type MailMessage = { id: string; folder: MailFolder; from: string; to: string; subject: string; body: string; date: number; unread: boolean; starred: boolean };

const seedMail: MailMessage[] = [
  { id: 'welcome', folder: 'inbox', from: 'Команда DimaOS', to: 'Дмитрий', subject: 'Добро пожаловать в обновлённую DimaOS', body: 'Мы добавили новые приложения для работы и творчества. Открой календарь, настрой фокусировку и сохрани важные данные в Dima Vault.\n\nХорошего дня!', date: Date.now() - 1000 * 60 * 18, unread: true, starred: true },
  { id: 'design', folder: 'inbox', from: 'Анна Петрова', to: 'Дмитрий', subject: 'Макеты нового интерфейса', body: 'Привет! Посмотрела последние экраны DimaOS — получилось очень атмосферно. Предлагаю добавить больше плавных переходов и живые карточки.', date: Date.now() - 1000 * 60 * 94, unread: true, starred: false },
  { id: 'cloud', folder: 'inbox', from: 'Dima Cloud', to: 'Дмитрий', subject: 'Резервное копирование завершено', body: 'Локальные данные приложений успешно проверены. Всё работает нормально.', date: Date.now() - 1000 * 60 * 60 * 22, unread: false, starred: false },
  { id: 'roadmap', folder: 'sent', from: 'Дмитрий', to: 'Команда', subject: 'План развития DimaOS', body: 'Главная цель — сделать систему удобной, красивой и наполненной работающими деталями.', date: Date.now() - 1000 * 60 * 60 * 27, unread: false, starred: true },
];

const folderLabels: Record<MailFolder, string> = { inbox: 'Входящие', starred: 'Избранное', sent: 'Отправленные', drafts: 'Черновики', trash: 'Корзина' };

export function DimaMailApp() {
  const [messages, setMessages] = usePersistentState<MailMessage[]>('mail.messages', seedMail);
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [selected, setSelected] = useState<string | null>('welcome');
  const [query, setQuery] = useState('');
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState({ to: '', subject: '', body: '' });
  const [toast, setToast] = useState('');
  const visible = messages.filter(message => (folder === 'starred' ? message.starred && message.folder !== 'trash' : message.folder === folder) && `${message.from} ${message.to} ${message.subject} ${message.body}`.toLowerCase().includes(query.toLowerCase()));
  const current = messages.find(message => message.id === selected);

  function choose(id: string) {
    setSelected(id);
    setMessages(items => items.map(item => item.id === id ? { ...item, unread: false } : item));
  }
  function notify(text: string) { setToast(text); window.setTimeout(() => setToast(''), 1800); }
  function send() {
    if (!draft.to.trim() || !draft.subject.trim()) { notify('Укажите получателя и тему'); return; }
    const message: MailMessage = { id: crypto.randomUUID(), folder: 'sent', from: 'Дмитрий', to: draft.to, subject: draft.subject, body: draft.body, date: Date.now(), unread: false, starred: false };
    setMessages(items => [message, ...items]); setDraft({ to: '', subject: '', body: '' }); setCompose(false); setFolder('sent'); setSelected(message.id); notify('Письмо отправлено');
  }
  function saveDraft() {
    if (!draft.to && !draft.subject && !draft.body) { setCompose(false); return; }
    const message: MailMessage = { id: crypto.randomUUID(), folder: 'drafts', from: 'Дмитрий', to: draft.to || 'Без получателя', subject: draft.subject || 'Без темы', body: draft.body, date: Date.now(), unread: false, starred: false };
    setMessages(items => [message, ...items]); setDraft({ to: '', subject: '', body: '' }); setCompose(false); notify('Черновик сохранён');
  }
  function remove(id: string) {
    setMessages(items => items.map(item => item.id === id ? { ...item, folder: item.folder === 'trash' ? item.folder : 'trash' } : item));
    setSelected(null); notify('Перемещено в корзину');
  }

  return <div className="mail-app">
    <aside className="mail-nav">
      <div className="suite-brand"><span>✉</span><b>Dima Mail</b></div>
      <button className="mail-compose" onClick={() => setCompose(true)}>＋ Новое письмо</button>
      <nav>{(Object.keys(folderLabels) as MailFolder[]).map(key => <button key={key} className={folder === key ? 'active' : ''} onClick={() => { setFolder(key); setSelected(null); }}>
        <i>{key === 'inbox' ? '▣' : key === 'starred' ? '★' : key === 'sent' ? '➤' : key === 'drafts' ? '▤' : '♲'}</i><span>{folderLabels[key]}</span>
        {key === 'inbox' && <em>{messages.filter(item => item.folder === 'inbox' && item.unread).length}</em>}
      </button>)}</nav>
      <div className="mail-storage"><span>Локальное хранилище</span><i><b style={{ width: `${Math.min(92, messages.length * 5 + 12)}%` }}/></i><small>{messages.length} писем · защищено браузером</small></div>
    </aside>
    <section className="mail-list">
      <header><div><h2>{folderLabels[folder]}</h2><small>{visible.length} сообщений</small></div><label>⌕<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Поиск"/></label></header>
      <div className="mail-actions"><button onClick={() => setMessages(items => items.map(item => item.folder === folder ? { ...item, unread: false } : item))}>✓ Прочитать все</button><button onClick={() => setQuery('')}>↻ Обновить</button></div>
      <div className="mail-items">{visible.length ? visible.map(message => <article key={message.id} className={`${message.unread ? 'unread' : ''} ${selected === message.id ? 'selected' : ''}`} onClick={() => choose(message.id)}>
        <span className="mail-avatar">{(message.folder === 'sent' ? message.to : message.from).slice(0, 1).toUpperCase()}</span>
        <div><header><b>{message.folder === 'sent' ? message.to : message.from}</b><time>{new Date(message.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time></header><strong>{message.subject}</strong><p>{message.body}</p></div>
        <button className={message.starred ? 'starred' : ''} onClick={event => { event.stopPropagation(); setMessages(items => items.map(item => item.id === message.id ? { ...item, starred: !item.starred } : item)); }}>★</button>
      </article>) : <div className="suite-empty"><span>✉</span><b>Здесь пока пусто</b><p>Новые сообщения появятся в этой папке</p></div>}</div>
    </section>
    <main className="mail-reader">{current ? <>
      <header><button onClick={() => setSelected(null)}>←</button><div><button onClick={() => setMessages(items => items.map(item => item.id === current.id ? { ...item, starred: !item.starred } : item))}>{current.starred ? '★' : '☆'}</button><button onClick={() => remove(current.id)}>♲</button><button>•••</button></div></header>
      <div className="mail-content"><h1>{current.subject}</h1><div className="mail-sender"><span>{current.from.slice(0, 1)}</span><div><b>{current.from}</b><small>кому: {current.to}</small></div><time>{new Date(current.date).toLocaleString('ru-RU')}</time></div><p>{current.body}</p><button className="mail-reply" onClick={() => { setDraft({ to: current.from, subject: `Re: ${current.subject}`, body: '' }); setCompose(true); }}>↩ Ответить</button></div>
    </> : <div className="suite-empty"><span>◇</span><b>Выберите письмо</b><p>Содержимое откроется здесь</p></div>}</main>
    {compose && <div className="compose-overlay"><section className="compose-card"><header><b>Новое сообщение</b><button onClick={saveDraft}>×</button></header><label><span>Кому</span><input value={draft.to} onChange={event => setDraft({ ...draft, to: event.target.value })} placeholder="Имя или адрес"/></label><label><span>Тема</span><input value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} placeholder="Тема письма"/></label><textarea value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} placeholder="Напишите сообщение…"/><footer><button onClick={send}>Отправить ➤</button><button onClick={saveDraft}>Сохранить черновик</button></footer></section></div>}
    {toast && <div className="suite-toast">✓ {toast}</div>}
  </div>;
}

type CalendarEvent = { id: string; title: string; date: string; time: string; color: string; note: string };
const seedEvents: CalendarEvent[] = [
  { id: 'launch', title: 'Развитие DimaOS', date: '2026-07-22', time: '18:30', color: '#4278e8', note: 'Большой пакет новых возможностей' },
  { id: 'design', title: 'Обзор дизайна', date: '2026-07-24', time: '12:00', color: '#8a59dc', note: 'Проверить интерфейсы приложений' },
];

function isoDate(year: number, month: number, day: number) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }

export function DimaCalendarApp() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = usePersistentState<CalendarEvent[]>('calendar.events', seedEvents);
  const [selectedDate, setSelectedDate] = useState(isoDate(today.getFullYear(), today.getMonth(), today.getDate()));
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ title: '', time: '12:00', note: '', color: '#4278e8' });
  const firstOffset = (new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const grid = Array.from({ length: 42 }, (_, index) => index - firstOffset + 1);
  const dayEvents = events.filter(event => event.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time));
  const monthName = cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  function addEvent() {
    if (!draft.title.trim()) return;
    setEvents(items => [...items, { id: crypto.randomUUID(), title: draft.title, date: selectedDate, time: draft.time, note: draft.note, color: draft.color }]);
    setDraft({ title: '', time: '12:00', note: '', color: '#4278e8' }); setCreating(false);
  }

  return <div className="calendar-app">
    <aside><div className="suite-brand"><span>◫</span><b>Dima Calendar</b></div><button className="calendar-create" onClick={() => setCreating(true)}>＋ Новое событие</button>
      <div className="mini-calendar"><h3>{today.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</h3><div>{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(day => <b key={day}>{day}</b>)}{Array.from({length:35},(_,i)=><span className={i-firstOffset+1===today.getDate()?'today':''} key={i}>{i-firstOffset+1>0&&i-firstOffset+1<=days?i-firstOffset+1:''}</span>)}</div></div>
      <nav><h4>Мои календари</h4><label><i style={{background:'#4278e8'}}/>Работа<input type="checkbox" defaultChecked/></label><label><i style={{background:'#ec5d8c'}}/>Личное<input type="checkbox" defaultChecked/></label><label><i style={{background:'#38a986'}}/>DimaOS<input type="checkbox" defaultChecked/></label></nav>
    </aside>
    <main><header><div><h1>{monthName}</h1><button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}>Сегодня</button></div><section><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()-1,1))}>‹</button><button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth()+1,1))}>›</button><span>Месяц⌄</span></section></header>
      <div className="calendar-weekdays">{['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'].map(day=><b key={day}>{day}</b>)}</div>
      <div className="calendar-month">{grid.map((day,index) => { const valid=day>0&&day<=days; const date=valid?isoDate(cursor.getFullYear(),cursor.getMonth(),day):''; const entries=events.filter(event=>event.date===date); const isToday=date===isoDate(today.getFullYear(),today.getMonth(),today.getDate()); return <button key={index} disabled={!valid} className={`${isToday?'today':''} ${selectedDate===date?'selected':''}`} onClick={()=>valid&&setSelectedDate(date)}><span>{valid?day:''}</span>{entries.slice(0,3).map(event=><i key={event.id} style={{'--event-color':event.color} as React.CSSProperties}>{event.time} {event.title}</i>)}</button> })}</div>
    </main>
    <section className="calendar-agenda"><header><div><b>{new Date(`${selectedDate}T12:00`).toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'})}</b><small>{dayEvents.length} событий</small></div><button onClick={()=>setCreating(true)}>＋</button></header>{dayEvents.length?dayEvents.map(event=><article key={event.id} style={{'--event-color':event.color} as React.CSSProperties}><time>{event.time}</time><div><b>{event.title}</b><p>{event.note||'Без описания'}</p></div><button onClick={()=>setEvents(items=>items.filter(item=>item.id!==event.id))}>×</button></article>):<div className="suite-empty"><span>☀</span><b>Свободный день</b><p>Можно запланировать что-нибудь новое</p></div>}</section>
    {creating&&<div className="compose-overlay"><section className="event-card"><header><b>Новое событие</b><button onClick={()=>setCreating(false)}>×</button></header><label>Название<input autoFocus value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})} placeholder="Например, встреча"/></label><div><label>Дата<input type="date" value={selectedDate} onChange={event=>setSelectedDate(event.target.value)}/></label><label>Время<input type="time" value={draft.time} onChange={event=>setDraft({...draft,time:event.target.value})}/></label></div><label>Заметка<textarea value={draft.note} onChange={event=>setDraft({...draft,note:event.target.value})}/></label><div className="event-colors">{['#4278e8','#8a59dc','#ec5d8c','#38a986','#ec9e34'].map(color=><button key={color} className={draft.color===color?'active':''} style={{background:color}} onClick={()=>setDraft({...draft,color})}/>)}</div><footer><button onClick={addEvent}>Создать событие</button></footer></section></div>}
  </div>;
}

type VaultItem = { id: string; title: string; username: string; password: string; note: string; color: string; favorite: boolean };
const seedVault: VaultItem[] = [{ id: 'demo', title: 'Пример записи', username: 'dmitry', password: 'DimaOS-demo-2026', note: 'Демонстрационная запись. Не храните здесь особо важные секреты.', color: '#6b58d9', favorite: true }];

function generatePassword(length = 18) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, value => alphabet[value % alphabet.length]).join('');
}

export function DimaVaultApp() {
  const [items, setItems] = usePersistentState<VaultItem[]>('vault.items', seedVault);
  const [locked, setLocked] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('demo');
  const [query, setQuery] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState<VaultItem | null>(null);
  const current = items.find(item => item.id === selected);

  function unlock() {
    const systemPin = readSetting('security.pin', '');
    if (!systemPin || pin === systemPin) { setLocked(false); setPin(''); setError(''); } else { setError('Неверный PIN-код DimaOS'); setPin(''); }
  }
  function save() {
    if (!editing?.title.trim()) return;
    setItems(currentItems => currentItems.some(item => item.id === editing.id) ? currentItems.map(item => item.id === editing.id ? editing : item) : [editing, ...currentItems]);
    setSelected(editing.id); setEditing(null);
  }
  function create() { setEditing({ id: crypto.randomUUID(), title: '', username: '', password: generatePassword(), note: '', color: '#3e83de', favorite: false }); }
  if (locked) return <div className="vault-lock"><div className="vault-orb"><span>◇</span><i/><i/><i/></div><h1>Dima Vault</h1><p>Личное пространство заблокировано</p><form onSubmit={event=>{event.preventDefault();unlock()}}><input autoFocus type="password" inputMode="numeric" value={pin} onChange={event=>{setPin(event.target.value.replace(/\D/g,''));setError('')}} placeholder="PIN-код DimaOS" maxLength={8}/><button>→</button></form>{error&&<small>{error}</small>}<footer>Данные хранятся только в этом браузере</footer></div>;
  const filtered=items.filter(item=>`${item.title} ${item.username}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="vault-app"><aside><div className="suite-brand"><span>◇</span><b>Dima Vault</b></div><button className="vault-new" onClick={create}>＋ Новая запись</button><label className="vault-search">⌕<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Поиск в хранилище"/></label><nav><button className="active">▦ Все записи <em>{items.length}</em></button><button>★ Избранное <em>{items.filter(item=>item.favorite).length}</em></button></nav><div className="vault-health"><span>Безопасность</span><strong>Хорошая</strong><i><b/></i><small>Используйте уникальные пароли</small></div><button className="vault-lock-button" onClick={()=>setLocked(true)}>⌾ Заблокировать</button></aside>
    <section className="vault-list"><header><h2>Все записи</h2><button onClick={create}>＋</button></header>{filtered.map(item=><article key={item.id} className={selected===item.id?'selected':''} onClick={()=>{setSelected(item.id);setRevealed(false)}}><span style={{background:item.color}}>{item.title.slice(0,1).toUpperCase()}</span><div><b>{item.title}</b><small>{item.username||'Без имени пользователя'}</small></div><i>{item.favorite?'★':''}</i></article>)}</section>
    <main className="vault-detail">{current?<><header><span style={{background:current.color}}>{current.title.slice(0,1)}</span><div><h1>{current.title}</h1><p>Локальная защищённая запись</p></div><button onClick={()=>setEditing({...current})}>✎</button><button onClick={()=>setItems(all=>all.map(item=>item.id===current.id?{...item,favorite:!item.favorite}:item))}>{current.favorite?'★':'☆'}</button></header><div className="vault-fields"><label>Имя пользователя<div><span>{current.username||'—'}</span><button onClick={()=>navigator.clipboard.writeText(current.username)}>▣</button></div></label><label>Пароль<div><span className="vault-password">{revealed?current.password:'•'.repeat(Math.min(18,current.password.length))}</span><button onClick={()=>setRevealed(!revealed)}>{revealed?'◉':'◎'}</button><button onClick={()=>navigator.clipboard.writeText(current.password)}>▣</button></div></label><label>Заметка<p>{current.note||'Нет заметки'}</p></label></div><footer><span>Последнее изменение хранится локально</span><button onClick={()=>{setItems(all=>all.filter(item=>item.id!==current.id));setSelected('')}}>Удалить запись</button></footer></>:<div className="suite-empty"><span>◇</span><b>Выберите запись</b></div>}</main>
    {editing&&<div className="compose-overlay"><section className="vault-editor"><header><b>{items.some(item=>item.id===editing.id)?'Изменить запись':'Новая запись'}</b><button onClick={()=>setEditing(null)}>×</button></header><label>Название<input autoFocus value={editing.title} onChange={event=>setEditing({...editing,title:event.target.value})}/></label><label>Имя пользователя<input value={editing.username} onChange={event=>setEditing({...editing,username:event.target.value})}/></label><label>Пароль<div><input value={editing.password} onChange={event=>setEditing({...editing,password:event.target.value})}/><button onClick={()=>setEditing({...editing,password:generatePassword()})}>Сгенерировать</button></div></label><label>Заметка<textarea value={editing.note} onChange={event=>setEditing({...editing,note:event.target.value})}/></label><footer><button onClick={save}>Сохранить</button><button onClick={()=>setEditing(null)}>Отмена</button></footer></section></div>}
  </div>;
}

type FocusTask = { id: string; title: string; done: boolean };
export function DimaFocusApp() {
  const [tasks,setTasks]=usePersistentState<FocusTask[]>('focus.tasks',[{id:'start',title:'Попробовать режим фокусировки',done:false}]);
  const [mode,setMode]=useState<'focus'|'break'>('focus');
  const [duration,setDuration]=useState(25);
  const [seconds,setSeconds]=useState(25*60);
  const [running,setRunning]=useState(false);
  const [task,setTask]=useState('');
  const [sessions,setSessions]=usePersistentState('focus.sessions',0);
  const completed=tasks.filter(item=>item.done).length;
  const endTime=useRef(0);
  useEffect(()=>{if(!running)return;endTime.current=Date.now()+seconds*1000;const timer=window.setInterval(()=>{const left=Math.max(0,Math.ceil((endTime.current-Date.now())/1000));setSeconds(left);if(left===0){setRunning(false);if(mode==='focus')setSessions(value=>value+1)}},250);return()=>clearInterval(timer)},[running]);
  function selectMode(next:'focus'|'break',minutes:number){setMode(next);setDuration(minutes);setSeconds(minutes*60);setRunning(false)}
  function addTask(){if(!task.trim())return;setTasks(items=>[...items,{id:crypto.randomUUID(),title:task.trim(),done:false}]);setTask('')}
  const progress=1-seconds/(duration*60);
  return <div className="focus-app"><header><div className="suite-brand"><span>◉</span><b>Dima Focus</b></div><section><button className={mode==='focus'?'active':''} onClick={()=>selectMode('focus',25)}>Фокус</button><button className={mode==='break'?'active':''} onClick={()=>selectMode('break',5)}>Перерыв</button></section><button className="focus-settings">⚙</button></header><main><section className="focus-timer"><div className="focus-ring" style={{'--progress':`${progress*360}deg`} as React.CSSProperties}><div><small>{mode==='focus'?'Сосредоточьтесь':'Время отдохнуть'}</small><strong>{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</strong><span>из {duration} минут</span></div></div><div className="focus-controls"><button onClick={()=>setSeconds(Math.max(0,seconds-60))}>−1</button><button className="focus-play" onClick={()=>setRunning(!running)}>{running?'Ⅱ':'▶'}</button><button onClick={()=>setSeconds(Math.min(duration*60,seconds+60))}>+1</button></div><p>{running?'Уведомления приглушены. DimaOS бережёт ваше внимание.':'Запустите таймер, когда будете готовы.'}</p></section><section className="focus-tasks"><header><div><h2>Задачи сеанса</h2><small>{completed} из {tasks.length} выполнено</small></div><span>{sessions} ◉</span></header><form onSubmit={event=>{event.preventDefault();addTask()}}><input value={task} onChange={event=>setTask(event.target.value)} placeholder="Добавить задачу…"/><button>＋</button></form><div>{tasks.map(item=><article key={item.id} className={item.done?'done':''}><button onClick={()=>setTasks(all=>all.map(value=>value.id===item.id?{...value,done:!value.done}:value))}>{item.done?'✓':''}</button><span>{item.title}</span><button onClick={()=>setTasks(all=>all.filter(value=>value.id!==item.id))}>×</button></article>)}</div><footer><span>Прогресс сегодня</span><i><b style={{width:`${tasks.length?completed/tasks.length*100:0}%`}}/></i></footer></section></main><footer className="focus-insight"><article><span>◷</span><div><b>{sessions*25} минут</b><small>глубокой работы</small></div></article><article><span>✓</span><div><b>{completed} задачи</b><small>завершено</small></div></article><article><span>↗</span><div><b>{sessions>=4?'Отличный':'Хороший'} ритм</b><small>продуктивность</small></div></article></footer></div>;
}
