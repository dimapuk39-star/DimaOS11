import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { usePersistentState } from './storage';

type Contact = { id: string; name: string; avatar: string; color: string; online: boolean; status: string };
type ChatMessage = { id: string; contactId: string; from: 'me' | 'them'; text: string; time: number; read: boolean };

const contacts: Contact[] = [
  { id: 'alex', name: 'Алексей', avatar: 'А', color: '#397fce', online: true, status: 'В сети' },
  { id: 'maria', name: 'Мария', avatar: 'М', color: '#d25383', online: true, status: 'Работает в Dima Board' },
  { id: 'team', name: 'Команда DimaOS', avatar: 'D', color: '#7454d2', online: true, status: '5 участников' },
  { id: 'sergey', name: 'Сергей', avatar: 'С', color: '#29966b', online: false, status: 'Был недавно' },
  { id: 'anna', name: 'Анна', avatar: 'А', color: '#c57b31', online: false, status: 'Была вчера' },
];

const initialMessages: ChatMessage[] = [
  { id: '1', contactId: 'alex', from: 'them', text: 'Привет! Ты уже видел новую версию DimaOS?', time: Date.now() - 720000, read: true },
  { id: '2', contactId: 'alex', from: 'me', text: 'Да, выглядит невероятно. Особенно новые Параметры!', time: Date.now() - 690000, read: true },
  { id: '3', contactId: 'alex', from: 'them', text: 'Согласен. Давай позже проверим Dima Arcade ⚡', time: Date.now() - 630000, read: true },
  { id: '4', contactId: 'maria', from: 'them', text: 'Я добавила новые задачи на доску.', time: Date.now() - 3600000, read: false },
  { id: '5', contactId: 'team', from: 'them', text: 'Сборка 26H2 готова к тестированию 🎉', time: Date.now() - 86400000, read: false },
];

function sanitizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return initialMessages;
  const safe = value.filter((item): item is Partial<ChatMessage> & Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .filter((item) => typeof item.id === 'string' && typeof item.contactId === 'string' && typeof item.text === 'string')
    .map((item) => ({
      id: item.id as string,
      contactId: contacts.some((contact) => contact.id === item.contactId) ? item.contactId as string : 'alex',
      from: item.from === 'me' ? 'me' as const : 'them' as const,
      text: item.text as string,
      time: typeof item.time === 'number' && Number.isFinite(item.time) ? item.time : Date.now(),
      read: Boolean(item.read),
    }));
  return safe.length ? safe : initialMessages;
}

export default function DimaConnectApp() {
  const [storedMessages, setStoredMessages] = usePersistentState<unknown>('connect.messages', initialMessages);
  const [storedSelected, setStoredSelected] = usePersistentState<unknown>('connect.selected', 'alex');
  const messages = useMemo(() => sanitizeMessages(storedMessages), [storedMessages]);
  const selected = typeof storedSelected === 'string' && contacts.some((contact) => contact.id === storedSelected) ? storedSelected : 'alex';
  const setSelected = useCallback((id: string) => setStoredSelected(id), [setStoredSelected]);
  const setMessages = useCallback((action: SetStateAction<ChatMessage[]>) => {
    setStoredMessages((current: unknown) => {
      const safe = sanitizeMessages(current);
      return typeof action === 'function' ? action(safe) : sanitizeMessages(action);
    });
  }, [setStoredMessages]);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [panel, setPanel] = useState<'chat' | 'people' | 'calls'>('chat');
  const [calling, setCalling] = useState(false);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);
  const active = contacts.find((contact) => contact.id === selected) || contacts[0];

  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [messages, selected]);
  useEffect(() => setMessages((current) => current.map((message) => message.contactId === selected ? { ...message, read: true } : message)), [selected, setMessages]);

  const filteredContacts = useMemo(() => contacts.filter((contact) => contact.name.toLowerCase().includes(query.toLowerCase())), [query]);
  const chatMessages = messages.filter((message) => message.contactId === selected);

  function send() {
    const text = draft.trim();
    if (!text) return;
    const outgoing: ChatMessage = { id: crypto.randomUUID(), contactId: selected, from: 'me', text, time: Date.now(), read: true };
    setMessages((current) => [...current, outgoing]);
    setDraft('');
    if (active.id !== 'team') window.setTimeout(() => setMessages((current) => [...current, { id: crypto.randomUUID(), contactId: selected, from: 'them', text: ['Отлично! 👍', 'Увидел, спасибо.', 'Звучит здорово!', 'Договорились ✦'][Math.floor(Math.random() * 4)], time: Date.now(), read: false }]), 900 + Math.random() * 900);
  }

  return <div className="dima-connect">
<aside className="connect-rail">
<div className="connect-logo">D</div>
<nav>
<button className={panel === 'chat' ? 'active' : ''} onClick={() => setPanel('chat')}>
<span>◇</span>
<small>Чаты</small>
</button>
<button className={panel === 'people' ? 'active' : ''} onClick={() => setPanel('people')}>
<span>♙</span>
<small>Контакты</small>
</button>
<button className={panel === 'calls' ? 'active' : ''} onClick={() => setPanel('calls')}>
<span>◖</span>
<small>Звонки</small>
</button>
</nav>
<footer>
<button>♢</button>
<div>ДК<i/>
</div>
</footer>
</aside>
<aside className="connect-list">
<header>
<div>
<h1>{panel === 'chat' ? 'Сообщения' : panel === 'people' ? 'Контакты' : 'Звонки'}</h1>
<button>＋</button>
</div>
<label>
<span>⌕</span>
<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск"/>
</label>
</header>
      {panel === 'chat' && <div className="connect-favorites">
<h4>ИЗБРАННОЕ</h4>
<section>{contacts.slice(0, 3).map((contact) =>
<button key={contact.id} onClick={() => setSelected(contact.id)}>
<span style={{ background: contact.color }}>{contact.avatar}<i className={contact.online ? 'online' : ''}/>
</span>
<small>{contact.name.split(' ')[0]}</small>
</button>)}</section>
</div>}
      <div className="connect-contacts">
<h4>{panel === 'calls' ? 'НЕДАВНИЕ' : 'ВСЕ ЧАТЫ'}</h4>{filteredContacts.map((contact) => { const contactMessages = messages.filter((message) => message.contactId === contact.id); const last = contactMessages[contactMessages.length - 1]; const unread = messages.filter((message) => message.contactId === contact.id && !message.read && message.from === 'them').length; return <button key={contact.id} className={selected === contact.id ? 'active' : ''} onClick={() => setSelected(contact.id)}>
<span className="contact-avatar" style={{ background: contact.color }}>{contact.avatar}<i className={contact.online ? 'online' : ''}/>
</span>
<div>
<header>
<b>{contact.name}</b>
<time>{last ? new Date(last.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}</time>
</header>
<p>{panel === 'calls' ? `Входящий · ${contact.online ? 'Сегодня' : 'Вчера'}` : last?.text || contact.status}</p>
</div>{unread > 0 && <em>{unread}</em>}</button>})}</div>
</aside>
<main className="connect-chat">
<header>
<div className="contact-avatar" style={{ background: active.color }}>{active.avatar}<i className={active.online ? 'online' : ''}/>
</div>
<section>
<h2>{active.name}</h2>
<p>{active.status}</p>
</section>
<nav>
<button onClick={() => setCalling(true)}>◖</button>
<button onClick={() => setCalling(true)}>▣</button>
<button>⌕</button>
<button>•••</button>
</nav>
</header>
<section className="connect-messages">
<div className="chat-date">Сегодня</div>{chatMessages.map((message, index) =>
<article key={message.id} className={message.from}>
<div>{message.text}</div>
<footer>
<time>{new Date(message.time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time>{message.from === 'me' && <span>✓✓</span>}</footer>{index === chatMessages.length - 1 && message.from === 'them' && <i style={{ background: active.color }}>{active.avatar}</i>}</article>)}<div ref={bottom}/>
</section>
<footer className="connect-compose">
<button>＋</button>
<div>
<textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder="Напишите сообщение…"/>
<section>
<button>☺</button>
<button>▧</button>
<button>GIF</button>
</section>
</div>
<button className={draft.trim() ? 'send active' : 'send'} onClick={send}>{draft.trim() ? '➤' : '♬'}</button>
</footer>
</main>
<aside className="connect-info">
<div className="connect-person">
<span style={{ background: active.color }}>{active.avatar}<i className={active.online ? 'online' : ''}/>
</span>
<h2>{active.name}</h2>
<p>{active.status}</p>
<section>
<button>
<i>♢</i>
<small>Без звука</small>
</button>
<button>
<i>⌕</i>
<small>Поиск</small>
</button>
<button>
<i>•••</i>
<small>Ещё</small>
</button>
</section>
</div>
<div className="connect-info-section">
<button>Общие файлы <span>12 ›</span>
</button>
<div className="shared-grid">
<span>▧</span>
<span>▤</span>
<span>▧</span>
<span>＋9</span>
</div>
</div>
<div className="connect-info-section">
<button>Участники <span>{active.id === 'team' ? '5' : '2'} ›</span>
</button>
<button>Настройки чата <span>›</span>
</button>
</div>
<button className="connect-danger">Удалить переписку</button>
</aside>
    {calling && <div className="connect-call">
<div className="call-glow"/>
<header>
<span>Зашифрованный звонок</span>
<time>00:0{Math.floor(Math.random() * 9)}</time>
</header>
<main>
<div className="call-avatar" style={{ background: active.color }}>{active.avatar}<i/>
<i/>
</div>
<h1>{active.name}</h1>
<p>Соединение установлено</p>
</main>
<footer>
<button className={muted ? 'off' : ''} onClick={() => setMuted(!muted)}>{muted ? '♩' : '♬'}<span>Микрофон</span>
</button>
<button className={camera ? '' : 'off'} onClick={() => setCamera(!camera)}>▣<span>Камера</span>
</button>
<button>▤<span>Экран</span>
</button>
<button className="hangup" onClick={() => setCalling(false)}>◖<span>Завершить</span>
</button>
</footer>
</div>}
  </div>;
}
