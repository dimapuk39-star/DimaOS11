import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { deleteBlob, listBlobKeys, loadBlob, saveBlob, usePersistentState } from './storage';

type PhotoMeta = { id: string; name: string; size: number; type: string; addedAt: number };
type PhotoItem = PhotoMeta & { url: string };
const PHOTO_PREFIX = 'photos:item:';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}

export default function PhotosApp() {
  const [metadata, setMetadata] = usePersistentState<PhotoMeta[]>('photos.library', []);
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [slideshow, setSlideshow] = useState(false);
  const objectUrls = useRef(new Set<string>());
  const viewer = useRef<HTMLDivElement>(null);
  const selectedIndex = items.findIndex((item) => item.id === selectedId);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  useEffect(() => {
    let cancelled = false;
    async function restoreLibrary() {
      const storedKeys = new Set((await listBlobKeys()).filter((key) => key.startsWith(PHOTO_PREFIX)));
      const valid = metadata.filter((photo) => storedKeys.has(`${PHOTO_PREFIX}${photo.id}`));
      const restored = await Promise.all(valid.map(async (photo) => {
        const blob = await loadBlob(`${PHOTO_PREFIX}${photo.id}`);
        if (!blob) return null;
        const url = URL.createObjectURL(blob);
        objectUrls.current.add(url);
        return { ...photo, url };
      }));
      if (!cancelled) {
        setItems(restored.filter((photo): photo is PhotoItem => photo !== null));
        setLoading(false);
        if (valid.length !== metadata.length) setMetadata(valid);
      }
    }
    restoreLibrary().catch(() => setLoading(false));
    return () => { cancelled = true };
  }, []);

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const grouped = useMemo(() => {
    const groups = new Map<string, PhotoItem[]>();
    for (const item of items) {
      const label = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(item.addedAt);
      groups.set(label, [...(groups.get(label) || []), item]);
    }
    return Array.from(groups.entries());
  }, [items]);

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    const additions: PhotoItem[] = [];
    for (const file of files) {
      const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const meta: PhotoMeta = { id, name: file.name, size: file.size, type: file.type, addedAt: Date.now() };
      await saveBlob(`${PHOTO_PREFIX}${id}`, file);
      const url = URL.createObjectURL(file);
      objectUrls.current.add(url);
      additions.push({ ...meta, url });
    }
    setItems((current) => [...additions, ...current]);
    setMetadata((current) => [...additions.map(({ url: _url, ...meta }) => meta), ...current]);
    event.target.value = '';
  }

  function openPhoto(id: string) {
    setSelectedId(id);
    setZoom(1);
    setRotation(0);
    setInfoOpen(false);
  }

  function closeViewer() {
    setSelectedId(null);
    setSlideshow(false);
    setInfoOpen(false);
  }

  function move(direction: number) {
    if (!items.length || selectedIndex < 0) return;
    openPhoto(items[(selectedIndex + direction + items.length) % items.length].id);
  }

  async function removeSelected() {
    if (!selected) return;
    await deleteBlob(`${PHOTO_PREFIX}${selected.id}`);
    URL.revokeObjectURL(selected.url);
    objectUrls.current.delete(selected.url);
    const remaining = items.filter((item) => item.id !== selected.id);
    setItems(remaining);
    setMetadata((current) => current.filter((item) => item.id !== selected.id));
    if (!remaining.length) closeViewer();
    else openPhoto(remaining[Math.min(selectedIndex, remaining.length - 1)].id);
  }

  function downloadSelected() {
    if (!selected) return;
    const anchor = document.createElement('a');
    anchor.href = selected.url;
    anchor.download = selected.name;
    anchor.click();
  }

  async function enterFullscreen() {
    if (!viewer.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await viewer.current.requestFullscreen();
  }

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeViewer();
      if (event.key === 'ArrowLeft') move(-1);
      if (event.key === 'ArrowRight') move(1);
      if (event.key === '+' || event.key === '=') setZoom((value) => Math.min(4, value + .25));
      if (event.key === '-') setZoom((value) => Math.max(.25, value - .25));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, selectedIndex, items]);

  useEffect(() => {
    if (!slideshow || !selected) return;
    const timer = window.setInterval(() => move(1), 3500);
    return () => window.clearInterval(timer);
  }, [slideshow, selectedId, selectedIndex, items]);

  return <div className="photos-app">
    <header className="photos-commandbar">
      <div><h1>Фотографии</h1><span>{items.length ? `${items.length} изображений` : 'Личная коллекция'}</span></div>
      <label className="photos-add"><input type="file" accept="image/*" multiple onChange={addPhotos}/><b>＋</b> Добавить фотографии</label>
    </header>
    <main className="photos-library">
      {loading && <div className="photos-loading"><i/><span>Загружаем библиотеку…</span></div>}
      {!loading && !items.length && <div className="photos-empty">
        <div className="photos-empty-art"><span>▧</span><i/><i/><i/></div>
        <h2>Здесь появятся ваши воспоминания</h2>
        <p>Добавьте фотографии с компьютера. Они сохранятся в DimaOS после перезапуска.</p>
        <label className="photos-add large"><input type="file" accept="image/*" multiple onChange={addPhotos}/>Выбрать фотографии</label>
      </div>}
      {grouped.map(([month, photos]) => <section className="photos-group" key={month}>
        <h2>{month}</h2><div className="photos-grid">{photos.map((photo) => <button key={photo.id} onClick={() => openPhoto(photo.id)} title={photo.name}>
          <img src={photo.url} alt={photo.name}/><span>{photo.name}</span>
        </button>)}</div>
      </section>)}
    </main>
    {selected && <div className="photo-viewer" ref={viewer}>
      <header>
        <button onClick={closeViewer} title="Назад">←</button>
        <div><b>{selected.name}</b><span>{selectedIndex + 1} из {items.length}</span></div>
        <nav>
          <button className={slideshow ? 'active' : ''} onClick={() => setSlideshow((value) => !value)} title="Слайд-шоу">{slideshow ? 'Ⅱ' : '▶'}</button>
          <button onClick={() => setInfoOpen((value) => !value)} title="Сведения">ⓘ</button>
          <button onClick={enterFullscreen} title="Полный экран">⛶</button>
          <button onClick={downloadSelected} title="Сохранить копию">⇩</button>
          <button className="danger" onClick={removeSelected} title="Удалить">♲</button>
        </nav>
      </header>
      <div className="photo-stage" onDoubleClick={() => setZoom((value) => value === 1 ? 2 : 1)}>
        <button className="photo-previous" onClick={() => move(-1)} aria-label="Предыдущее фото">‹</button>
        <img src={selected.url} alt={selected.name} draggable={false} style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}/>
        <button className="photo-next" onClick={() => move(1)} aria-label="Следующее фото">›</button>
      </div>
      <footer className="photo-tools">
        <button onClick={() => setZoom((value) => Math.max(.25, value - .25))}>−</button>
        <input type="range" min="25" max="400" value={zoom * 100} onChange={(event) => setZoom(Number(event.target.value) / 100)}/>
        <span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(4, value + .25))}>＋</button><i/>
        <button onClick={() => setRotation((value) => value - 90)} title="Повернуть влево">↶</button>
        <button onClick={() => setRotation((value) => value + 90)} title="Повернуть вправо">↷</button>
        <button onClick={() => { setZoom(1); setRotation(0) }}>По размеру</button>
      </footer>
      {infoOpen && <aside className="photo-info"><h2>Сведения о файле</h2><img src={selected.url} alt="Миниатюра"/><dl>
        <dt>Имя</dt><dd>{selected.name}</dd><dt>Тип</dt><dd>{selected.type || 'Изображение'}</dd>
        <dt>Размер</dt><dd>{formatSize(selected.size)}</dd><dt>Добавлено</dt><dd>{new Date(selected.addedAt).toLocaleString('ru-RU')}</dd>
      </dl></aside>}
    </div>}
  </div>;
}
