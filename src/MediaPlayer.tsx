import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type RefObject,
} from 'react';
import {
  deleteBlob,
  listBlobKeys,
  loadBlob,
  readSetting,
  saveBlob,
  usePersistentState,
  writeSetting,
} from './storage';

type MediaKind = 'audio' | 'video';

type Track = {
  id: string;
  name: string;
  artist: string;
  album: string;
  kind: MediaKind;
  size: number;
  addedAt: string;
  duration?: number;
  objectUrl?: string;
};

type RepeatMode = 'off' | 'all' | 'one';

const TRACKS_KEY = 'player.library';

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatBytes(value: number): string {
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(0)} КБ`;
  return `${(value / 1024 ** 2).toFixed(1)} МБ`;
}

function metadataFromName(name: string): Pick<Track, 'name' | 'artist' | 'album'> {
  const clean = name.replace(/\.[^.]+$/, '');
  const parts = clean.split(' - ');
  if (parts.length >= 2) {
    return {
      artist: parts[0].trim(),
      name: parts.slice(1).join(' - ').trim(),
      album: 'Локальная медиатека',
    };
  }
  return {
    name: clean,
    artist: 'Неизвестный исполнитель',
    album: 'Локальная медиатека',
  };
}

function randomGradient(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = seed.charCodeAt(index) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(145deg, hsl(${hue} 70% 62%), hsl(${(hue + 62) % 360} 65% 32%))`;
}

export default function MediaPlayer() {
  const [library, setLibrary] = useState<Track[]>(() => readSetting<Track[]>(TRACKS_KEY, []));
  const [activeId, setActiveId] = usePersistentState<string | null>('player.active', null);
  const [volume, setVolume] = usePersistentState('player.volume', 0.72);
  const [repeat, setRepeat] = usePersistentState<RepeatMode>('player.repeat', 'off');
  const [shuffle, setShuffle] = usePersistentState('player.shuffle', false);
  const [view, setView] = usePersistentState<'home' | 'music' | 'video' | 'playlist'>('player.view', 'home');
  const [favorites, setFavorites] = usePersistentState<string[]>('player.favorites', []);
  const [queue, setQueue] = usePersistentState<string[]>('player.queue', []);
  const [search, setSearch] = useState('');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [visualizer, setVisualizer] = useState<number[]>(Array.from({ length: 40 }, () => 15));
  const media = useRef<HTMLMediaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    writeSetting(
      TRACKS_KEY,
      library.map(({ objectUrl, ...track }) => track),
    );
  }, [library]);

  const activeTrack = library.find((track) => track.id === activeId) || null;

  useEffect(() => {
    async function restoreLibrary() {
      const keys = new Set(await listBlobKeys());
      const restored = await Promise.all(
        library.map(async (track) => {
          if (!keys.has(`media:${track.id}`)) return track;
          const blob = await loadBlob(`media:${track.id}`);
          return blob ? { ...track, objectUrl: URL.createObjectURL(blob) } : track;
        }),
      );
      if (restored.some((track, index) => track.objectUrl !== library[index]?.objectUrl)) {
        setLibrary(restored);
      }
    }
    restoreLibrary();
  }, []);

  useEffect(() => {
    if (media.current) {
      media.current.volume = volume;
      media.current.muted = muted;
    }
  }, [volume, muted, activeId]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setVisualizer(Array.from({ length: 40 }, () => 9 + Math.random() * 82));
    }, 180);
    return () => clearInterval(timer);
  }, [playing]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return library.filter((track) => {
      if (view === 'music' && track.kind !== 'audio') return false;
      if (view === 'video' && track.kind !== 'video') return false;
      if (view === 'playlist' && !favorites.includes(track.id)) return false;
      return !query || `${track.name} ${track.artist} ${track.album}`.toLowerCase().includes(query);
    });
  }, [library, search, view, favorites]);

  async function addFiles(files: File[]) {
    const accepted = files.filter(
      (file) => file.type.startsWith('audio/') || file.type.startsWith('video/'),
    );
    if (!accepted.length) return;

    const created: Track[] = [];
    for (const file of accepted) {
      const id = crypto.randomUUID();
      const metadata = metadataFromName(file.name);
      const track: Track = {
        id,
        ...metadata,
        kind: file.type.startsWith('video/') ? 'video' : 'audio',
        size: file.size,
        addedAt: new Date().toISOString(),
        objectUrl: URL.createObjectURL(file),
      };
      created.push(track);
      await saveBlob(`media:${id}`, file);
    }

    setLibrary((value) => [...value, ...created]);
    setQueue((value) => [...value, ...created.map((track) => track.id)]);
    if (!activeId && created[0]) setActiveId(created[0].id);
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files || []));
    event.target.value = '';
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function chooseTrack(id: string, autoplay = true) {
    setActiveId(id);
    setCurrentTime(0);
    setDuration(0);
    if (!queue.includes(id)) setQueue((value) => [...value, id]);
    if (autoplay) {
      window.setTimeout(() => {
        media.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      });
    }
  }

  function togglePlay() {
    if (!media.current) return;
    if (!activeTrack && library[0]) {
      chooseTrack(library[0].id);
      return;
    }
    if (media.current.paused) {
      media.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      media.current.pause();
      setPlaying(false);
    }
  }

  function nextTrack() {
    if (!library.length) return;
    if (shuffle) {
      const candidates = library.filter((track) => track.id !== activeId);
      const random = candidates[Math.floor(Math.random() * candidates.length)] || library[0];
      chooseTrack(random.id);
      return;
    }
    const ordered = queue.length ? queue : library.map((track) => track.id);
    const currentIndex = Math.max(0, ordered.indexOf(activeId || ''));
    const nextIndex = currentIndex + 1;
    if (nextIndex < ordered.length) chooseTrack(ordered[nextIndex]);
    else if (repeat === 'all') chooseTrack(ordered[0]);
    else setPlaying(false);
  }

  function previousTrack() {
    if (currentTime > 4 && media.current) {
      media.current.currentTime = 0;
      return;
    }
    const ordered = queue.length ? queue : library.map((track) => track.id);
    const currentIndex = ordered.indexOf(activeId || '');
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : ordered.length - 1;
    if (ordered[previousIndex]) chooseTrack(ordered[previousIndex]);
  }

  function handleEnded() {
    if (repeat === 'one' && media.current) {
      media.current.currentTime = 0;
      media.current.play();
      return;
    }
    nextTrack();
  }

  function seek(value: number) {
    if (!media.current) return;
    media.current.currentTime = value;
    setCurrentTime(value);
  }

  function cycleRepeat() {
    setRepeat((value) => value === 'off' ? 'all' : value === 'all' ? 'one' : 'off');
  }

  function toggleFavorite(id: string) {
    setFavorites((value) =>
      value.includes(id) ? value.filter((item) => item !== id) : [...value, id],
    );
  }

  async function removeTrack(id: string) {
    const track = library.find((item) => item.id === id);
    if (track?.objectUrl) URL.revokeObjectURL(track.objectUrl);
    await deleteBlob(`media:${id}`);
    setLibrary((value) => value.filter((item) => item.id !== id));
    setQueue((value) => value.filter((item) => item !== id));
    setFavorites((value) => value.filter((item) => item !== id));
    if (activeId === id) {
      setActiveId(null);
      setPlaying(false);
    }
  }

  function clearQueue() {
    setQueue(activeId ? [activeId] : []);
  }

  function openPictureInPicture() {
    if (!media.current || activeTrack?.kind !== 'video') return;
    const video = media.current as HTMLVideoElement;
    if (document.pictureInPictureElement) document.exitPictureInPicture();
    else if (video.requestPictureInPicture) video.requestPictureInPicture();
  }

  return (
    <div
      className={`media-player ${dragging ? 'is-dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={handleDrop}
    >
<input
        ref={fileInput}
        type="file"
        accept="audio/*,video/*"
        multiple
        hidden
        onChange={handleFiles}
      />
<aside className="player-sidebar">
<div className="player-brand">
<span>▶</span>
<b>Dima Player</b>
</div>
<button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>
<i>⌂</i>Главная</button>
<button className={view === 'music' ? 'active' : ''} onClick={() => setView('music')}>
<i>♫</i>Музыка</button>
<button className={view === 'video' ? 'active' : ''} onClick={() => setView('video')}>
<i>▶</i>Видео</button>
<button className={view === 'playlist' ? 'active' : ''} onClick={() => setView('playlist')}>
<i>♥</i>Избранное</button>
<small>Медиатека</small>
<button onClick={() => setShowQueue(!showQueue)}>
<i>☷</i>Очередь <em>{queue.length}</em>
</button>
<button onClick={() => fileInput.current?.click()}>
<i>＋</i>Добавить файлы</button>
<div className="sidebar-fill" />
<div className="library-info">
<span>{library.length} файлов</span>
<small>{formatBytes(library.reduce((sum, track) => sum + track.size, 0))}</small>
</div>
</aside>
<main className="player-main">
<header className="player-header">
<div>
<h1>{view === 'home' ? 'Добро пожаловать' : view === 'music' ? 'Музыка' : view === 'video' ? 'Видео' : 'Избранное'}</h1>
<p>Ваша личная медиатека DimaOS</p>
</div>
<label className="player-search">
<span>⌕</span>
<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск в медиатеке" />
</label>
<button className="add-media" onClick={() => fileInput.current?.click()}>＋ Добавить файлы</button>
</header>

        {activeTrack && (
          <section className={`now-playing-stage ${activeTrack.kind}`} style={{ '--cover': randomGradient(activeTrack.name) } as CSSProperties}>
            {activeTrack.kind === 'video' ? (
              <video
                ref={media as RefObject<HTMLVideoElement>}
                src={activeTrack.objectUrl}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={handleEnded}
                onDoubleClick={(event) => event.currentTarget.requestFullscreen()}
              />
            ) : (
              <audio
                ref={media as RefObject<HTMLAudioElement>}
                src={activeTrack.objectUrl}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={handleEnded}
              />
            )}
            {activeTrack.kind === 'audio' && (
              <div className="audio-cover" style={{ background: randomGradient(activeTrack.name) }}>
<span>♫</span>
<div className="visualizer">{visualizer.map((value, index) =>
<i key={index} style={{ height: `${value}%` }} />)}</div>
</div>
            )}
            <div className="stage-meta">
<span>{activeTrack.kind === 'video' ? 'Сейчас воспроизводится' : 'Dima Hi-Fi Audio'}</span>
<h2>{activeTrack.name}</h2>
<p>{activeTrack.artist} · {activeTrack.album}</p>
</div>
            {activeTrack.kind === 'video' && <button className="pip-button" onClick={openPictureInPicture}>▣ Картинка в картинке</button>}
          </section>
        )}

        {!activeTrack && (
          <section className="empty-player-hero">
<div className="empty-disc">
<i />
<span>♫</span>
</div>
<div>
<span>ВАША МУЗЫКА. ВАШИ ПРАВИЛА.</span>
<h2>Добавьте музыку<br />или видео</h2>
<p>Файлы сохраняются локально в DimaOS и остаются в медиатеке после перезапуска.</p>
<button onClick={() => fileInput.current?.click()}>Выбрать медиафайлы</button>
</div>
</section>
        )}

        <section className="media-library">
<div className="library-heading">
<div>
<h2>{search ? 'Результаты поиска' : 'Медиатека'}</h2>
<span>{filtered.length} элементов</span>
</div>
<button onClick={() => setShuffle(!shuffle)} className={shuffle ? 'active' : ''}>⤨ Перемешать</button>
</div>
<div className="track-table">
<div className="track-table-head">
<span>#</span>
<span>Название</span>
<span>Альбом</span>
<span>Добавлено</span>
<span>Размер</span>
<span>♡</span>
<span />
</div>
            {filtered.map((track, index) => (
              <button key={track.id} className={track.id === activeId ? 'active' : ''} onDoubleClick={() => chooseTrack(track.id)}>
<span>{track.id === activeId && playing ? '▶' : index + 1}</span>
<span className="track-title">
<i style={{ background: randomGradient(track.name) }}>{track.kind === 'video' ? '▶' : '♫'}</i>
<b>{track.name}<small>{track.artist}</small>
</b>
</span>
<span>{track.album}</span>
<span>{new Date(track.addedAt).toLocaleDateString('ru-RU')}</span>
<span>{formatBytes(track.size)}</span>
<span className={favorites.includes(track.id) ? 'favorite' : ''} onClick={(event) => { event.stopPropagation(); toggleFavorite(track.id); }}>♥</span>
<span onClick={(event) => { event.stopPropagation(); removeTrack(track.id); }}>•••</span>
</button>
            ))}
            {!filtered.length && <div className="library-empty">
<span>♫</span>
<p>В этом разделе пока нет медиафайлов.</p>
</div>}
          </div>
</section>
</main>

      {showQueue && (
        <aside className="player-queue">
<header>
<div>
<h3>Очередь</h3>
<span>{queue.length} треков</span>
</div>
<button onClick={() => setShowQueue(false)}>×</button>
</header>
<div className="queue-actions">
<button onClick={clearQueue}>Очистить</button>
<button onClick={() => setShuffle(!shuffle)}>⤨</button>
</div>
<div className="queue-list">
            {queue.map((id, index) => {
              const track = library.find((item) => item.id === id);
              if (!track) return null;
              return <button key={`${id}-${index}`} className={id === activeId ? 'active' : ''} onClick={() => chooseTrack(id)}>
<i style={{ background: randomGradient(track.name) }}>{track.kind === 'video' ? '▶' : '♫'}</i>
<span>
<b>{track.name}</b>
<small>{track.artist}</small>
</span>
<em onClick={(event) => { event.stopPropagation(); setQueue((value) => value.filter((_, queueIndex) => queueIndex !== index)); }}>×</em>
</button>;
            })}
          </div>
</aside>
      )}

      <footer className="player-controls">
<div className="control-track">
          {activeTrack ? <>
<i style={{ background: randomGradient(activeTrack.name) }}>{activeTrack.kind === 'video' ? '▶' : '♫'}</i>
<span>
<b>{activeTrack.name}</b>
<small>{activeTrack.artist}</small>
</span>
<button className={favorites.includes(activeTrack.id) ? 'favorite' : ''} onClick={() => toggleFavorite(activeTrack.id)}>♥</button>
</> : <span>
<b>Ничего не выбрано</b>
<small>Добавьте файл в медиатеку</small>
</span>}
        </div>
<div className="control-center">
<div className="transport">
<button className={shuffle ? 'active' : ''} onClick={() => setShuffle(!shuffle)}>⤨</button>
<button onClick={previousTrack}>◀</button>
<button className="play-button" onClick={togglePlay}>{playing ? 'Ⅱ' : '▶'}</button>
<button onClick={nextTrack}>▶</button>
<button className={repeat !== 'off' ? 'active' : ''} onClick={cycleRepeat}>{repeat === 'one' ? '↻¹' : '↻'}</button>
</div>
<div className="seek-row">
<span>{formatTime(currentTime)}</span>
<input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(currentTime, duration || 1)} onChange={(event) => seek(Number(event.target.value))} />
<span>{formatTime(duration)}</span>
</div>
</div>
<div className="control-volume">
<button onClick={() => setShowQueue(!showQueue)}>☷</button>
<button onClick={() => setMuted(!muted)}>{muted || volume === 0 ? '🔇' : volume < 0.45 ? '🔉' : '🔊'}</button>
<input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
</div>
</footer>

      {dragging && <div className="media-drop-overlay">
<span>＋</span>
<h2>Добавить в Dima Player</h2>
<p>Отпустите аудио или видеофайлы здесь</p>
</div>}
    </div>
  );
}
