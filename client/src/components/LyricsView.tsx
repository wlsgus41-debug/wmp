import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  AlignLeft,
  Sparkles,
  Music,
  Flame,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Search,
  Play,
  PanelRightClose,
  UploadCloud
} from 'lucide-react';
import type { LyricsResponse, Track, TrendingKeyword, LyricLine } from '../types';
import { parseLrcOrSlf, parseSrt } from '../utils/lyricsParser';

interface LyricsViewProps {
  track: Track | null;
  currentTime: number;
  onSeek: (time: number) => void;
  onSearchKeyword?: (keyword: string) => void;
  onPlayTrack?: (track: Track) => void;
  onClose?: () => void;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  track,
  currentTime,
  onSeek,
  onSearchKeyword,
  onPlayTrack,
  onClose
}) => {
  const [lyricsData, setLyricsData] = useState<LyricsResponse['primary'] | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [isFullView, setIsFullView] = useState(false);
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Melon Real-time Trending Search Keywords state
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);
  const [currentKeywordIndex, setCurrentKeywordIndex] = useState(0);
  const [isKeywordListOpen, setIsKeywordListOpen] = useState(false);
  const [loadingKeywords, setLoadingKeywords] = useState(false);

  // Fetch Melon real-time trending search keywords
  const fetchTrendingKeywords = async () => {
    setLoadingKeywords(true);
    try {
      const res = await axios.get('/api/trending-keywords');
      if (res.data.success && res.data.keywords) {
        setTrendingKeywords(res.data.keywords);
      }
    } catch (err) {
      console.error('Trending keywords error:', err);
    } finally {
      setLoadingKeywords(false);
    }
  };

  useEffect(() => {
    fetchTrendingKeywords();
    const interval = setInterval(fetchTrendingKeywords, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (trendingKeywords.length === 0 || isKeywordListOpen) return;
    const ticker = setInterval(() => {
      setCurrentKeywordIndex((prev) => (prev + 1) % trendingKeywords.length);
    }, 3500);
    return () => clearInterval(ticker);
  }, [trendingKeywords.length, isKeywordListOpen]);

  // Handle local .lrc / .slf / .srt file upload
  const handleLyricsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const fileName = file.name.toLowerCase();
      let synced: LyricLine[] = [];
      let sourceName = '로컬 싱크 파일';

      if (fileName.endsWith('.srt')) {
        const srtItems = parseSrt(content);
        synced = srtItems.map(item => ({ time: item.start, text: item.text }));
        sourceName = `로컬 자막 (${file.name})`;
      } else {
        synced = parseLrcOrSlf(content);
        sourceName = fileName.endsWith('.slf') ? `로컬 SLF 가사 (${file.name})` : `로컬 LRC 가사 (${file.name})`;
      }

      if (synced.length > 0) {
        setLyricsData({
          plainLyrics: synced.map(s => s.text).join('\n'),
          syncedLyrics: synced,
          source: sourceName
        });
      } else {
        setLyricsData({
          plainLyrics: content,
          syncedLyrics: [],
          source: `로컬 텍스트 (${file.name})`
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Fetch lyrics
  const fetchLyrics = async (title: string, artist: string, source: string) => {
    // If current track already has custom local lyrics
    if (track?.customLyrics && track.customLyrics.length > 0) {
      setLyricsData({
        plainLyrics: track.customLyrics.map(l => l.text).join('\n'),
        syncedLyrics: track.customLyrics,
        source: '로컬 싱크 가사 (.lrc / .slf)'
      });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get<LyricsResponse>('/api/lyrics', {
        params: { title, artist, source }
      });
      if (res.data.success) {
        setLyricsData(res.data.primary);
      }
    } catch (err) {
      console.error('Lyrics fetch error:', err);
      setLyricsData({
        plainLyrics: '가사를 불러오는 중 오류가 발생했습니다.',
        syncedLyrics: [],
        source: 'Error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (track) {
      if (track.customLyrics && track.customLyrics.length > 0) {
        setLyricsData({
          plainLyrics: track.customLyrics.map(l => l.text).join('\n'),
          syncedLyrics: track.customLyrics,
          source: '로컬 싱크 가사 (.lrc / .slf)'
        });
      } else {
        fetchLyrics(track.title, track.artist, selectedSource);
      }
    } else {
      setLyricsData(null);
    }
  }, [track?.title, track?.artist, track?.customLyrics, selectedSource]);

  // Find currently active sync lyric line index
  const activeIndex = React.useMemo(() => {
    if (!lyricsData?.syncedLyrics || lyricsData.syncedLyrics.length === 0) return -1;
    for (let i = lyricsData.syncedLyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyricsData.syncedLyrics[i].time - 0.2) {
        return i;
      }
    }
    return -1;
  }, [currentTime, lyricsData?.syncedLyrics]);

  // Auto scroll to active lyric
  useEffect(() => {
    if (activeIndex >= 0 && activeLineRef.current && containerRef.current && !isFullView) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isFullView]);

  const handleKeywordClick = (kw: TrendingKeyword) => {
    const searchWord = kw.title ? `${kw.title} ${kw.artist}` : kw.keyword;
    if (onSearchKeyword) {
      onSearchKeyword(searchWord);
    }
  };

  const handlePlayKeyword = async (kw: TrendingKeyword, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPlayTrack) return;
    try {
      const matchRes = await axios.get('/api/match', {
        params: { title: kw.title || kw.keyword, artist: kw.artist || '' }
      });
      if (matchRes.data.success && matchRes.data.track) {
        let isLoggedIn = false;
        try {
          isLoggedIn = !!localStorage.getItem('wmp_user');
        } catch (err) {}

        onPlayTrack({
          id: `${kw.title || kw.keyword}-${matchRes.data.track.videoId}`,
          title: kw.title || kw.keyword,
          artist: kw.artist || 'Melon Top Artist',
          album: '멜론 실시간 검색어',
          thumbnail: kw.thumbnail || matchRes.data.track.thumbnail || '',
          videoId: matchRes.data.track.videoId,
          duration: matchRes.data.track.duration,
          source: 'MELON_TRENDING',
          isVideo: false,
          isPreview: !isLoggedIn
        });
      }
    } catch (err) {
      console.error('Play keyword error:', err);
    }
  };

  const sources = [
    { id: 'all', name: '자동 (최적)' },
    { id: 'spotify', name: '스포티파이' },
    { id: 'melon', name: '멜론' },
    { id: 'genie', name: '지니' },
    { id: 'bugs', name: '벅스' },
    { id: 'flo', name: '플로' },
    { id: 'youtube', name: '유튜브 뮤직' },
  ];

  const hasSynced = (lyricsData?.syncedLyrics?.length || 0) > 0;
  const currentRollingKeyword = trendingKeywords[currentKeywordIndex];

  return (
    <div className="w-80 md:w-96 flex flex-col h-full bg-zinc-900/60 border-l border-zinc-800/80 backdrop-blur-xl shrink-0">
      {/* ─── Top Section: Melon Real-time Trending Search Keywords ─── */}
      <div className="border-b border-zinc-800/90 bg-zinc-950/70">
        {/* Header & Rolling Bar */}
        <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
          {/* Badge & Title */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Flame className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-bold text-zinc-300">
              실시간 검색어 <span className="text-[9px] text-emerald-400 font-semibold">(멜론)</span>
            </span>
          </div>

          {/* Rolling Ticker Item */}
          {currentRollingKeyword && (
            <div
              onClick={() => handleKeywordClick(currentRollingKeyword)}
              className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 cursor-pointer transition group"
              title="클릭 시 바로 검색"
            >
              <span className="w-4 text-center font-extrabold text-[11px] text-emerald-400 shrink-0">
                {currentRollingKeyword.rank}
              </span>
              <span className="text-[11px] font-semibold text-zinc-200 truncate group-hover:text-emerald-300 transition">
                {currentRollingKeyword.title || currentRollingKeyword.keyword}
              </span>
              {currentRollingKeyword.artist && (
                <span className="text-[10px] text-zinc-400 truncate hidden sm:inline">
                  - {currentRollingKeyword.artist}
                </span>
              )}
              {/* Rank Diff Badge */}
              <span className="ml-auto shrink-0 flex items-center text-[9px] font-bold">
                {currentRollingKeyword.rankDiff === 'up' ? (
                  <span className="text-rose-400 flex items-center">
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                    {currentRollingKeyword.diffVal || ''}
                  </span>
                ) : currentRollingKeyword.rankDiff === 'down' ? (
                  <span className="text-blue-400 flex items-center">
                    <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                    {currentRollingKeyword.diffVal || ''}
                  </span>
                ) : currentRollingKeyword.rankDiff === 'new' ? (
                  <span className="text-amber-400 font-bold px-1 py-0.2 rounded bg-amber-500/20 text-[8px]">
                    NEW
                  </span>
                ) : (
                  <span className="text-zinc-500">
                    <Minus className="w-2.5 h-2.5" />
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Controls: Refresh & Accordion Toggle */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={fetchTrendingKeywords}
              disabled={loadingKeywords}
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition disabled:opacity-50"
              title="실시간 검색어 새로고침"
            >
              <RefreshCw className={`w-3 h-3 ${loadingKeywords ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              onClick={() => setIsKeywordListOpen(!isKeywordListOpen)}
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
              title={isKeywordListOpen ? '검색어 순위 접기' : '실시간 검색어 1~10위 전체보기'}
            >
              {isKeywordListOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Expanded Real-time Search Keywords 1~10 List */}
        {isKeywordListOpen && (
          <div className="px-3 pb-3 pt-1 border-t border-zinc-800/60 bg-zinc-950/90 space-y-1 animate-fade-in max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between pb-1.5 text-[10px] text-zinc-500 font-semibold">
              <span>멜론 실시간 급상승 키워드 TOP 10</span>
              <span className="text-zinc-600">클릭 시 검색창 연동</span>
            </div>
            {trendingKeywords.map((kw) => (
              <div
                key={kw.rank}
                onClick={() => handleKeywordClick(kw)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60 transition cursor-pointer group"
              >
                <span className={`w-5 text-center font-bold text-xs shrink-0 ${
                  kw.rank === 1 ? 'text-amber-400' :
                  kw.rank === 2 ? 'text-zinc-300' :
                  kw.rank === 3 ? 'text-amber-600' : 'text-zinc-400'
                }`}>
                  {kw.rank}
                </span>

                {kw.thumbnail && (
                  <div className="w-7 h-7 rounded overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700/40">
                    <img src={kw.thumbnail} alt={kw.title} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-zinc-200 truncate group-hover:text-emerald-300 transition">
                    {kw.title || kw.keyword}
                  </div>
                  {kw.artist && (
                    <div className="text-[10px] text-zinc-400 truncate">
                      {kw.artist}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {kw.rankDiff === 'up' ? (
                    <span className="text-rose-400 flex items-center text-[10px] font-semibold">
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                      {kw.diffVal || ''}
                    </span>
                  ) : kw.rankDiff === 'down' ? (
                    <span className="text-blue-400 flex items-center text-[10px] font-semibold">
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                      {kw.diffVal || ''}
                    </span>
                  ) : kw.rankDiff === 'new' ? (
                    <span className="text-amber-400 font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-[9px] border border-amber-500/30">
                      NEW
                    </span>
                  ) : (
                    <span className="text-zinc-500 text-[10px]">
                      <Minus className="w-3 h-3" />
                    </span>
                  )}
                  <button
                    onClick={(e) => handlePlayKeyword(kw, e)}
                    className="p-1 hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 rounded transition"
                    title="즉시 재생"
                  >
                    <Play className="w-3 h-3 fill-current" />
                  </button>
                  <Search className="w-3 h-3 text-zinc-500 group-hover:text-emerald-400 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden File Input for .lrc / .slf / .srt */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLyricsFileUpload}
        accept=".lrc,.slf,.srt,.txt,.vtt"
        className="hidden"
      />

      {/* ─── Lyrics Header ─── */}
      <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 text-white shadow-lg shadow-indigo-500/20">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
              가사
              {hasSynced && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold border border-indigo-500/30 flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> SYNC
                </span>
              )}
            </h2>
            <p className="text-[10px] text-zinc-400 max-w-[160px] truncate">
              출처: {lyricsData?.source || '자동 탐색'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Upload Local .lrc / .slf / .srt File Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1"
            title="로컬 가사/자막 파일 불러오기 (.lrc, .slf, .srt)"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold hidden sm:inline">가사/자막 파일</span>
          </button>

          {/* View Mode Toggle */}
          <button
            onClick={() => setIsFullView(!isFullView)}
            className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
              isFullView
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
            title={isFullView ? '싱크 뷰로 전환' : '전체 가사 텍스트 모드'}
          >
            <AlignLeft className="w-4 h-4" />
          </button>

          {/* Close Panel Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-400 transition"
              title="가사 패널 접기"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Source Selector Tabs */}
      <div className="p-2 bg-zinc-950/40 border-b border-zinc-800/60">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {sources.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSource(s.id)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
                selectedSource === s.id
                  ? 'bg-indigo-600 text-white shadow font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lyrics Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative scroll-smooth"
      >
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">가사를 불러오는 중...</span>
          </div>
        ) : !lyricsData || (!lyricsData.plainLyrics && (!lyricsData.syncedLyrics || lyricsData.syncedLyrics.length === 0)) ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <Music className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">등록된 가사가 없습니다.</p>
          </div>
        ) : hasSynced && !isFullView ? (
          /* Realtime Synced Lyrics List */
          <div className="space-y-4 py-20 text-center">
            {lyricsData.syncedLyrics.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;

              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek(line.time)}
                  className={`transition-all duration-300 cursor-pointer select-none rounded-xl px-4 py-2 ${
                    isActive
                      ? 'text-lg md:text-xl font-extrabold text-indigo-400 scale-105 bg-indigo-500/10 shadow-lg shadow-indigo-500/5 backdrop-blur-sm'
                      : isPast
                      ? 'text-xs md:text-sm font-medium text-zinc-500 hover:text-zinc-300'
                      : 'text-xs md:text-sm font-medium text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {line.text}
                </div>
              );
            })}
          </div>
        ) : (
          /* Plain Lyrics Text View */
          <div className="whitespace-pre-line text-xs md:text-sm text-zinc-300 leading-relaxed font-sans py-4">
            {lyricsData.plainLyrics}
          </div>
        )}
      </div>
    </div>
  );
};
