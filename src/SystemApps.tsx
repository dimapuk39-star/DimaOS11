import { useEffect, useMemo, useState, type CSSProperties } from 'react';

type OpenApp = (id: string) => void;

export function CalculatorApp() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  const keys = [
    'MC', 'MR', 'M+', 'M-',
    '%', 'CE', 'C', '⌫',
    '1/x', 'x²', '√x', '÷',
    '7', '8', '9', '×',
    '4', '5', '6', '−',
    '1', '2', '3', '+',
    '±', '0', ',', '=',
  ];

  function calculate(value = expression) {
    try {
      const safe = value
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-')
        .replace(/,/g, '.');
      if (!/^[\d+\-*/().\s]+$/.test(safe)) throw new Error('bad expression');
      const answer = Function(`"use strict"; return (${safe || 0})`)() as number;
      if (!Number.isFinite(answer)) throw new Error('not finite');
      const rendered = String(Math.round(answer * 1e10) / 1e10).replace('.', ',');
      setResult(rendered);
      setHistory((items) => [`${value} = ${rendered}`, ...items].slice(0, 12));
      return answer;
    } catch {
      setResult('Ошибка');
      return 0;
    }
  }

  function press(key: string) {
    if (/^\d$/.test(key) || ['+', '−', '×', '÷', '(', ')'].includes(key)) {
      setExpression((value) => value + key);
      return;
    }
    if (key === ',') setExpression((value) => value + ',');
    if (key === '=') calculate();
    if (key === 'C') {
      setExpression('');
      setResult('0');
    }
    if (key === 'CE') setExpression('');
    if (key === '⌫') setExpression((value) => value.slice(0, -1));
    if (key === '%') setExpression((value) => String(calculate(value) / 100));
    if (key === '1/x') setExpression(String(1 / calculate()));
    if (key === 'x²') setExpression(String(calculate() ** 2));
    if (key === '√x') setExpression(String(Math.sqrt(calculate())));
    if (key === '±') setExpression((value) => value.startsWith('-') ? value.slice(1) : `-${value}`);
    if (key === 'MC') setMemory(0);
    if (key === 'MR') setExpression(String(memory));
    if (key === 'M+') setMemory((value) => value + calculate());
    if (key === 'M-') setMemory((value) => value - calculate());
  }

  return (
    <div className="calculator-app">
<main>
<header>
<button>☰</button>
<b>Обычный</b>
<span>История</span>
</header>
<div className="calculator-display">
<small>{expression || ' '}</small>
<strong>{result}</strong>
</div>
<div className="calculator-keys">
          {keys.map((key) => (
            <button
              key={key}
              className={key === '=' ? 'equals' : /^\d$/.test(key) ? 'number' : ''}
              onClick={() => press(key)}
            >
              {key}
            </button>
          ))}
        </div>
</main>
<aside>
<h3>История</h3>
        {history.length ? history.map((entry) =>
<button onClick={() => setExpression(entry.split(' = ')[0])}>{entry}</button>) : <p>Здесь пока нет вычислений.</p>}
      </aside>
</div>
  );
}

type Process = {
  id: number;
  name: string;
  icon: string;
  cpu: number;
  memory: number;
  disk: number;
  status: string;
};

const initialProcesses: Process[] = [
  { id: 1, name: 'Dima Edge', icon: '◉', cpu: 3.2, memory: 624, disk: 0.2, status: 'Работает' },
  { id: 2, name: 'Проводник', icon: '▰', cpu: 0.4, memory: 148, disk: 0.1, status: 'Работает' },
  { id: 3, name: 'Dima Defender', icon: '◇', cpu: 1.1, memory: 212, disk: 0.3, status: 'Фоновый' },
  { id: 4, name: 'Диспетчер окон', icon: '▦', cpu: 0.8, memory: 96, disk: 0, status: 'Системный' },
  { id: 5, name: 'Dima Cloud', icon: '☁', cpu: 0.2, memory: 74, disk: 0.1, status: 'Синхронизация' },
  { id: 6, name: 'Параметры', icon: '⚙', cpu: 0.1, memory: 112, disk: 0, status: 'Приостановлено' },
  { id: 7, name: 'Виджеты DimaOS', icon: '▥', cpu: 0.6, memory: 188, disk: 0, status: 'Работает' },
  { id: 8, name: 'Служба обновлений', icon: '↻', cpu: 0.1, memory: 53, disk: 0.4, status: 'Фоновый' },
];

export function TaskManagerApp() {
  const [processes, setProcesses] = useState(initialProcesses);
  const [selected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState('Процессы');
  const [cpu, setCpu] = useState(17);
  const [memory, setMemory] = useState(48);
  const [samples, setSamples] = useState([18, 22, 14, 30, 27, 16, 17]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const nextCpu = Math.max(4, Math.min(76, Math.round(cpu + (Math.random() - 0.5) * 18)));
      setCpu(nextCpu);
      setMemory((value) => Math.max(38, Math.min(67, value + Math.round((Math.random() - 0.5) * 3))));
      setSamples((value) => [...value.slice(-22), nextCpu]);
      setProcesses((value) => value.map((process) => ({ ...process, cpu: Math.max(0, process.cpu + (Math.random() - 0.5) * 0.8) })));
    }, 1600);
    return () => clearInterval(timer);
  }, [cpu]);

  const totalMemory = processes.reduce((sum, process) => sum + process.memory, 0);

  return (
    <div className="task-manager">
<aside>
<div className="task-logo">▦</div>
        {['Процессы', 'Производительность', 'Журнал приложений', 'Автозагрузка', 'Пользователи', 'Подробности', 'Службы'].map((name) => (
          <button className={tab === name ? 'active' : ''} onClick={() => setTab(name)} title={name}>{name.slice(0, 1)}</button>
        ))}
        <button className="task-settings">⚙</button>
</aside>
<main>
<header>
<h1>{tab}</h1>
<button onClick={() => setProcesses((value) => [...value, { id: Date.now(), name: 'Новая задача', icon: '◇', cpu: 0.1, memory: 24, disk: 0, status: 'Работает' }])}>＋ Запустить новую задачу</button>
<button disabled={!selected} onClick={() => setProcesses((value) => value.filter((process) => process.id !== selected))}>□ Снять задачу</button>
<button>•••</button>
</header>
        {tab === 'Процессы' ? (
          <div className="process-table">
<div className="process-head">
<span>Имя</span>
<span>Состояние</span>
<span>
<b>{cpu}%</b> ЦП</span>
<span>
<b>{memory}%</b> Память</span>
<span>Диск</span>
</div>
            {processes.map((process) => (
              <button className={selected === process.id ? 'selected' : ''} onClick={() => setSelected(process.id)}>
<span>
<i>{process.icon}</i>{process.name}</span>
<span>{process.status}</span>
<span className="heat" style={{ '--heat': process.cpu / 10 } as CSSProperties}>{process.cpu.toFixed(1)}%</span>
<span className="heat" style={{ '--heat': process.memory / 700 } as CSSProperties}>{process.memory} МБ</span>
<span>{process.disk.toFixed(1)} МБ/с</span>
</button>
            ))}
          </div>
        ) : (
          <div className="performance-view">
<div className="performance-cards">
<button className="active">
<b>ЦП</b>
<span>{cpu}% 4,72 ГГц</span>
</button>
<button>
<b>Память</b>
<span>{(totalMemory / 1024).toFixed(1)}/32 ГБ ({memory}%)</span>
</button>
<button>
<b>Диск 0 (C:)</b>
<span>NVMe SSD · 3%</span>
</button>
<button>
<b>Ethernet</b>
<span>Отправка: 2 · Прием: 16 Мбит/с</span>
</button>
<button>
<b>GPU 0</b>
<span>NVIDIA RTX 4090 · 11%</span>
</button>
</div>
<div className="performance-chart">
<h2>Intel Core i9-14900K</h2>
<p>Использование ЦП</p>
<div className="chart-bars">{samples.map((value, index) =>
<i key={index} style={{ height: `${value}%` }} />)}</div>
<div className="performance-stats">
<span>
<b>{cpu}%</b>Использование</span>
<span>
<b>4,72 ГГц</b>Скорость</span>
<span>
<b>24</b>Ядра</span>
<span>
<b>32</b>Логические процессоры</span>
</div>
</div>
</div>
        )}
      </main>
</div>
  );
}

type Message = {
  from: 'user' | 'ai';
  text: string;
};

export function DimaAiApp({ onOpenApp }: { onOpenApp: OpenApp }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('dimaos-ai-history');
      return saved ? JSON.parse(saved) : [
        { from: 'ai', text: 'Привет! Я Dima AI. Подключите OpenAI или Ollama для полноценных ответов либо используйте встроенные команды DimaOS.' },
      ];
    } catch {
      return [{ from: 'ai', text: 'Привет! Я Dima AI. Чем могу помочь?' }];
    }
  });
  const [input, setInput] = useState('');
  const [provider, setProvider] = useState<'local' | 'openai' | 'ollama'>(() => (localStorage.getItem('dimaos-ai-provider') as 'local' | 'openai' | 'ollama') || 'local');
  const [model, setModel] = useState(() => localStorage.getItem('dimaos-ai-model') || 'gpt-5.6-luna');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');

  const suggestions = ['Открой проводник', 'Напиши небольшое стихотворение', 'Объясни квантовую физику', 'Что умеет DimaOS?'];

  const commands = useMemo(() => ({
    проводник: 'explorer',
    браузер: 'browser',
    параметры: 'settings',
    настройки: 'settings',
    калькулятор: 'calculator',
    задачи: 'taskmanager',
    терминал: 'terminal',
    фотографии: 'photos',
    блокнот: 'notepad',
    плеер: 'player',
    музыка: 'player',
  }), []);

  useEffect(() => {
    localStorage.setItem('dimaos-ai-history', JSON.stringify(messages.slice(-50)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('dimaos-ai-provider', provider);
    localStorage.setItem('dimaos-ai-model', model);
    if (provider === 'local') {
      setConnected(true);
      return;
    }
    fetch('/api/ai/status')
      .then((response) => response.json())
      .then((status) => setConnected(provider === 'ollama' || Boolean(status.openai)))
      .catch(() => setConnected(false));
  }, [provider, model]);

  function runLocalCommand(question: string): string | null {
    const normalized = question.toLowerCase();
    const command = Object.entries(commands).find(([word]) => normalized.includes(word));
    if (command && /(открой|запусти|покажи)/.test(normalized)) {
      onOpenApp(command[1]);
      return `Открываю приложение «${command[0]}».`;
    }
    if (normalized.includes('характеристик')) {
      onOpenApp('settings');
      return 'Открыл «Параметры → Система». Там указаны Intel Core i9-14900K, RTX 4090 и 32 ГБ памяти.';
    }
    if (normalized.includes('умеет')) return 'DimaOS управляет файлами, запускает приложения, сохраняет обои и настройки, воспроизводит медиа, показывает производительность и открывает сайты.';
    if (normalized.includes('время')) return `Сейчас ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}.`;
    if (normalized.includes('дата') || normalized.includes('число')) return `Сегодня ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
    const expression = normalized.match(/(?:посчитай|сколько будет)\s+([\d+\-*/().\s]+)/)?.[1];
    if (expression && /^[\d+\-*/().\s]+$/.test(expression)) {
      try {
        const value = Function(`"use strict"; return (${expression})`)();
        return `Ответ: ${value}`;
      } catch {
        return 'Не удалось вычислить это выражение.';
      }
    }
    return null;
  }

  async function answer(question: string) {
    if (loading) return;
    setError('');
    const localResponse = runLocalCommand(question);
    const userMessage: Message = { from: 'user', text: question };
    setMessages((value) => [...value, userMessage]);

    if (localResponse) {
      setMessages((value) => [...value, { from: 'ai', text: localResponse }]);
      return;
    }

    if (provider === 'local') {
      setMessages((value) => [...value, { from: 'ai', text: 'Для свободного разговора выберите OpenAI или Ollama в настройках Dima AI. В локальном режиме я выполняю системные команды, вычисления и открываю приложения.' }]);
      return;
    }

    setLoading(true);
    try {
      const history = [...messages, userMessage].slice(-18).map((message) => ({
        role: message.from === 'ai' ? 'assistant' : 'user',
        content: message.text,
      }));
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, messages: history }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.hint || payload.error || 'Сервис Dima AI недоступен.');
      setConnected(true);
      setMessages((value) => [...value, { from: 'ai', text: payload.text }]);
    } catch (requestError) {
      setConnected(false);
      const message = requestError instanceof Error ? requestError.message : 'Не удалось получить ответ.';
      setError(message);
      setMessages((value) => [...value, { from: 'ai', text: `Ошибка подключения: ${message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dima-ai-app">
<aside>
<div className="ai-logo">D</div>
<button className="active" onClick={() => setMessages([{ from: 'ai', text: 'Новый чат создан. Чем помочь?' }])}>＋ Новый чат</button>
<small>Недавние</small>
<button onClick={() => answer('Что умеет DimaOS?')}>Возможности DimaOS</button>
<button onClick={() => answer('Открой проводник')}>Работа с файлами</button>
<div />
<button onClick={() => setShowSettings(!showSettings)}>⚙ Параметры помощника</button>
</aside>
<main>
<header>
<span className={`ai-orb ${loading ? 'thinking' : ''}`}/>
<b>Dima AI</b>
<small className={connected ? 'ai-online' : 'ai-offline'}>{connected ? `${provider === 'local' ? 'Локальный режим' : `${provider} · ${model}`}` : 'Не подключено'}</small>
<button className="ai-settings-button" onClick={() => setShowSettings(!showSettings)}>⚙</button>
</header>
        {showSettings && <div className="ai-settings-panel">
<header>
<b>Подключение Dima AI</b>
<button onClick={() => setShowSettings(false)}>×</button>
</header>
<label>Режим<select value={provider} onChange={(event) => { setProvider(event.target.value as typeof provider); if (event.target.value === 'ollama' && model.startsWith('gpt-')) setModel('llama3.2'); if (event.target.value === 'openai' && !model.startsWith('gpt-')) setModel('gpt-5.6-luna'); }}>
<option value="local">Встроенный помощник</option>
<option value="openai">OpenAI API</option>
<option value="ollama">Ollama на компьютере</option>
</select>
</label>{provider !== 'local' && <label>Модель<input value={model} onChange={(event) => setModel(event.target.value)} placeholder={provider === 'openai' ? 'gpt-5.6-luna' : 'llama3.2'}/>
</label>}<div className={`ai-connection-card ${connected ? 'ok' : ''}`}>
<i>{connected ? '✓' : '!'}</i>
<span>
<b>{connected ? 'Подключение готово' : 'Требуется настройка'}</b>
<small>{provider === 'openai' ? 'Ключ хранится только в переменной OPENAI_API_KEY на сервере.' : provider === 'ollama' ? 'Запустите Ollama на порту 11434.' : 'Работает без Интернета.'}</small>
</span>
</div>
</div>}
        <div className="ai-conversation">
          {messages.map((message, index) =>
<div key={index} className={`ai-message ${message.from}`}>
<span>{message.from === 'ai' ? 'D' : 'ДК'}</span>
<p>{message.text}</p>
</div>)}
          {loading && <div className="ai-message ai">
<span>D</span>
<p className="ai-typing">
<i/>
<i/>
<i/>
</p>
</div>}
          {messages.length === 1 && <div className="ai-suggestions">{suggestions.map((suggestion) =>
<button onClick={() => answer(suggestion)}>{suggestion}<span>→</span>
</button>)}</div>}
        </div>
        {error && <div className="ai-error">{error}</div>}
        <form onSubmit={(event) => { event.preventDefault(); if (input.trim() && !loading) { answer(input.trim()); setInput(''); } }}>
<button type="button">＋</button>
<input value={input} onChange={(event) => setInput(event.target.value)} placeholder={loading ? 'Dima AI думает…' : 'Сообщение для Dima AI'} disabled={loading}/>
<button className="send" disabled={loading}>↑</button>
</form>
<small className="ai-disclaimer">Dima AI может ошибаться. Проверяйте важную информацию.</small>
</main>
</div>
  );
}
