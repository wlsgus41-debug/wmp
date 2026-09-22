import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ThumbnailView } from './components/ThumbnailView';
import { LyricsView } from './components/LyricsView';
import { Player } from './components/Player';
import { SearchBar } from './components/SearchBar';
import { QueueList } from './components/QueueList';
import { PanelLeftOpen, PanelRightOpen, WifiOff, HardDrive } from 'lucide-react';
import type { Track } from './types';

export function App() {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [, setDuration] = useState(0);
  const [seekTime, setSeekTime] = useState<number | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [externalSearchQuery, setExternalSearchQuery] = useState('');

  // Panel visibility
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);

  // Offline network detection
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [offlineToast, setOfflineToast] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setOfflineToast('네트워크에 연결되었습니다. 온라인 스트리밍을 이용할 수 있습니다. 🌐');
      const timer = setTimeout(() => setOfflineToast(null), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setOfflineToast('오프라인 모드: 인터넷이 연결되지 않아 내 PC 로컬 파일만 재생됩니다. 📁');
      const timer = setTimeout(() => setOfflineToast(null), 4500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const currentIndex = currentTrack
    ? queue.findIndex(t => t.id === currentTrack.id || (t.videoId && t.videoId === currentTrack.videoId))
    : -1;
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;

  const handlePlayTrack = (track: Track) => {
    // Block online streaming track in offline mode
    if (isOffline && !track.isLocal) {
      setOfflineToast('오프라인 상태입니다. 내 PC에 저장된 로컬 파일만 재생할 수 있습니다. 📁');
      setTimeout(() => setOfflineToast(null), 3500);
      return;
    }

    setCurrentTrack(track);
    setIsPlaying(true);
    if (!queue.some(t => t.id === track.id || (track.videoId && t.videoId === track.videoId))) {
      setQueue(prev => [track, ...prev]);
    }
  };

  const handleAddToQueue = (track: Track) => {
    if (isOffline && !track.isLocal) {
      setOfflineToast('오프라인 상태에서는 온라인 곡을 대기열에 추가할 수 없습니다.');
      setTimeout(() => setOfflineToast(null), 3500);
      return;
    }
    if (!queue.some(t => t.id === track.id || (track.videoId && t.videoId === track.videoId))) {
      setQueue(prev => [...prev, track]);
    }
  };

  const handleNext = () => {
    if (queue.length === 0) return;
    const targetQueue = isOffline ? queue.filter(t => t.isLocal) : queue;
    if (targetQueue.length === 0) {
      setIsPlaying(false);
      return;
    }

    const curId = currentTrack?.id;
    const idx = targetQueue.findIndex(t => t.id === curId || (t.videoId && t.videoId === currentTrack?.videoId));
    if (idx >= 0 && idx < targetQueue.length - 1) {
      setCurrentTrack(targetQueue[idx + 1]);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrev = () => {
    if (queue.length === 0) return;
    const targetQueue = isOffline ? queue.filter(t => t.isLocal) : queue;
    if (targetQueue.length === 0) {
      setIsPlaying(false);
      return;
    }

    const curId = currentTrack?.id;
    const idx = targetQueue.findIndex(t => t.id === curId || (t.videoId && t.videoId === currentTrack?.videoId));
    if (idx > 0) {
      setCurrentTrack(targetQueue[idx - 1]);
      setIsPlaying(true);
    } else if (targetQueue.length > 0) {
      setCurrentTrack(targetQueue[targetQueue.length - 1]);
      setIsPlaying(true);
    }
  };

  const handleToggleVideoMode = () => {
    if (currentTrack) {
      setCurrentTrack(prev => prev ? { ...prev, isVideo: !prev.isVideo } : null);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none">
      {/* Top Search & Header */}
      <SearchBar
        onPlayTrack={handlePlayTrack}
        onAddToQueue={handleAddToQueue}
        externalSearchQuery={externalSearchQuery}
        onClearExternalQuery={() => setExternalSearchQuery('')}
        isOffline={isOffline}
      />

      {/* Offline Status Alert Banner */}
      {isOffline && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-6 py-1.5 flex items-center justify-between text-xs text-amber-300 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-bold">오프라인 모드 활성화:</span>
            <span className="text-zinc-300">
              인터넷 연결이 없습니다. 내 PC에 저장된 로컬 파일(.mp3, .wav, .flac, .mp4 등)만 감상하실 수 있습니다.
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 font-extrabold border border-amber-500/40">
            LOCAL ONLY
          </span>
        </div>
      )}

      {/* Floating Offline Toast Notification */}
      {offlineToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 border border-amber-500/60 text-amber-200 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-2xl flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{offlineToast}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">

        {/* ─── Left Sidebar (Chart / New songs / MV / Year / Local) ─── */}
        <div className={`relative flex shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${showLeft ? 'w-80 md:w-96' : 'w-0'}`}>
          <div className={`w-80 md:w-96 h-full transition-opacity duration-300 ${showLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <Sidebar
              onPlayTrack={handlePlayTrack}
              onAddToQueue={handleAddToQueue}
              currentTrackId={currentTrack?.title}
              isPlaying={isPlaying}
              onClose={() => setShowLeft(false)}
              isOffline={isOffline}
            />
          </div>
        </div>

        {/* Center: Thumbnail Artwork or Music Video Player */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-950/40 via-zinc-900/30 to-zinc-950/90 overflow-hidden relative">
          {/* Re-open Left Panel Button (visible when left panel is closed) */}
          {!showLeft && (
            <button
              onClick={() => setShowLeft(true)}
              title="차트 / 신곡 / 메뉴 열기"
              className="absolute left-3 top-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 border border-rose-400/30 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <PanelLeftOpen className="w-4 h-4" />
              <span>차트 열기</span>
            </button>
          )}

          {/* Re-open Right Panel Button (visible when right panel is closed) */}
          {!showRight && (
            <button
              onClick={() => setShowRight(true)}
              title="가사 및 실시간 검색어 열기"
              className="absolute right-3 top-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <span>가사 열기</span>
              <PanelRightOpen className="w-4 h-4" />
            </button>
          )}

          <ThumbnailView
            track={currentTrack}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onToggleVideoMode={handleToggleVideoMode}
          />
        </div>

        {/* ─── Right Lyrics Panel ─── */}
        <div className={`relative flex shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${showRight ? 'w-80 md:w-96' : 'w-0'}`}>
          <div className={`w-80 md:w-96 h-full transition-opacity duration-300 ${showRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <LyricsView
              track={currentTrack}
              currentTime={currentTime}
              onSeek={(time) => setSeekTime(time)}
              onSearchKeyword={(kw) => setExternalSearchQuery(kw)}
              onPlayTrack={handlePlayTrack}
              onClose={() => setShowRight(false)}
            />
          </div>
        </div>
      </main>

      {/* Bottom Player (Unified for Audio & Video, Mouse wheel volume enabled) */}
      <Player
        track={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onNext={handleNext}
        onPrev={handlePrev}
        onTimeUpdate={(t) => setCurrentTime(t)}
        onDurationUpdate={(d) => setDuration(d)}
        seekTime={seekTime}
        onSeekComplete={() => setSeekTime(null)}
        onToggleQueue={() => setIsQueueOpen(!isQueueOpen)}
        isQueueOpen={isQueueOpen}
        onToggleVideoMode={handleToggleVideoMode}
        hasNext={hasNext}
      />

      {/* Queue Modal */}
      <QueueList
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={queue}
        currentTrack={currentTrack}
        onSelectTrack={(track) => {
          if (isOffline && !track.isLocal) {
            setOfflineToast('오프라인 상태에서는 내 PC 로컬 파일만 재생할 수 있습니다.');
            setTimeout(() => setOfflineToast(null), 3500);
            return;
          }
          setCurrentTrack(track);
          setIsPlaying(true);
        }}
        onRemoveTrack={(idx) => {
          setQueue(prev => prev.filter((_, i) => i !== idx));
        }}
        onClearQueue={() => setQueue([])}
      />
    </div>
  );
}

export default App;
