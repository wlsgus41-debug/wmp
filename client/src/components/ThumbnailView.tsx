import React from 'react';
import { Disc3, Play, Pause, Film, Music2 } from 'lucide-react';
import type { Track } from '../types';

interface ThumbnailViewProps {
  track: Track | null;
  isPlaying: boolean;
  onTogglePlay?: () => void;
  onToggleVideoMode?: () => void;
  onWheelVolume?: (delta: number) => void;
}

export const ThumbnailView: React.FC<ThumbnailViewProps> = ({
  track,
  isPlaying,
  onTogglePlay,
  onToggleVideoMode,
  onWheelVolume,
}) => {
  if (!track) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full border-4 border-dashed border-zinc-800 flex items-center justify-center bg-zinc-900/30">
          <Disc3 className="w-24 h-24 text-zinc-700 animate-spin-slow animate-spin-pause" />
        </div>
        <h3 className="mt-8 text-lg font-semibold text-zinc-300">재생 중인 노래가 없습니다</h3>
        <p className="text-xs text-zinc-500 mt-2 max-w-sm">
          왼쪽 실시간 차트/뮤직비디오나 상단 검색창에서 음악을 선택하여 감상해보세요.
        </p>
      </div>
    );
  }

  // If video mode is active
  if (track.isVideo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 w-full max-w-4xl relative">
        {/* Dynamic Glow */}
        <div
          className="absolute w-[500px] h-[350px] rounded-full blur-[140px] opacity-25 pointer-events-none -z-10"
          style={{
            backgroundImage: `radial-gradient(circle, #9333ea 0%, #ec4899 100%)`
          }}
        />

        {/* Video Mode Header Switch */}
        <div className="w-full flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/40 flex items-center gap-1.5 shadow-sm">
              <Film className="w-3.5 h-3.5" /> 공식 뮤직비디오
            </span>
            <span className="text-[11px] text-zinc-400">광고 자동 차단 적용</span>
          </div>

          <button
            onClick={onToggleVideoMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs font-medium transition shadow"
          >
            <Music2 className="w-3.5 h-3.5 text-rose-400" /> 앨범 아트 모드로 전환
          </button>
        </div>

        {/* Responsive YouTube Video Container */}
        <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black relative group">
          {/* Target for YouTube Player attachment in video mode */}
          <div id="youtube-video-container" className="w-full h-full" />
        </div>

        {/* Video Info Details */}
        <div className="mt-4 text-center w-full px-4">
          <h1 className="text-lg md:text-xl font-bold text-white tracking-tight line-clamp-1">
            {track.title}
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 font-medium mt-1 truncate">
            {track.artist}
          </p>
        </div>
      </div>
    );
  }

  // Convert platform cover URLs to high resolution
  const getHighResCover = (url?: string) => {
    if (!url) return '';
    let res = url;
    // Melon: convert resize dimensions to high quality
    if (res.includes('melon.co.kr')) {
      res = res.replace(/\/resize\/\d+\/quality\/\d+\/optimize/, '/resize/500/quality/90/optimize');
    }
    // Bugs: upscale album images
    if (res.includes('bugsm.co.kr')) {
      res = res.replace(/\/album\/images\/\d+\//, '/album/images/500/');
    }
    // Genie: upscale cover images to 600x600
    if (res.includes('genie.co.kr')) {
      res = res.replace(/140x140|200x200/, '600x600');
    }
    // YouTube
    if (res.includes('i.ytimg.com') || res.includes('youtube.com')) {
      res = res.replace('default.jpg', 'hqdefault.jpg');
    }
    return res;
  };

  const highResThumbnail = getHighResCover(track.thumbnail);

  return (
    <div
      onWheel={(e) => {
        const delta = e.deltaY < 0 ? 5 : -5;
        window.dispatchEvent(new CustomEvent('wmp-volume-wheel', { detail: delta }));
        onWheelVolume?.(delta);
      }}
      title="마우스 휠 스크롤로 음향(볼륨) 조절 가능"
      className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden select-none"
    >
      {/* Dynamic Ambient Glow based on artwork */}
      <div
        className="absolute w-96 h-96 rounded-full blur-[140px] opacity-25 pointer-events-none -z-10 transition-all duration-1000"
        style={{
          backgroundImage: `radial-gradient(circle, #f43f5e 0%, #6366f1 100%)`
        }}
      />

      {/* Main Thumbnail Artwork with Vinyl Aesthetic */}
      <div className="relative group">
        {/* Animated Vinyl Behind Cover */}
        <div
          className={`absolute -right-6 md:-right-10 top-2 w-56 h-56 md:w-72 md:h-72 rounded-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-950 border-4 border-zinc-800 shadow-2xl flex items-center justify-center transition-transform duration-700 -z-10 ${
            isPlaying ? 'translate-x-12 md:translate-x-20 rotate-45' : 'translate-x-0'
          }`}
        >
          {/* Grooves */}
          <div className="w-44 h-44 md:w-56 md:h-56 rounded-full border border-zinc-800 flex items-center justify-center">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border border-zinc-700/40 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/80 border-2 border-zinc-900 flex items-center justify-center shadow-inner">
                <div className="w-4 h-4 rounded-full bg-zinc-950" />
              </div>
            </div>
          </div>
        </div>

        {/* Square Album Art / Thumbnail Container */}
        <div
          onClick={onTogglePlay}
          className={`relative w-60 h-60 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-zinc-900 transition-all duration-500 cursor-pointer ${
            isPlaying ? 'shadow-rose-500/20 scale-[1.02]' : 'shadow-black/60'
          }`}
        >
          {highResThumbnail ? (
            <img
              src={highResThumbnail}
              alt={track.title}
              onError={(e) => {
                // Fallback to original thumbnail if high-res fails
                if (track.thumbnail && (e.target as HTMLImageElement).src !== track.thumbnail) {
                  (e.target as HTMLImageElement).src = track.thumbnail;
                }
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-600">
              <Disc3 className="w-20 h-20" />
            </div>
          )}

          {/* Hover / Inactive Center Play Button Overlay */}
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity duration-300 ${
              isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 transform group-hover:scale-110 active:scale-95 transition">
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </div>
          </div>

          {/* Status Badge (Streaming / Local) */}
          {isPlaying && (
            <div
              className={`absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border flex items-center gap-1.5 shadow-lg ${
                track.isLocal ? 'border-zinc-700/60' : 'border-lime-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  track.isLocal ? 'bg-zinc-400' : 'bg-lime-400'
                }`}
              />
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  track.isLocal ? 'text-zinc-400' : 'text-lime-400'
                }`}
              >
                {track.isLocal ? 'Local' : 'Streaming'}
              </span>
            </div>
          )}

          {/* 1-min preview badge */}
          {track.isPreview && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-500/90 text-zinc-950 font-bold text-[10px] shadow-lg">
              1분 미리듣기
            </div>
          )}

          {/* Source Badge */}
          {track.source && (
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-zinc-950/80 backdrop-blur-md border border-zinc-700/50 text-[10px] font-medium text-zinc-300">
              {track.source.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Song Information Details */}
      <div className="mt-8 text-center max-w-md w-full px-4">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight line-clamp-1">
            {track.title}
          </h1>
        </div>

        <p className="text-sm md:text-base text-zinc-400 font-medium mt-1 truncate">
          {track.artist}
        </p>

        {track.album && (
          <p className="text-xs text-zinc-500 mt-0.5 truncate">
            {track.album}
          </p>
        )}

        {/* Audio Visualizer Waves Indicator */}
        <div className="flex items-center justify-center gap-1 mt-5 h-6">
          {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50, 80, 65, 30].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full bg-gradient-to-t from-rose-500 to-indigo-500 transition-all duration-300 ${
                isPlaying ? 'opacity-90' : 'opacity-20 !h-1'
              }`}
              style={{
                height: isPlaying ? `${Math.max(15, (h + (i % 3) * 10))}%` : '4px',
                animation: isPlaying ? `pulse 0.8s ease-in-out infinite alternate ${i * 0.08}s` : 'none'
              }}
            />
          ))}
        </div>

        {/* Mode Switch to Video (if video available) */}
        {onToggleVideoMode && (
          <div className="flex items-center justify-center mt-4">
            <button
              onClick={onToggleVideoMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 hover:bg-purple-600/90 text-zinc-300 hover:text-white border border-zinc-700/60 text-xs font-medium transition shadow-md backdrop-blur-md"
              title="뮤직비디오 화면으로 전환"
            >
              <Film className="w-3.5 h-3.5 text-purple-400 group-hover:text-white" />
              <span>뮤직비디오 보기</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
