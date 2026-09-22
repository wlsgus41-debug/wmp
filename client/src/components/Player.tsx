import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  ListMusic,
  AlertCircle,
  Film,
  Music2,
  HardDrive,
  Subtitles
} from 'lucide-react';
import type { Track } from '../types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface PlayerProps {
  track: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onTimeUpdate: (time: number) => void;
  onDurationUpdate: (duration: number) => void;
  seekTime: number | null;
  onSeekComplete: () => void;
  onToggleQueue: () => void;
  isQueueOpen: boolean;
  onToggleVideoMode?: () => void;
  hasNext?: boolean;
}

export const Player: React.FC<PlayerProps> = ({
  track,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onTimeUpdate,
  onDurationUpdate,
  seekTime,
  onSeekComplete,
  onToggleQueue,
  isQueueOpen,
  onToggleVideoMode,
  hasNext = false,
}) => {
  const ytPlayerRef = useRef<any>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Latest callback and state refs for event listeners
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  const onTogglePlayRef = useRef(onTogglePlay);
  onTogglePlayRef.current = onTogglePlay;
  const hasNextRef = useRef(hasNext);
  hasNextRef.current = hasNext;
  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const trackRef = useRef(track);
  trackRef.current = track;

  // Track already ended guard
  const hasTriggeredNextRef = useRef(false);

  // Initialize YouTube Iframe API if online
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const checkAndInit = () => {
      if (window.YT && window.YT.Player) {
        if (!ytPlayerRef.current) {
          ytPlayerRef.current = new window.YT.Player('youtube-audio-engine', {
            height: '100%',
            width: '100%',
            videoId: track?.videoId || '',
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              enablejsapi: 1,
              fs: 0,
              rel: 0,
              playsinline: 1,
              iv_load_policy: 3,
              modestbranding: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: (e: any) => {
                setIsPlayerReady(true);
                e.target.setVolume(volume);
                if (track?.videoId && !track?.isLocal) {
                  e.target.loadVideoById(track.videoId);
                }
              },
              onStateChange: (e: any) => {
                if (e.data === 1) {
                  hasTriggeredNextRef.current = false;
                }
                if (e.data === 0) {
                  if (repeatModeRef.current === 'one') {
                    e.target.seekTo(0);
                    e.target.playVideo();
                  } else {
                    if (!hasTriggeredNextRef.current) {
                      hasTriggeredNextRef.current = true;
                      onNextRef.current();
                    }
                  }
                }
              },
              onError: (e: any) => {
                console.warn('YouTube Player Error:', e.data);
                if (e.data === 101 || e.data === 150) {
                  setErrorMsg('이 영상은 외부 재생이 제한되어 다음 곡으로 이동합니다.');
                  setTimeout(() => {
                    setErrorMsg(null);
                    onNextRef.current();
                  }, 2000);
                }
              },
            },
          });
        }
      } else {
        setTimeout(checkAndInit, 200);
      }
    };

    checkAndInit();
  }, []);

  // When track changes
  useEffect(() => {
    hasTriggeredNextRef.current = false;
    setErrorMsg(null);

    if (track?.isLocal && track.fileUrl) {
      // Pause YT player if active
      try {
        ytPlayerRef.current?.pauseVideo?.();
      } catch (e) {}

      // Play local media element
      if (track.isVideo) {
        if (localVideoRef.current) {
          localVideoRef.current.src = track.fileUrl;
          localVideoRef.current.load();
          if (isPlaying) localVideoRef.current.play().catch(() => {});
        }
      } else {
        if (localAudioRef.current) {
          localAudioRef.current.src = track.fileUrl;
          localAudioRef.current.load();
          if (isPlaying) localAudioRef.current.play().catch(() => {});
        }
      }
    } else if (track?.videoId) {
      // Pause local media elements
      localAudioRef.current?.pause();
      localVideoRef.current?.pause();

      if (ytPlayerRef.current && isPlayerReady) {
        try {
          if (typeof ytPlayerRef.current.loadVideoById === 'function') {
            ytPlayerRef.current.loadVideoById(track.videoId);
          }
        } catch (err) {
          console.error('Error loading video by ID:', err);
        }
      }
    }
  }, [track?.id, track?.videoId, track?.fileUrl, isPlayerReady]);

  // Handle Play/Pause toggle
  useEffect(() => {
    if (track?.isLocal) {
      const el = track.isVideo ? localVideoRef.current : localAudioRef.current;
      if (el) {
        if (isPlaying) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      }
    } else if (ytPlayerRef.current && isPlayerReady) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.playVideo?.();
        } else {
          ytPlayerRef.current.pauseVideo?.();
        }
      } catch (err) {
        console.error('Play/Pause error:', err);
      }
    }
  }, [isPlaying, isPlayerReady, track?.isLocal, track?.isVideo]);

  // Handle Volume change & Mute for all engines
  useEffect(() => {
    const effectiveVol = isMuted ? 0 : volume / 100;
    if (localAudioRef.current) localAudioRef.current.volume = effectiveVol;
    if (localVideoRef.current) localVideoRef.current.volume = effectiveVol;
    if (ytPlayerRef.current && isPlayerReady) {
      ytPlayerRef.current.setVolume?.(isMuted ? 0 : volume);
    }
  }, [volume, isMuted, isPlayerReady]);

  // Handle Seek
  useEffect(() => {
    if (seekTime !== null) {
      if (track?.isLocal) {
        const el = track.isVideo ? localVideoRef.current : localAudioRef.current;
        if (el) {
          el.currentTime = seekTime;
          setCurrentTime(seekTime);
        }
      } else if (ytPlayerRef.current && isPlayerReady) {
        try {
          ytPlayerRef.current.seekTo?.(seekTime, true);
          setCurrentTime(seekTime);
        } catch (err) {
          console.error('Seek error:', err);
        }
      }
      onSeekComplete();
    }
  }, [seekTime, isPlayerReady, track?.isLocal, track?.isVideo]);

  // Polling current time, 1-min preview check, and natural track end
  useEffect(() => {
    const interval = setInterval(() => {
      let cur = 0;
      let dur = 0;

      if (track?.isLocal) {
        const el = track.isVideo ? localVideoRef.current : localAudioRef.current;
        if (el) {
          cur = el.currentTime || 0;
          dur = el.duration || 0;
        }
      } else if (ytPlayerRef.current && isPlayerReady) {
        try {
          cur = ytPlayerRef.current.getCurrentTime?.() || 0;
          dur = ytPlayerRef.current.getDuration?.() || 0;
        } catch (e) {}
      }

      if (!isSeeking) {
        setCurrentTime(cur);
      }

      // 1-minute (60 seconds) preview check for unauthenticated service queries
      if (trackRef.current?.isPreview && cur >= 60 && !hasTriggeredNextRef.current && isPlayingRef.current) {
        hasTriggeredNextRef.current = true;

        if (hasNextRef.current) {
          setErrorMsg('이용권 미보유로 1분 미리듣기가 종료되어 다음 곡으로 이동합니다.');
          setTimeout(() => {
            setErrorMsg(null);
            onNextRef.current();
          }, 1500);
        } else {
          setErrorMsg('이용권 미보유로 1분 미리듣기가 종료되었습니다. (다음 곡 없음)');
          // Pause local and YouTube players
          if (trackRef.current?.isLocal) {
            const el = trackRef.current.isVideo ? localVideoRef.current : localAudioRef.current;
            if (el) el.pause();
          } else if (ytPlayerRef.current) {
            try {
              ytPlayerRef.current.pauseVideo?.();
            } catch (e) {}
          }
          onTogglePlayRef.current();
          setTimeout(() => {
            setErrorMsg(null);
          }, 3000);
        }
        return;
      }

      if (dur > 0) {
        setDuration(dur);
        onDurationUpdate(dur);

        // Safety check for auto-next if onStateChange missed
        if (dur > 5 && cur >= dur - 0.5 && !hasTriggeredNextRef.current && isPlayingRef.current) {
          if (repeatModeRef.current === 'one') {
            if (track?.isLocal) {
              const el = track.isVideo ? localVideoRef.current : localAudioRef.current;
              if (el) {
                el.currentTime = 0;
                el.play().catch(() => {});
              }
            } else {
              ytPlayerRef.current?.seekTo?.(0);
              ytPlayerRef.current?.playVideo?.();
            }
          } else {
            hasTriggeredNextRef.current = true;
            onNextRef.current();
          }
        }
      }
      onTimeUpdate(cur);
    }, 250);

    return () => clearInterval(interval);
  }, [isSeeking, isPlayerReady, track?.isLocal, track?.isVideo]);

  // Local media end event handler
  const handleLocalEnded = () => {
    if (repeatModeRef.current === 'one') {
      const el = track?.isVideo ? localVideoRef.current : localAudioRef.current;
      if (el) {
        el.currentTime = 0;
        el.play().catch(() => {});
      }
    } else {
      if (!hasTriggeredNextRef.current) {
        hasTriggeredNextRef.current = true;
        onNextRef.current();
      }
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleSliderSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value);
    if (track?.isPreview) {
      val = Math.min(60, val);
    }
    setCurrentTime(val);
    if (track?.isLocal) {
      const el = track.isVideo ? localVideoRef.current : localAudioRef.current;
      if (el) el.currentTime = val;
    } else if (ytPlayerRef.current && isPlayerReady) {
      ytPlayerRef.current.seekTo?.(val, true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePlayButtonClick = () => {
    onTogglePlay();
  };

  // Keyboard shortcut feedback toast state
  const [toastFeedback, setToastFeedback] = useState<{ text: string; icon?: string } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showShortcutFeedback = (text: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastFeedback({ text });
    toastTimeoutRef.current = setTimeout(() => {
      setToastFeedback(null);
    }, 1200);
  };

  // Toggle Captions function
  const toggleCaptions = () => {
    setIsCaptionsOn(prev => {
      const next = !prev;
      // Handle YouTube captions
      if (ytPlayerRef.current) {
        try {
          if (next) {
            ytPlayerRef.current.loadModule?.('captions');
            ytPlayerRef.current.setOption?.('captions', 'track', { languageCode: 'ko' });
            ytPlayerRef.current.setOption?.('captions', 'reload', true);
          } else {
            ytPlayerRef.current.unloadModule?.('captions');
            ytPlayerRef.current.setOption?.('captions', 'track', {});
          }
        } catch (e) {
          console.warn('YouTube caption toggle error:', e);
        }
      }

      // Handle HTML5 video captions
      if (localVideoRef.current && localVideoRef.current.textTracks) {
        try {
          for (let i = 0; i < localVideoRef.current.textTracks.length; i++) {
            localVideoRef.current.textTracks[i].mode = next ? 'showing' : 'disabled';
          }
        } catch (e) {}
      }

      showShortcutFeedback(next ? '자막 켜짐 (CC ON) 💬' : '자막 꺼짐 (CC OFF) 🔇');
      return next;
    });
  };

  // Mouse wheel volume handler (Up: +5%, Down: -5%)
  const handleWheelVolume = (e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY < 0 ? 5 : -5;
    setVolume(prev => {
      const next = Math.min(100, Math.max(0, prev + delta));
      if (isMuted && next > 0) setIsMuted(false);
      showShortcutFeedback(next === 0 ? '음소거 🔇' : `볼륨 🔊 ${next}%`);
      return next;
    });
  };

  // Window event listener for volume wheel from anywhere in the app
  useEffect(() => {
    const handleCustomWheel = (e: any) => {
      const delta = e.detail || 0;
      setVolume(prev => {
        const next = Math.min(100, Math.max(0, prev + delta));
        if (isMuted && next > 0) setIsMuted(false);
        showShortcutFeedback(next === 0 ? '음소거 🔇' : `볼륨 🔊 ${next}%`);
        return next;
      });
    };
    window.addEventListener('wmp-volume-wheel', handleCustomWheel);
    return () => window.removeEventListener('wmp-volume-wheel', handleCustomWheel);
  }, [isMuted]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayButtonClick();
        showShortcutFeedback(isPlaying ? '일시정지 ⏸' : '재생 ▶');
        return;
      }

      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const targetTime = Math.max(0, currentTime - 10);
        if (track?.isLocal) {
          const el = track.isVideo ? localVideoRef.current : localAudioRef.current;
          if (el) el.currentTime = targetTime;
        } else if (ytPlayerRef.current && isPlayerReady) {
          ytPlayerRef.current.seekTo?.(targetTime, true);
        }
        setCurrentTime(targetTime);
        showShortcutFeedback(`10초 되감기 ⏪ (${formatTime(targetTime)})`);
        return;
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        const maxDur = track?.isPreview ? 60 : (duration || 100);
        const targetTime = Math.min(maxDur, currentTime + 10);
        if (track?.isLocal) {
          const el = track.isVideo ? localVideoRef.current : localAudioRef.current;
          if (el) el.currentTime = targetTime;
        } else if (ytPlayerRef.current && isPlayerReady) {
          ytPlayerRef.current.seekTo?.(targetTime, true);
        }
        setCurrentTime(targetTime);
        showShortcutFeedback(`10초 빨리감기 ⏩ (${formatTime(targetTime)})`);
        return;
      }

      if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume(prev => {
          const next = Math.min(100, prev + 5);
          if (isMuted) setIsMuted(false);
          showShortcutFeedback(`볼륨 🔊 ${next}%`);
          return next;
        });
        return;
      }

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume(prev => {
          const next = Math.max(0, prev - 5);
          showShortcutFeedback(next === 0 ? '음소거 🔇' : `볼륨 🔉 ${next}%`);
          return next;
        });
        return;
      }

      if (e.code === 'KeyC' || e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        toggleCaptions();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, isPlayerReady, currentTime, duration, isMuted, track]);

  // Find current active subtitle text for custom SRT / VTT
  const currentSubtitleText = React.useMemo(() => {
    if (!track?.customSubtitles || track.customSubtitles.length === 0) return '';
    const match = track.customSubtitles.find(s => currentTime >= s.start && currentTime <= s.end);
    return match ? match.text : '';
  }, [currentTime, track?.customSubtitles]);

  const maxTimelineDuration = track?.isPreview ? Math.min(60, duration || 60) : duration;

  return (
    <>
      {/* HTML5 Native Audio Engine for Local Music (.mp3, .flac, .wma, .wav, .m4a, .ogg) */}
      <audio
        ref={localAudioRef}
        onEnded={handleLocalEnded}
        onError={() => setErrorMsg('로컬 오디오 재생 중 오류가 발생했습니다.')}
        className="hidden"
      />

      {/* HTML5 Native Video Engine for Local MV / Videos (.mp4, .mkv, .avi, .webm, .mov) */}
      <div
        className={`transition-all duration-500 overflow-hidden ${
          track?.isLocal && track?.isVideo
            ? 'fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl aspect-video rounded-2xl shadow-2xl z-30 border border-white/10 bg-black flex items-center justify-center relative'
            : 'hidden'
        }`}
      >
        <video
          ref={localVideoRef}
          onEnded={handleLocalEnded}
          onError={() => setErrorMsg('로컬 비디오 재생 중 오류가 발생했습니다.')}
          playsInline
          className="w-full h-full object-contain"
        >
          {track?.subtitlesUrl && (
            <track
              kind="subtitles"
              src={track.subtitlesUrl}
              srcLang="ko"
              label="한국어 자막"
              default={isCaptionsOn}
            />
          )}
        </video>

        {/* Custom SRT / VTT Subtitle Overlay on Video */}
        {isCaptionsOn && currentSubtitleText && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[90%] px-4 py-2 bg-black/80 backdrop-blur-md rounded-xl text-center text-white text-base md:text-lg font-bold shadow-2xl border border-white/20 animate-fadeIn pointer-events-none whitespace-pre-line z-40">
            {currentSubtitleText}
          </div>
        )}
      </div>

      {/* Dynamic Placement of YouTube Player Engine for Online Audio / MV */}
      <div
        className={`transition-all duration-500 overflow-hidden ${
          !track?.isLocal && track?.isVideo
            ? 'fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl aspect-video rounded-2xl shadow-2xl z-30 border border-white/10'
            : 'fixed bottom-0 right-0 w-[200px] h-[200px] opacity-0 pointer-events-none -z-50'
        }`}
      >
        <div id="youtube-audio-engine" className="w-full h-full" />
      </div>

      {/* Keyboard Shortcut Toast Notice */}
      {toastFeedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-zinc-900/90 text-white font-semibold px-4 py-2 rounded-2xl shadow-2xl z-50 flex items-center gap-2 text-xs border border-white/10 backdrop-blur-xl animate-fade-in pointer-events-none">
          <span>{toastFeedback.text}</span>
        </div>
      )}

      {/* Error / Notice Toast */}
      {errorMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-amber-500 text-zinc-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 text-xs backdrop-blur-md animate-bounce">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Unified Player Bottom Bar (Used for YouTube Audio, Online MV, and Local Offline Files) */}
      <footer
        onWheel={handleWheelVolume}
        title="하단 플레이어 바에서 마우스 휠을 스크롤하여 볼륨을 조절할 수 있습니다"
        className="h-20 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-2xl px-4 md:px-6 flex items-center justify-between z-50 select-none"
      >
        {/* Left: Current Track Info & Mode Badge */}
        <div className="flex items-center gap-3 w-1/4 min-w-[180px]">
          {track ? (
            <>
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700/50 shadow-md flex items-center justify-center">
                {track.thumbnail ? (
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                ) : track.isVideo ? (
                  <Film className="w-6 h-6 text-purple-400" />
                ) : (
                  <Music2 className="w-6 h-6 text-rose-400" />
                )}
                {track.isVideo && track.thumbnail && (
                  <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
                    <Film className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 pr-2">
                <div className="text-xs md:text-sm font-semibold text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{track.title}</span>
                  {track.isLocal && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-[9px] font-bold text-zinc-950 shrink-0 flex items-center gap-0.5">
                      <HardDrive className="w-2.5 h-2.5" /> 로컬
                    </span>
                  )}
                  {track.isVideo && (
                    <span className="px-1.5 py-0.2 rounded bg-purple-600 text-[9px] font-bold text-white shrink-0">
                      MV
                    </span>
                  )}
                  {track.isPreview && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500 text-[9px] font-bold text-zinc-950 shrink-0">
                      1분
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {track.artist}
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-zinc-500">곡을 선택하거나 파일을 불러와주세요</div>
          )}
        </div>

        {/* Center: Controls & Progress Bar */}
        <div className="flex flex-col items-center gap-1.5 max-w-xl w-full px-4">
          {/* Main Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-1.5 rounded-full transition ${
                isShuffle ? 'text-rose-400' : 'text-zinc-400 hover:text-white'
              }`}
              title="셔플"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={onPrev}
              className="p-1.5 text-zinc-400 hover:text-white transition"
              title="이전 곡"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={handlePlayButtonClick}
              disabled={!track}
              className="p-3 bg-white hover:bg-zinc-200 text-zinc-950 rounded-full shadow-lg shadow-white/10 hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
              title={isPlaying ? '일시정지' : '재생'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={onNext}
              className="p-1.5 text-zinc-400 hover:text-white transition"
              title="다음 곡"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={() => {
                if (repeatMode === 'off') setRepeatMode('all');
                else if (repeatMode === 'all') setRepeatMode('one');
                else setRepeatMode('off');
              }}
              className={`p-1.5 rounded-full transition ${
                repeatMode !== 'off' ? 'text-rose-400' : 'text-zinc-400 hover:text-white'
              }`}
              title={
                repeatMode === 'one' ? '한 곡 반복' : repeatMode === 'all' ? '전체 반복' : '반복 끄기'
              }
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Progress Timeline Slider */}
          <div className="w-full flex items-center gap-2.5 text-[11px] text-zinc-400 font-mono">
            <span className="w-8 text-right">{formatTime(currentTime)}</span>
            <div className="relative flex-1 group flex items-center">
              <input
                type="range"
                min={0}
                max={maxTimelineDuration || 100}
                value={currentTime}
                onChange={handleSliderSeek}
                onMouseDown={() => setIsSeeking(true)}
                onMouseUp={() => setIsSeeking(false)}
                onTouchStart={() => setIsSeeking(true)}
                onTouchEnd={() => setIsSeeking(false)}
                className={`w-full h-1 rounded-lg appearance-none cursor-pointer group-hover:h-1.5 transition-all ${
                  track?.isVideo ? 'bg-zinc-800 accent-purple-500' : 'bg-zinc-800 accent-rose-500'
                }`}
              />
            </div>
            <span className="w-8">
              {formatTime(track?.isPreview ? 60 : duration)}
            </span>
          </div>
        </div>

        {/* Right: MV Toggle, CC Toggle, Volume & Queue Button */}
        <div className="flex items-center justify-end gap-2.5 w-1/4 min-w-[180px]">
          {/* Captions Toggle Button (Hotkey: C) */}
          <button
            onClick={toggleCaptions}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              isCaptionsOn
                ? 'bg-amber-500 text-zinc-950 font-bold shadow-md shadow-amber-500/30'
                : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700/50'
            }`}
            title={isCaptionsOn ? '자막 끄기 (단축키: C)' : '자막 켜기 (단축키: C)'}
          >
            <Subtitles className="w-4 h-4" />
          </button>

          {/* Mode Switch Button (Video ↔ Audio) */}
          {track && onToggleVideoMode && (
            <button
              onClick={onToggleVideoMode}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                track.isVideo
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700/50'
              }`}
              title={track.isVideo ? '음원 앨범 아트 모드로 전환' : '뮤직비디오 화면으로 전환'}
            >
              {track.isVideo ? <Music2 className="w-4 h-4" /> : <Film className="w-4 h-4" />}
            </button>
          )}

          {/* Volume Control (Mouse wheel supported) */}
          <div
            onWheel={handleWheelVolume}
            className="flex items-center gap-2 cursor-pointer group"
            title="마우스 휠 스크롤로 음향 조절 (↑: 볼륨 증가, ↓: 볼륨 감소)"
          >
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              className="w-16 md:w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-300 hover:accent-rose-500 transition"
            />
          </div>

          {/* Queue Toggle Button */}
          <button
            onClick={onToggleQueue}
            className={`p-2 rounded-lg transition ${
              isQueueOpen
                ? 'bg-zinc-800 text-rose-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
            title="재생 대기열"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </>
  );
};
