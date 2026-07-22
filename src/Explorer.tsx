import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

export type ExplorerItem = {
  id: string;
  parent: string | null;
  name: string;
  kind: 'folder' | 'text' | 'image' | 'audio' | 'video' | 'archive' | 'other';
  size: number;
  modified: string;
  content?: string;
  source?: string;
  originalParent?: string | null;
};

type ClipboardState = {
  id: string;
  mode: 'copy' | 'cut';
} | null;

type MenuState = {
  x: number;
  y: number;
  itemId: string | null;
} | null;

type EditorState = {
  id: string;
  value: string;
} | null;

type Props = {
  onOpenApp?: (id: string) => void;
};

const ROOT = 'root';
const TRASH = 'trash';
const STORAGE_KEY = 'dimaos-explorer-v2';

const systemItems: ExplorerItem[] = [
  folder(ROOT, null, 'Этот компьютер'),
  folder('desktop', ROOT, 'Рабочий стол'),
  folder('documents', ROOT, 'Документы'),
  folder('downloads', ROOT, 'Загрузки'),
  folder('pictures', ROOT, 'Изображения'),
  folder('music', ROOT, 'Музыка'),
  folder('videos', ROOT, 'Видео'),
  folder('projects', 'documents', 'Проекты'),
  folder('dimaos', 'projects', 'DimaOS 11'),
  folder(TRASH, null, 'Корзина'),
  textFile(
    'welcome',
    'documents',
    'Добро пожаловать.txt',
    'Добро пожаловать в DimaOS 11!\n\nЭтот файл хранится в виртуальной файловой системе браузера.',
  ),
  textFile(
    'ideas',
    'dimaos',
    'Идеи для DimaOS.txt',
    '1. Виджеты на рабочем столе\n2. Облачная синхронизация\n3. Dima AI\n4. Игровой режим',
  ),
  {
    id: 'wallpaper-demo',
    parent: 'pictures',
    name: 'DimaOS Wallpaper.png',
    kind: 'image',
    size: 4_280_000,
    modified: new Date().toISOString(),
  },
  {
    id: 'track-demo',
    parent: 'music',
    name: 'Dima Theme.mp3',
    kind: 'audio',
    size: 7_510_000,
    modified: new Date().toISOString(),
  },
  {
    id: 'video-demo',
    parent: 'videos',
    name: 'Знакомство с DimaOS.mp4',
    kind: 'video',
    size: 125_400_000,
    modified: new Date().toISOString(),
  },
  {
    id: 'archive-demo',
    parent: 'downloads',
    name: 'DimaTools.zip',
    kind: 'archive',
    size: 18_300_000,
    modified: new Date().toISOString(),
  },
];

function folder(id: string, parent: string | null, name: string): ExplorerItem {
  return {
    id,
    parent,
    name,
    kind: 'folder',
    size: 0,
    modified: new Date().toISOString(),
  };
}

function textFile(
  id: string,
  parent: string,
  name: string,
  content: string,
): ExplorerItem {
  return {
    id,
    parent,
    name,
    kind: 'text',
    size: new Blob([content]).size,
    modified: new Date().toISOString(),
    content,
  };
}

function loadItems(): ExplorerItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return systemItems;
    const parsed = JSON.parse(saved) as ExplorerItem[];
    return Array.isArray(parsed) && parsed.length ? parsed : systemItems;
  } catch {
    return systemItems;
  }
}

function iconFor(item: ExplorerItem): string {
  if (item.kind === 'folder') return item.id === TRASH ? '♲' : '▰';
  if (item.kind === 'text') return '▤';
  if (item.kind === 'image') return '▧';
  if (item.kind === 'audio') return '♫';
  if (item.kind === 'video') return '▶';
  if (item.kind === 'archive') return '▥';
  return '◇';
}

function formatSize(size: number): string {
  if (!size) return '—';
  if (size < 1024) return `${size} Б`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} КБ`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} МБ`;
  return `${(size / 1024 ** 3).toFixed(1)} ГБ`;
}

function itemType(item: ExplorerItem): string {
  const labels: Record<ExplorerItem['kind'], string> = {
    folder: 'Папка с файлами',
    text: 'Текстовый документ',
    image: 'Изображение',
    audio: 'Аудиофайл',
    video: 'Видеофайл',
    archive: 'Архив',
    other: 'Файл',
  };
  return labels[item.kind];
}

function uniqueName(items: ExplorerItem[], parent: string, base: string): string {
  const names = new Set(
    items
      .filter((item) => item.parent === parent)
      .map((item) => item.name.toLowerCase()),
  );
  if (!names.has(base.toLowerCase())) return base;
  const dot = base.lastIndexOf('.');
  const title = dot > 0 ? base.slice(0, dot) : base;
  const extension = dot > 0 ? base.slice(dot) : '';
  let index = 2;
  while (names.has(`${title} (${index})${extension}`.toLowerCase())) index += 1;
  return `${title} (${index})${extension}`;
}

function detectKind(file: File): ExplorerItem['kind'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('text/')) return 'text';
  if (/\.(zip|rar|7z)$/i.test(file.name)) return 'archive';
  return 'other';
}

export default function ExplorerApp({ onOpenApp }: Props) {
  const [items, setItems] = useState<ExplorerItem[]>(loadItems);
  const [current, setCurrent] = useState(ROOT);
  const [history, setHistory] = useState([ROOT]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'name' | 'date' | 'type' | 'size'>('name');
  const [ascending, setAscending] = useState(true);
  const [view, setView] = useState<'tiles' | 'list' | 'details'>('tiles');
  const [clipboard, setClipboard] = useState<ClipboardState>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [preview, setPreview] = useState<ExplorerItem | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const explorerRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const serializable = items.map(({ source, ...item }) => item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  }, [items]);

  useEffect(() => {
    explorerRoot.current?.focus();
  }, []);

  const currentFolder = items.find((item) => item.id === current);

  const children = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = query
      ? items.filter(
          (item) =>
            item.id !== ROOT &&
            item.id !== TRASH &&
            item.parent !== TRASH &&
            item.name.toLowerCase().includes(query),
        )
      : items.filter((item) => item.parent === current);

    return [...base].sort((a, b) => {
      if (a.kind === 'folder' && b.kind !== 'folder') return -1;
      if (a.kind !== 'folder' && b.kind === 'folder') return 1;
      let result = 0;
      if (sort === 'name') result = a.name.localeCompare(b.name, 'ru');
      if (sort === 'date') result = a.modified.localeCompare(b.modified);
      if (sort === 'type') result = a.kind.localeCompare(b.kind);
      if (sort === 'size') result = a.size - b.size;
      return ascending ? result : -result;
    });
  }, [items, current, search, sort, ascending]);

  const breadcrumbs = useMemo(() => {
    const path: ExplorerItem[] = [];
    let cursor = items.find((item) => item.id === current);
    while (cursor) {
      path.unshift(cursor);
      cursor = items.find((item) => item.id === cursor?.parent);
    }
    return path;
  }, [items, current]);

  const usedSpace = items.reduce((sum, item) => sum + item.size, 0);

  function navigate(folderId: string) {
    if (folderId === current) return;
    setCurrent(folderId);
    setSelected([]);
    setSearch('');
    const nextHistory = [...history.slice(0, historyIndex + 1), folderId];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  }

  function travel(nextIndex: number) {
    if (nextIndex < 0 || nextIndex >= history.length) return;
    setHistoryIndex(nextIndex);
    setCurrent(history[nextIndex]);
    setSelected([]);
    setSearch('');
  }

  function goUp() {
    if (currentFolder?.parent) navigate(currentFolder.parent);
  }

  function selectItem(itemId: string, additive: boolean) {
    if (additive) {
      setSelected((value) =>
        value.includes(itemId)
          ? value.filter((id) => id !== itemId)
          : [...value, itemId],
      );
    } else {
      setSelected([itemId]);
    }
  }

  function openItem(item: ExplorerItem) {
    if (item.kind === 'folder') {
      navigate(item.id);
      return;
    }
    if (item.kind === 'text') {
      setEditor({ id: item.id, value: item.content || '' });
      return;
    }
    setPreview(item);
  }

  function createFolder() {
    const name = uniqueName(items, current, 'Новая папка');
    const item = folder(crypto.randomUUID(), current, name);
    setItems((value) => [...value, item]);
    setSelected([item.id]);
    setRenaming(item.id);
    setRenameValue(name);
  }

  function createTextFile() {
    const name = uniqueName(items, current, 'Новый документ.txt');
    const item = textFile(crypto.randomUUID(), current, name, '');
    setItems((value) => [...value, item]);
    setSelected([item.id]);
    setEditor({ id: item.id, value: '' });
  }

  function beginRename(itemId: string) {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;
    setRenaming(itemId);
    setRenameValue(item.name);
    setMenu(null);
  }

  function commitRename() {
    if (!renaming || !renameValue.trim()) {
      setRenaming(null);
      return;
    }
    const item = items.find((entry) => entry.id === renaming);
    if (!item || !item.parent) return;
    const name = uniqueName(
      items.filter((entry) => entry.id !== item.id),
      item.parent,
      renameValue.trim(),
    );
    setItems((value) =>
      value.map((entry) =>
        entry.id === renaming
          ? { ...entry, name, modified: new Date().toISOString() }
          : entry,
      ),
    );
    setRenaming(null);
  }

  function deleteItems(ids = selected) {
    if (!ids.length) return;
    if (current === TRASH) {
      const remove = new Set(ids);
      let changed = true;
      while (changed) {
        changed = false;
        items.forEach((item) => {
          if (item.parent && remove.has(item.parent) && !remove.has(item.id)) {
            remove.add(item.id);
            changed = true;
          }
        });
      }
      setItems((value) => value.filter((item) => !remove.has(item.id)));
    } else {
      setItems((value) =>
        value.map((item) =>
          ids.includes(item.id)
            ? { ...item, originalParent: item.parent, parent: TRASH }
            : item,
        ),
      );
    }
    setSelected([]);
    setMenu(null);
  }

  function restoreItems() {
    setItems((value) =>
      value.map((item) =>
        selected.includes(item.id)
          ? { ...item, parent: item.originalParent || ROOT, originalParent: undefined }
          : item,
      ),
    );
    setSelected([]);
  }

  function emptyTrash() {
    const trashIds = new Set(
      items.filter((item) => item.parent === TRASH).map((item) => item.id),
    );
    setItems((value) => value.filter((item) => !trashIds.has(item.id)));
    setSelected([]);
  }

  function copy(mode: 'copy' | 'cut') {
    if (!selected[0]) return;
    setClipboard({ id: selected[0], mode });
    setMenu(null);
  }

  function paste() {
    if (!clipboard) return;
    const source = items.find((item) => item.id === clipboard.id);
    if (!source || source.id === current) return;
    if (clipboard.mode === 'cut') {
      setItems((value) =>
        value.map((item) =>
          item.id === source.id
            ? { ...item, parent: current, modified: new Date().toISOString() }
            : item,
        ),
      );
      setClipboard(null);
      return;
    }
    const clone: ExplorerItem = {
      ...source,
      id: crypto.randomUUID(),
      parent: current,
      name: uniqueName(items, current, source.name),
      modified: new Date().toISOString(),
    };
    setItems((value) => [...value, clone]);
  }

  function saveEditor() {
    if (!editor) return;
    setItems((value) =>
      value.map((item) =>
        item.id === editor.id
          ? {
              ...item,
              content: editor.value,
              size: new Blob([editor.value]).size,
              modified: new Date().toISOString(),
            }
          : item,
      ),
    );
    setEditor(null);
  }

  function downloadItem(item: ExplorerItem) {
    const blob = new Blob([item.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = item.name;
    anchor.click();
    URL.revokeObjectURL(url);
    setMenu(null);
  }

  function importFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const created = files.map<ExplorerItem>((file) => ({
      id: crypto.randomUUID(),
      parent: current,
      name: uniqueName(items, current, file.name),
      kind: detectKind(file),
      size: file.size,
      modified: new Date(file.lastModified).toISOString(),
      source: URL.createObjectURL(file),
    }));
    setItems((value) => [...value, ...created]);
    event.target.value = '';
  }

  function showContextMenu(event: MouseEvent, itemId: string | null) {
    event.preventDefault();
    if (itemId && !selected.includes(itemId)) setSelected([itemId]);
    setMenu({ x: event.clientX, y: event.clientY, itemId });
  }

  function handleKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (editor || renaming) return;
    if (event.key === 'Delete') deleteItems();
    if (event.key === 'F2' && selected[0]) beginRename(selected[0]);
    if (event.ctrlKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      setSelected(children.map((item) => item.id));
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'c') copy('copy');
    if (event.ctrlKey && event.key.toLowerCase() === 'x') copy('cut');
    if (event.ctrlKey && event.key.toLowerCase() === 'v') paste();
    if (event.key === 'Enter' && selected[0]) {
      const item = items.find((entry) => entry.id === selected[0]);
      if (item) openItem(item);
    }
  }

  return (
    <div
      className="dima-explorer"
      ref={explorerRoot}
      tabIndex={0}
      onKeyDown={handleKeyboard}
      onPointerDown={() => setMenu(null)}
    >
      <input
        ref={fileInput}
        className="explorer-file-input"
        type="file"
        multiple
        onChange={importFiles}
      />

      <div className="explorer-tabs">
        <div className="explorer-tab active">
          <span className="mini-folder">▰</span>
          <b>{currentFolder?.name || 'Проводник'}</b>
          <button>×</button>
        </div>
        <button className="new-tab">＋</button>
      </div>

      <div className="explorer-commandbar">
        <div className="new-menu-wrap">
          <button className="primary-command" onClick={createFolder}>
            <span>＋</span>
            Создать папку
          </button>
          <button className="split-command" onClick={createTextFile}>▤</button>
        </div>
        <i />
        <button disabled={!selected.length} onClick={() => copy('cut')} title="Вырезать">
          ✂
        </button>
        <button disabled={!selected.length} onClick={() => copy('copy')} title="Копировать">
          ▣
        </button>
        <button disabled={!clipboard} onClick={paste} title="Вставить">
          ▤
        </button>
        <button
          disabled={!selected.length}
          onClick={() => beginRename(selected[0])}
          title="Переименовать"
        >
          ✎
        </button>
        <button disabled={!selected.length} onClick={() => deleteItems()} title="Удалить">
          ♲
        </button>
        <i />
        <button onClick={() => fileInput.current?.click()} title="Импортировать с компьютера">
          ↥ Добавить
        </button>
        {current === TRASH && (
          <>
            <button disabled={!selected.length} onClick={restoreItems}>↶ Восстановить</button>
            <button onClick={emptyTrash}>Очистить корзину</button>
          </>
        )}
        <div className="command-spacer" />
        <label className="sort-control">
          Сортировка
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
            <option value="name">Имя</option>
            <option value="date">Дата</option>
            <option value="type">Тип</option>
            <option value="size">Размер</option>
          </select>
        </label>
        <button onClick={() => setAscending((value) => !value)}>{ascending ? '↑' : '↓'}</button>
        <label className="view-control">
          Вид
          <select value={view} onChange={(event) => setView(event.target.value as typeof view)}>
            <option value="tiles">Плитки</option>
            <option value="list">Список</option>
            <option value="details">Таблица</option>
          </select>
        </label>
        <button onClick={() => setShowHidden((value) => !value)} title="Скрытые элементы">
          {showHidden ? '◉' : '○'}
        </button>
      </div>

      <div className="explorer-address-row">
        <button disabled={historyIndex === 0} onClick={() => travel(historyIndex - 1)}>←</button>
        <button
          disabled={historyIndex === history.length - 1}
          onClick={() => travel(historyIndex + 1)}
        >
          →
        </button>
        <button disabled={!currentFolder?.parent} onClick={goUp}>↑</button>
        <button onClick={() => setItems((value) => [...value])}>↻</button>
        <div className="breadcrumbs">
          <button onClick={() => navigate(ROOT)}>⌂</button>
          {breadcrumbs.map((entry) => (
            <span key={entry.id}>
              <i>›</i>
              <button onClick={() => navigate(entry.id)}>{entry.name}</button>
            </span>
          ))}
        </div>
        <div className="explorer-search">
          <span>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Поиск в: ${currentFolder?.name || 'Проводник'}`}
          />
          {search && <button onClick={() => setSearch('')}>×</button>}
        </div>
      </div>

      <div className="explorer-workspace">
        <aside className="explorer-sidebar">
          <SidebarButton icon="⌂" label="Главная" active={current === ROOT} onClick={() => navigate(ROOT)} />
          <SidebarButton icon="▧" label="Галерея" onClick={() => navigate('pictures')} />
          <div className="sidebar-separator" />
          <small>Избранное</small>
          <SidebarButton icon="▤" label="Рабочий стол" active={current === 'desktop'} onClick={() => navigate('desktop')} />
          <SidebarButton icon="↓" label="Загрузки" active={current === 'downloads'} onClick={() => navigate('downloads')} />
          <SidebarButton icon="▰" label="Документы" active={current === 'documents'} onClick={() => navigate('documents')} />
          <SidebarButton icon="▧" label="Изображения" active={current === 'pictures'} onClick={() => navigate('pictures')} />
          <SidebarButton icon="♫" label="Музыка" active={current === 'music'} onClick={() => navigate('music')} />
          <SidebarButton icon="▶" label="Видео" active={current === 'videos'} onClick={() => navigate('videos')} />
          <div className="sidebar-separator" />
          <small>Устройства</small>
          <SidebarButton icon="▣" label="Этот компьютер" active={current === ROOT} onClick={() => navigate(ROOT)} />
          <SidebarButton icon="♲" label="Корзина" active={current === TRASH} onClick={() => navigate(TRASH)} />
          <div className="drive-widget">
            <div><span>Локальный диск (C:)</span><b>{formatSize(usedSpace)}</b></div>
            <i><span style={{ width: `${Math.min(100, usedSpace / 5_000_000)}%` }} /></i>
            <small>1,64 ТБ свободно из 2 ТБ</small>
          </div>
        </aside>

        <main
          className={`explorer-files view-${view}`}
          onContextMenu={(event) => showContextMenu(event, null)}
          onPointerDown={(event) => {
            if (event.currentTarget === event.target) setSelected([]);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const transfer = event.dataTransfer.files;
            if (!transfer.length) return;
            const fakeEvent = { target: { files: transfer, value: '' } } as unknown as ChangeEvent<HTMLInputElement>;
            importFiles(fakeEvent);
          }}
        >
          {view === 'details' && (
            <div className="details-header">
              <span>Имя</span>
              <span>Дата изменения</span>
              <span>Тип</span>
              <span>Размер</span>
            </div>
          )}

          {children.map((item) => (
            <FileItem
              key={item.id}
              item={item}
              view={view}
              selected={selected.includes(item.id)}
              cut={clipboard?.mode === 'cut' && clipboard.id === item.id}
              renaming={renaming === item.id}
              renameValue={renameValue}
              onRenameValue={setRenameValue}
              onRenameCommit={commitRename}
              onRenameCancel={() => setRenaming(null)}
              onSelect={(additive) => selectItem(item.id, additive)}
              onOpen={() => openItem(item)}
              onContext={(event) => showContextMenu(event, item.id)}
            />
          ))}

          {!children.length && (
            <div className="empty-folder">
              <span>{search ? '⌕' : current === TRASH ? '♲' : '▰'}</span>
              <h3>{search ? 'Ничего не найдено' : current === TRASH ? 'Корзина пуста' : 'Эта папка пуста'}</h3>
              <p>{search ? 'Попробуйте изменить запрос.' : 'Перетащите сюда файлы или создайте новую папку.'}</p>
            </div>
          )}
        </main>
      </div>

      <footer className="explorer-statusbar">
        <span>{children.length} элементов</span>
        {selected.length > 0 && <span>Выбрано: {selected.length}</span>}
        {clipboard && <span>Буфер: {clipboard.mode === 'copy' ? 'копирование' : 'перемещение'}</span>}
        <div />
        <button onClick={() => setView('list')}>☷</button>
        <button onClick={() => setView('details')}>☰</button>
        <button onClick={() => setView('tiles')}>▦</button>
      </footer>

      {menu && (
        <ContextMenu
          state={menu}
          item={menu.itemId ? items.find((entry) => entry.id === menu.itemId) : undefined}
          canPaste={Boolean(clipboard)}
          inTrash={current === TRASH}
          onOpen={() => {
            const item = items.find((entry) => entry.id === menu.itemId);
            if (item) openItem(item);
            setMenu(null);
          }}
          onRename={() => menu.itemId && beginRename(menu.itemId)}
          onDelete={() => deleteItems(menu.itemId ? [menu.itemId] : [])}
          onCopy={() => copy('copy')}
          onCut={() => copy('cut')}
          onPaste={paste}
          onNewFolder={createFolder}
          onNewText={createTextFile}
          onDownload={() => {
            const item = items.find((entry) => entry.id === menu.itemId);
            if (item) downloadItem(item);
          }}
          onRefresh={() => setItems((value) => [...value])}
          onTerminal={() => onOpenApp?.('terminal')}
        />
      )}

      {editor && (
        <div className="explorer-dialog-backdrop">
          <div className="text-editor-dialog">
            <header>
              <span>▤</span>
              <b>{items.find((item) => item.id === editor.id)?.name}</b>
              <button onClick={() => setEditor(null)}>×</button>
            </header>
            <div className="editor-menu">Файл&nbsp;&nbsp; Правка&nbsp;&nbsp; Вид</div>
            <textarea
              autoFocus
              value={editor.value}
              onChange={(event) => setEditor({ ...editor, value: event.target.value })}
              onKeyDown={(event) => {
                if (event.ctrlKey && event.key.toLowerCase() === 's') {
                  event.preventDefault();
                  saveEditor();
                }
              }}
            />
            <footer>
              <span>UTF-8</span>
              <button onClick={() => setEditor(null)}>Отмена</button>
              <button className="dialog-primary" onClick={saveEditor}>Сохранить</button>
            </footer>
          </div>
        </div>
      )}

      {preview && (
        <div className="explorer-dialog-backdrop" onPointerDown={() => setPreview(null)}>
          <div className="preview-dialog" onPointerDown={(event) => event.stopPropagation()}>
            <header>
              <b>{preview.name}</b>
              <button onClick={() => setPreview(null)}>×</button>
            </header>
            {preview.kind === 'image' && preview.source ? (
              <img src={preview.source} alt={preview.name} />
            ) : (
              <div className={`preview-placeholder ${preview.kind}`}>
                <span>{iconFor(preview)}</span>
                <h2>{preview.name}</h2>
                <p>{itemType(preview)} · {formatSize(preview.size)}</p>
                <button onClick={() => downloadItem(preview)}>Скачать файл</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type SidebarButtonProps = {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
};

function SidebarButton({ icon, label, active, onClick }: SidebarButtonProps) {
  return (
    <button className={active ? 'active' : ''} onClick={onClick}>
      <i>{icon}</i>
      <span>{label}</span>
    </button>
  );
}

type FileItemProps = {
  item: ExplorerItem;
  view: 'tiles' | 'list' | 'details';
  selected: boolean;
  cut: boolean;
  renaming: boolean;
  renameValue: string;
  onRenameValue: (value: string) => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onSelect: (additive: boolean) => void;
  onOpen: () => void;
  onContext: (event: MouseEvent) => void;
};

function FileItem(props: FileItemProps) {
  const {
    item,
    view,
    selected,
    cut,
    renaming,
    renameValue,
    onRenameValue,
    onRenameCommit,
    onRenameCancel,
    onSelect,
    onOpen,
    onContext,
  } = props;

  return (
    <button
      className={`file-item ${selected ? 'selected' : ''} ${cut ? 'is-cut' : ''}`}
      onClick={(event) => onSelect(event.ctrlKey)}
      onDoubleClick={onOpen}
      onContextMenu={onContext}
      title={`${item.name}\n${itemType(item)}\n${formatSize(item.size)}`}
    >
      <span className={`file-icon kind-${item.kind}`}>{iconFor(item)}</span>
      <span className="file-name">
        {renaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(event) => onRenameValue(event.target.value)}
            onBlur={onRenameCommit}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Enter') onRenameCommit();
              if (event.key === 'Escape') onRenameCancel();
            }}
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          item.name
        )}
      </span>
      {view !== 'tiles' && <span className="file-date">{new Date(item.modified).toLocaleString('ru-RU')}</span>}
      {view === 'details' && <span className="file-type">{itemType(item)}</span>}
      {view === 'details' && <span className="file-size">{formatSize(item.size)}</span>}
    </button>
  );
}

type ContextMenuProps = {
  state: Exclude<MenuState, null>;
  item?: ExplorerItem;
  canPaste: boolean;
  inTrash: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onNewFolder: () => void;
  onNewText: () => void;
  onDownload: () => void;
  onRefresh: () => void;
  onTerminal: () => void;
};

function ContextMenu(props: ContextMenuProps) {
  const x = Math.min(props.state.x, window.innerWidth - 230);
  const y = Math.min(props.state.y, window.innerHeight - 390);

  return (
    <div
      className="explorer-context-menu"
      style={{ left: x, top: y }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {props.item ? (
        <>
          <button className="context-open" onClick={props.onOpen}><span>↗</span><b>Открыть</b></button>
          <div className="context-icon-row">
            <button onClick={props.onCut} title="Вырезать">✂</button>
            <button onClick={props.onCopy} title="Копировать">▣</button>
            <button onClick={props.onRename} title="Переименовать">✎</button>
            <button onClick={props.onDelete} title="Удалить">♲</button>
          </div>
          <i />
          <button onClick={props.onDownload}><span>↓</span> Скачать</button>
          <button onClick={props.onRename}><span>✎</span> Переименовать</button>
          <button onClick={props.onDelete}><span>♲</span> {props.inTrash ? 'Удалить навсегда' : 'Удалить'}</button>
          <i />
          <button><span>◇</span> Свойства</button>
        </>
      ) : (
        <>
          <button onClick={props.onNewFolder}><span>▰</span> Создать папку</button>
          <button onClick={props.onNewText}><span>▤</span> Текстовый документ</button>
          <button disabled={!props.canPaste} onClick={props.onPaste}><span>▤</span> Вставить</button>
          <i />
          <button onClick={props.onRefresh}><span>↻</span> Обновить</button>
          <button onClick={props.onTerminal}><span>&gt;_</span> Открыть в терминале</button>
          <i />
          <button><span>⚙</span> Параметры папок</button>
        </>
      )}
    </div>
  );
}
