import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { usePersistentState } from './storage';

type BrowserTab = {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
  loading: boolean;
};

type Bookmark = {
  id: string;
  title: string;
  url: string;
  createdAt: string;
};

type HistoryEntry = {
  id: string;
  title: string;
  url: string;
  visitedAt: string;
};

const HOME = 'dima://newtab';

const defaultBookmarks: Bookmark[] = [
  bookmark('Wikipedia', 'https://ru.wikipedia.org'),
  bookmark('GitHub', 'https://github.com'),
  bookmark('YouTube', 'https://youtube.com'),
  bookmark('Яндекс', 'https://ya.ru'),
];

function bookmark(title: string, url: string): Bookmark {
  return {
    id: crypto.randomUUID(),
    title,
    url,
    createdAt: new Date().toISOString(),
  };
}

function newTab(): BrowserTab {
  return {
    id: crypto.randomUUID(),
    title: 'Новая вкладка',
    url: HOME,
    history: [HOME],
    historyIndex: 0,
    loading: false,
  };
}

function normalizeAddress(value: string, engine: string): string {
  const query = value.trim();
  if (!query) return HOME;
  if (query === HOME || query.startsWith('dima://')) return query;
  if (/^https?:\/\//i.test(query)) return query;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?/i.test(query)) return `http://${query}`;
  if (query.includes('.') && !query.includes(' ')) return `https://${query}`;
  const encoded = encodeURIComponent(query);
  if (engine === 'yandex') return `https://yandex.ru/search/?text=${encoded}`;
  if (engine === 'google') return `https://www.google.com/search?q=${encoded}`;
  return `https://www.bing.com/search?q=${encoded}`;
}

function hostName(url: string): string {
  if (url === HOME) return 'Новая вкладка';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function faviconLetter(url: string): string {
  const host = hostName(url);
  return host === 'Новая вкладка' ? 'D' : host.slice(0, 1).toUpperCase();
}

function safeTitle(url: string): string {
  if (url === HOME) return 'Новая вкладка';
  return hostName(url);
}

export default function BrowserApp() {
  const [tabs, setTabs] = usePersistentState<BrowserTab[]>('browser.tabs', [newTab()]);
  const [activeId, setActiveId] = usePersistentState('browser.activeTab', tabs[0]?.id || '');
  const [bookmarks, setBookmarks] = usePersistentState<Bookmark[]>('browser.bookmarks', defaultBookmarks);
  const [browserHistory, setBrowserHistory] = usePersistentState<HistoryEntry[]>('browser.history', []);
  const [engine, setEngine] = usePersistentState('browser.searchEngine', 'bing');
  const [showBookmarks, setShowBookmarks] = usePersistentState('browser.showBookmarks', true);
  const [downloads, setDownloads] = usePersistentState<string[]>('browser.downloads', []);
  const [address, setAddress] = useState(HOME);
  const [panel, setPanel] = useState<'none' | 'history' | 'bookmarks' | 'settings'>('none');
  const [reloadKey, setReloadKey] = useState(0);
  const [frameMessage, setFrameMessage] = useState(false);
  const addressInput = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find((tab) => tab.id === activeId) || tabs[0];

  useEffect(() => {
    if (!tabs.length) {
      const tab = newTab();
      setTabs([tab]);
      setActiveId(tab.id);
      return;
    }
    if (!tabs.some((tab) => tab.id === activeId)) setActiveId(tabs[0].id);
  }, [tabs, activeId, setTabs, setActiveId]);

  useEffect(() => {
    if (activeTab) setAddress(activeTab.url);
  }, [activeTab?.id, activeTab?.url]);

  const isBookmarked = useMemo(
    () => bookmarks.some((item) => item.url === activeTab?.url),
    [bookmarks, activeTab?.url],
  );

  function patchActive(patch: Partial<BrowserTab>) {
    if (!activeTab) return;
    setTabs((value) =>
      value.map((tab) => tab.id === activeTab.id ? { ...tab, ...patch } : tab),
    );
  }

  function addTab(url = HOME) {
    const tab = newTab();
    tab.url = url;
    tab.history = [url];
    tab.title = safeTitle(url);
    tab.loading = url !== HOME;
    setTabs((value) => [...value, tab]);
    setActiveId(tab.id);
    setAddress(url);
  }

  function closeTab(id: string) {
    if (tabs.length === 1) {
      const replacement = newTab();
      setTabs([replacement]);
      setActiveId(replacement.id);
      return;
    }
    const index = tabs.findIndex((tab) => tab.id === id);
    const remaining = tabs.filter((tab) => tab.id !== id);
    setTabs(remaining);
    if (activeId === id) {
      setActiveId(remaining[Math.max(0, index - 1)]?.id || remaining[0].id);
    }
  }

  function duplicateTab() {
    if (!activeTab) return;
    const duplicate: BrowserTab = {
      ...activeTab,
      id: crypto.randomUUID(),
      title: `${activeTab.title}`,
      loading: activeTab.url !== HOME,
    };
    setTabs((value) => [...value, duplicate]);
    setActiveId(duplicate.id);
  }

  function navigate(rawValue = address) {
    if (!activeTab) return;
    const url = normalizeAddress(rawValue, engine);
    const nextHistory = [
      ...activeTab.history.slice(0, activeTab.historyIndex + 1),
      url,
    ];
    patchActive({
      url,
      title: safeTitle(url),
      history: nextHistory,
      historyIndex: nextHistory.length - 1,
      loading: url !== HOME,
    });
    setAddress(url);
    setFrameMessage(false);
    if (url !== HOME) {
      setBrowserHistory((value) => [
        {
          id: crypto.randomUUID(),
          title: safeTitle(url),
          url,
          visitedAt: new Date().toISOString(),
        },
        ...value,
      ].slice(0, 300));
      window.setTimeout(() => setFrameMessage(true), 3500);
    }
  }

  function travel(offset: number) {
    if (!activeTab) return;
    const index = activeTab.historyIndex + offset;
    if (index < 0 || index >= activeTab.history.length) return;
    const url = activeTab.history[index];
    patchActive({
      url,
      title: safeTitle(url),
      historyIndex: index,
      loading: url !== HOME,
    });
    setAddress(url);
    setFrameMessage(false);
  }

  function refresh() {
    if (!activeTab) return;
    if (activeTab.url === HOME) {
      setAddress(HOME);
      return;
    }
    patchActive({ loading: true });
    setReloadKey((value) => value + 1);
  }

  function goHome() {
    navigate(HOME);
  }

  function toggleBookmark() {
    if (!activeTab || activeTab.url === HOME) return;
    if (isBookmarked) {
      setBookmarks((value) => value.filter((item) => item.url !== activeTab.url));
    } else {
      setBookmarks((value) => [
        ...value,
        bookmark(activeTab.title || safeTitle(activeTab.url), activeTab.url),
      ]);
    }
  }

  function openExternal() {
    if (!activeTab || activeTab.url === HOME) return;
    window.open(activeTab.url, '_blank', 'noopener,noreferrer');
  }

  function submitAddress(event: FormEvent) {
    event.preventDefault();
    navigate();
  }

  function clearHistory() {
    setBrowserHistory([]);
  }

  function simulateDownload() {
    if (!activeTab || activeTab.url === HOME) return;
    const name = `${hostName(activeTab.url)}-${new Date().toISOString().slice(0, 10)}.url`;
    const blob = new Blob([`[InternetShortcut]\nURL=${activeTab.url}\n`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    setDownloads((value) => [name, ...value].slice(0, 30));
  }

  if (!activeTab) return null;

  return (
    <div className="dima-browser">
<div className="browser-tabstrip">
<button className="browser-profile" title="Профиль Дмитрий">ДК</button>
<div className="browser-tabs-scroll">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`real-browser-tab ${tab.id === activeTab.id ? 'active' : ''}`}
              onClick={() => setActiveId(tab.id)}
              onAuxClick={(event) => {
                if (event.button === 1) closeTab(tab.id);
              }}
            >
<i>{faviconLetter(tab.url)}</i>
<span>{tab.title}</span>
              {tab.loading && <b className="tab-loader" />}
              <em
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                ×
              </em>
</button>
          ))}
        </div>
<button className="browser-new-tab" onClick={() => addTab()}>＋</button>
<button className="browser-tab-actions" onClick={duplicateTab} title="Дублировать вкладку">▣</button>
</div>
<div className="browser-navigation">
<button
          disabled={activeTab.historyIndex === 0}
          onClick={() => travel(-1)}
          title="Назад"
        >
          ←
        </button>
<button
          disabled={activeTab.historyIndex === activeTab.history.length - 1}
          onClick={() => travel(1)}
          title="Вперед"
        >
          →
        </button>
<button onClick={refresh} title="Обновить">↻</button>
<button onClick={goHome} title="Домашняя страница">⌂</button>
<form onSubmit={submitAddress}>
<span className="security-indicator">
            {activeTab.url === HOME ? '⌕' : activeTab.url.startsWith('https:') ? '◆' : '◇'}
          </span>
<input
            ref={addressInput}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onFocus={(event) => event.currentTarget.select()}
            placeholder="Введите поисковый запрос или веб-адрес"
            spellCheck={false}
          />
<button type="button" className={isBookmarked ? 'bookmarked' : ''} onClick={toggleBookmark}>☆</button>
</form>
<button onClick={openExternal} title="Открыть сайт во внешней вкладке">↗</button>
<button onClick={simulateDownload} title="Скачать ярлык страницы">↓</button>
<button onClick={() => setPanel(panel === 'history' ? 'none' : 'history')} title="Журнал">◷</button>
<button onClick={() => setPanel(panel === 'settings' ? 'none' : 'settings')} title="Меню">•••</button>
</div>

      {showBookmarks && (
        <div className="browser-bookmarks-bar">
<button onClick={() => setPanel(panel === 'bookmarks' ? 'none' : 'bookmarks')}>★ Все закладки</button>
          {bookmarks.slice(0, 7).map((item) => (
            <button key={item.id} onClick={() => navigate(item.url)}>
<i>{faviconLetter(item.url)}</i>
              {item.title}
            </button>
          ))}
        </div>
      )}

      {activeTab.loading && <div className="real-browser-progress">
<i />
</div>}

      <div className="browser-page-area">
        {activeTab.url === HOME ? (
          <NewTabPage
            bookmarks={bookmarks}
            history={browserHistory}
            onNavigate={navigate}
            onOpenExternal={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
          />
        ) : (
          <div className="browser-frame-shell">
<iframe
              key={`${activeTab.id}-${activeTab.url}-${reloadKey}`}
              src={activeTab.url}
              title={activeTab.title}
              allow="clipboard-read; clipboard-write; fullscreen; autoplay; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => patchActive({ loading: false })}
            />
            {frameMessage && (
              <div className="browser-frame-notice">
<span>◇</span>
<div>
<b>Страница не отображается?</b>
<p>Сайт может запрещать встраивание в другие приложения.</p>
</div>
<button onClick={openExternal}>Открыть напрямую ↗</button>
<button onClick={() => setFrameMessage(false)}>×</button>
</div>
            )}
          </div>
        )}

        {panel !== 'none' && (
          <BrowserPanel
            panel={panel}
            bookmarks={bookmarks}
            history={browserHistory}
            downloads={downloads}
            engine={engine}
            showBookmarks={showBookmarks}
            onClose={() => setPanel('none')}
            onNavigate={(url) => {
              navigate(url);
              setPanel('none');
            }}
            onDeleteBookmark={(id) => setBookmarks((value) => value.filter((item) => item.id !== id))}
            onClearHistory={clearHistory}
            onEngine={setEngine}
            onShowBookmarks={setShowBookmarks}
          />
        )}
      </div>
</div>
  );
}

type NewTabProps = {
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  onNavigate: (url: string) => void;
  onOpenExternal: (url: string) => void;
};

function NewTabPage(props: NewTabProps) {
  const [query, setQuery] = useState('');
  const [greeting, setGreeting] = useState('Добрый день');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 6) setGreeting('Доброй ночи');
    else if (hour < 12) setGreeting('Доброе утро');
    else if (hour < 18) setGreeting('Добрый день');
    else setGreeting('Добрый вечер');
  }, []);

  return (
    <main className="dima-new-tab">
<div className="new-tab-ambient one" />
<div className="new-tab-ambient two" />
<section className="new-tab-content">
<div className="new-tab-brand">
<span className="new-tab-logo">
<i />
<i />
<i />
<i />
</span>
<div>
<small>{greeting}, Дмитрий</small>
<h1>Dima Browser</h1>
</div>
</div>
<form
          className="new-tab-search"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim()) props.onNavigate(query);
          }}
        >
<span>⌕</span>
<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск в Интернете" autoFocus />
<button>Найти</button>
</form>
<div className="new-tab-shortcuts">
          {props.bookmarks.slice(0, 8).map((item) => (
            <button key={item.id} onClick={() => props.onNavigate(item.url)}>
<i>{faviconLetter(item.url)}</i>
<span>{item.title}</span>
</button>
          ))}
          <button onClick={() => props.onOpenExternal('https://youtube.com')}>
<i>▶</i>
<span>YouTube ↗</span>
</button>
</div>
<div className="new-tab-dashboard">
<article className="dashboard-weather">
<span>Москва</span>
<strong>22°</strong>
<p>Переменная облачность</p>
<small>Ощущается как 21° · Ветер 2 м/с</small>
</article>
<article className="dashboard-focus">
<span>Фокус дня</span>
<strong>Создавайте без ограничений</strong>
<p>DimaOS сохраняет ваше рабочее пространство автоматически.</p>
</article>
<article className="dashboard-recent">
<span>Недавние страницы</span>
            {props.history.slice(0, 3).map((item) => (
              <button key={item.id} onClick={() => props.onNavigate(item.url)}>
<i>{faviconLetter(item.url)}</i>
<b>{item.title}</b>
<small>{new Date(item.visitedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</small>
</button>
            ))}
            {!props.history.length && <p>История пока пуста</p>}
          </article>
</div>
</section>
</main>
  );
}

type PanelProps = {
  panel: 'history' | 'bookmarks' | 'settings';
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  downloads: string[];
  engine: string;
  showBookmarks: boolean;
  onClose: () => void;
  onNavigate: (url: string) => void;
  onDeleteBookmark: (id: string) => void;
  onClearHistory: () => void;
  onEngine: (engine: string) => void;
  onShowBookmarks: (value: boolean) => void;
};

function BrowserPanel(props: PanelProps) {
  return (
    <aside className="browser-side-panel">
<header>
<h2>
          {props.panel === 'history' && 'Журнал'}
          {props.panel === 'bookmarks' && 'Избранное'}
          {props.panel === 'settings' && 'Настройки браузера'}
        </h2>
<button onClick={props.onClose}>×</button>
</header>

      {props.panel === 'history' && (
        <>
<div className="panel-actions">
<span>Последние посещения</span>
<button onClick={props.onClearHistory}>Очистить</button>
</div>
<div className="panel-list">
            {props.history.map((item) => (
              <button key={item.id} onClick={() => props.onNavigate(item.url)}>
<i>{faviconLetter(item.url)}</i>
<span>
<b>{item.title}</b>
<small>{item.url}</small>
</span>
<time>{new Date(item.visitedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</time>
</button>
            ))}
            {!props.history.length && <p className="panel-empty">История посещений пуста.</p>}
          </div>
</>
      )}

      {props.panel === 'bookmarks' && (
        <div className="panel-list">
          {props.bookmarks.map((item) => (
            <div className="bookmark-row" key={item.id}>
<button onClick={() => props.onNavigate(item.url)}>
<i>{faviconLetter(item.url)}</i>
<span>
<b>{item.title}</b>
<small>{item.url}</small>
</span>
</button>
<button onClick={() => props.onDeleteBookmark(item.id)}>♲</button>
</div>
          ))}
        </div>
      )}

      {props.panel === 'settings' && (
        <div className="browser-settings-panel">
<section>
<h3>Поисковая система</h3>
<select value={props.engine} onChange={(event) => props.onEngine(event.target.value)}>
<option value="bing">Bing</option>
<option value="yandex">Яндекс</option>
<option value="google">Google</option>
</select>
</section>
<section>
<div>
<h3>Панель избранного</h3>
<p>Показывать закладки под адресной строкой</p>
</div>
<label className="browser-switch">
<input type="checkbox" checked={props.showBookmarks} onChange={(event) => props.onShowBookmarks(event.target.checked)} />
<i />
</label>
</section>
<section>
<div>
<h3>Загрузки</h3>
<p>{props.downloads.length} сохраненных ярлыков</p>
</div>
</section>
<section>
<div>
<h3>Защита от отслеживания</h3>
<p>Сбалансированный режим</p>
</div>
<span className="setting-good">Включено</span>
</section>
<div className="browser-limit-note">
<b>О веб-совместимости</b>
<p>Браузерные правила безопасности не позволяют встраивать сайты с заголовками X-Frame-Options. Используйте кнопку ↗ для таких страниц.</p>
</div>
</div>
      )}
    </aside>
  );
}
