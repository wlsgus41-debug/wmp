import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, X, Play, Plus, Music2, Clock, ExternalLink, Globe, LogIn, UserPlus, LogOut, ShieldCheck } from 'lucide-react';
import type { Track, UserProfile, PlatformPasses } from '../types';
import { AuthModal } from './AuthModal';

interface SearchBarProps {
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  externalSearchQuery?: string;
  onClearExternalQuery?: () => void;
  isOffline?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onPlayTrack,
  onAddToQueue,
  externalSearchQuery,
  onClearExternalQuery,
  isOffline = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [matchingId, setMatchingId] = useState<string | null>(null);

  // User & Auth Modal state
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('wmp_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'passes'>('login');

  // Search source filter: melon, bugs, genie, flo, spotify, youtube, all
  const [searchSource, setSearchSource] = useState<'melon' | 'bugs' | 'genie' | 'flo' | 'spotify' | 'youtube' | 'all'>('melon');

  const searchSources = [
    { id: 'melon', name: '멜론 (melon.com)', domain: 'melon.com', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
    { id: 'bugs', name: '벅스 (music.bugs.co.kr)', domain: 'music.bugs.co.kr', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
    { id: 'genie', name: '지니 (genie.co.kr)', domain: 'genie.co.kr', color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
    { id: 'flo', name: '플로 (music-flo.com)', domain: 'music-flo.com', color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' },
    { id: 'spotify', name: '스포티파이 (open.spotify.com)', domain: 'open.spotify.com', color: 'text-green-400 border-green-500/40 bg-green-500/10' },
    { id: 'youtube', name: '유튜브 (youtube.com)', domain: 'youtube.com', color: 'text-red-400 border-red-500/40 bg-red-500/10' },
    { id: 'all', name: '통합 검색 (전체)', domain: 'all', color: 'text-zinc-300 border-zinc-700 bg-zinc-800' },
  ];

  const quickKeywords = [
    'K-POP 신곡 인기곡',
    'Billboard Hot 100',
    '감성 발라드 명곡',
    'Lo-Fi / 카페 재즈',
    '힙합 & R&B 트렌드',
    '인기 드라마 OST',
    'J-POP / 애니메이션',
    '드라이브 팝송'
  ];

  // Handle external search query (e.g. from Melon real-time trending keywords in Lyrics tab)
  useEffect(() => {
    if (externalSearchQuery && externalSearchQuery.trim()) {
      setQuery(externalSearchQuery);
      handleSearch(externalSearchQuery, searchSource);
      if (onClearExternalQuery) onClearExternalQuery();
    }
  }, [externalSearchQuery]);

  const handleSearch = async (searchQuery: string, source: string = searchSource) => {
    if (isOffline) {
      alert('오프라인 상태입니다. 온라인 음악 검색을 이용할 수 없습니다.');
      return;
    }
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setShowResults(true);

    try {
      const res = await axios.get('/api/search', {
        params: { q: searchQuery, source }
      });
      if (res.data.success) {
        setResults(res.data.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(query, searchSource);
    }
  };

  const resolveTrack = async (item: any): Promise<Track | null> => {
    let videoId = item.videoId;
    let duration = item.duration;

    if (!videoId) {
      setMatchingId(item.id || item.title);
      try {
        const matchRes = await axios.get('/api/match', {
          params: { title: item.title, artist: item.artist }
        });
        if (matchRes.data.success && matchRes.data.track) {
          videoId = matchRes.data.track.videoId;
          duration = matchRes.data.track.duration;
          if (!item.thumbnail && matchRes.data.track.thumbnail) {
            item.thumbnail = matchRes.data.track.thumbnail;
          }
        }
      } catch (err) {
        console.error('Track match error:', err);
      } finally {
        setMatchingId(null);
      }
    }

    if (!videoId) return null;

    const itemSrc = (item.source || searchSource || '').toLowerCase();
    const isYoutube = itemSrc === 'youtube' || itemSrc === 'all' || !itemSrc;
    const hasPlatformPass =
      isYoutube ||
      (itemSrc.includes('melon') && !!user?.passes?.melon) ||
      (itemSrc.includes('bugs') && !!user?.passes?.bugs) ||
      (itemSrc.includes('spotify') && !!user?.passes?.spotify) ||
      (itemSrc.includes('flo') && !!user?.passes?.flo) ||
      (itemSrc.includes('genie') && !!user?.passes?.genie);

    const isPreview = !isYoutube && !hasPlatformPass;

    return {
      id: `${item.title}-${item.artist}-${videoId}`,
      title: item.title,
      artist: item.artist,
      album: item.album || `${item.siteName || searchSource} 음원`,
      thumbnail: item.thumbnail || '',
      videoId,
      duration: duration || 0,
      source: (item.source || searchSource).toUpperCase(),
      isVideo: false, // 음원 사이트 검색 재생 시 항상 음원 커버 아트 모드로 표시
      isPreview
    };
  };

  const playSearchResult = async (item: any) => {
    const track = await resolveTrack(item);
    if (track) {
      onPlayTrack(track);
      setShowResults(false);
    }
  };

  const queueSearchResult = async (item: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const track = await resolveTrack(item);
    if (track) {
      onAddToQueue(track);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('wmp_user');
    setUser(null);
  };

  const handleLoginSuccess = (newUser: UserProfile) => {
    setUser(newUser);
  };

  const getSiteBadge = (siteDomain?: string, siteName?: string) => {
    const d = (siteDomain || '').toLowerCase();
    if (d.includes('melon')) return { label: 'melon.com', name: '멜론', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    if (d.includes('bugs')) return { label: 'music.bugs.co.kr', name: '벅스', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
    if (d.includes('genie')) return { label: 'genie.co.kr', name: '지니', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    if (d.includes('flo')) return { label: 'music-flo.com', name: '플로', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
    if (d.includes('spotify')) return { label: 'open.spotify.com', name: '스포티파이', cls: 'bg-green-500/15 text-green-400 border-green-500/30' };
    return { label: 'youtube.com', name: siteName || '유튜브', cls: 'bg-red-500/15 text-red-400 border-red-500/30' };
  };

  return (
    <header className="relative w-full z-40">
      {/* Top Bar */}
      <div className="h-16 px-6 border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl flex items-center justify-between gap-4">
        {/* Logo with Home Reload Link */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.location.reload();
          }}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none"
          title="온 세상의 뮤직 :: WMP 홈으로 (새로고침)"
        >
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold text-sm">
            <Music2 className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight text-zinc-100 hover:text-white transition hidden sm:inline-block">
            온 세상의 뮤직 :: WMP
          </span>
        </a>

        {/* Search Input Bar with Source Selector Dropdown */}
        <div className="flex-1 max-w-2xl relative flex items-center gap-1.5">
          {/* Source Filter Select */}
          <select
            value={searchSource}
            onChange={(e) => {
              const src = e.target.value as any;
              setSearchSource(src);
              if (query.trim()) handleSearch(query, src);
            }}
            className="h-10 px-3 rounded-full bg-zinc-900 text-xs font-semibold text-zinc-200 border border-zinc-700/80 focus:outline-none focus:border-rose-500 shrink-0 cursor-pointer shadow-sm hover:border-zinc-500 transition"
          >
            {searchSources.map((s) => (
              <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-100 font-medium">
                {s.name}
              </option>
            ))}
          </select>

          {/* Search Input Box */}
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isOffline}
              placeholder={
                isOffline
                  ? '오프라인 상태입니다 (내 PC 로컬 파일만 재생 가능)'
                  : `${
                      searchSource === 'melon' ? 'melon.com 멜론에서 실제 검색' :
                      searchSource === 'bugs' ? 'music.bugs.co.kr 벅스에서 실제 검색' :
                      searchSource === 'genie' ? 'genie.co.kr 지니에서 실제 검색' :
                      searchSource === 'flo' ? 'music-flo.com 플로에서 실제 검색' :
                      searchSource === 'spotify' ? 'open.spotify.com 스포티파이에서 검색' :
                      searchSource === 'youtube' ? 'youtube.com 유튜브에서 검색' :
                      '모든 음원 사이트에서 노래, 아티스트'
                    } (Enter)...`
              }
              className="w-full h-10 pl-10 pr-10 rounded-full bg-zinc-900/90 border border-zinc-700/60 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 transition shadow-inner"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setShowResults(false);
                }}
                className="absolute right-3 p-1 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Section: Auth & Membership & Status */}
        <div className="flex items-center gap-2.5">
          {isOffline && (
            <span
              className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm"
              title="인터넷 연결 끊김 - 내 PC에 저장된 로컬 파일만 재생 가능합니다"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>오프라인 모드</span>
            </span>
          )}

          {/* User Profile / Auth Buttons */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthMode('passes');
                  setIsAuthOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 shadow-sm text-xs transition group"
                title="클릭하여 음원 사이트별 이용권 보유 설정 관리"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-500 flex items-center justify-center text-white font-bold text-[10px]">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="font-semibold text-zinc-200 max-w-[90px] truncate">{user.name}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 uppercase">
                  {user.provider}
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-500 transition shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5 text-rose-400" />
                <span>로그인</span>
              </button>
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setIsAuthOpen(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 transition shadow-md shadow-rose-600/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>회원가입</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Search Chips & Search Source Quick Pills */}
      <div className="px-6 py-2 bg-zinc-950/40 border-b border-zinc-800/40 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
            검색 대상:
          </span>
          {searchSources.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSearchSource(s.id as any);
                if (query.trim()) handleSearch(query, s.id);
              }}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition shrink-0 ${
                searchSource === s.id
                  ? `${s.color} font-bold shadow-sm scale-105`
                  : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border-zinc-800/80 hover:bg-zinc-800'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-4 border-l border-zinc-800/60">
          <span className="text-[11px] font-semibold text-zinc-500 shrink-0">추천:</span>
          {quickKeywords.slice(0, 4).map((g) => (
            <button
              key={g}
              onClick={() => {
                setQuery(g);
                handleSearch(g, searchSource);
              }}
              className="px-2.5 py-0.5 rounded-full text-[11px] bg-zinc-900/70 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800/80 transition shrink-0"
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Search Results Dropdown Overlay */}
      {showResults && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setShowResults(false)}
          />
          <div className="absolute top-24 md:top-28 left-1/2 -translate-x-1/2 w-[94%] max-w-2xl max-h-[52vh] md:max-h-[440px] bg-zinc-900/95 border border-zinc-700/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden z-50 flex flex-col animate-fadeIn">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Search className="w-4 h-4 text-rose-400" />
                <span className="text-xs md:text-sm font-bold text-zinc-200">
                  '{query}' 검색 결과
                </span>
                <span className="text-xs text-zinc-400">({results.length}건)</span>
                {searchSource !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] md:text-[11px] text-zinc-300 font-medium flex items-center gap-1">
                    <Globe className="w-3 h-3 text-rose-400" /> {searchSources.find(s => s.id === searchSource)?.domain}
                  </span>
                )}
                {searchSource !== 'all' && searchSource !== 'youtube' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    user?.passes?.[searchSource as keyof PlatformPasses]
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}>
                    {user?.passes?.[searchSource as keyof PlatformPasses] ? '이용권 연동 (풀버전)' : '1분 미리듣기 적용'}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowResults(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                title="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
              {isSearching ? (
                <div className="h-36 flex flex-col items-center justify-center gap-2.5 text-zinc-400">
                  <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">
                    {searchSources.find(s => s.id === searchSource)?.domain} 에서 실제 음원을 검색하는 중...
                  </span>
                </div>
              ) : results.length === 0 ? (
                <div className="h-36 flex flex-col items-center justify-center gap-1.5 text-zinc-500 text-xs">
                  <p>검색 결과가 없습니다.</p>
                  <p className="text-[11px] text-zinc-600">다른 키워드로 검색하거나 검색 대상을 '통합 검색'으로 변경해보세요.</p>
                </div>
              ) : (
                results.map((item, idx) => {
                  const badge = getSiteBadge(item.site || item.sourceUrl, item.siteName);
                  const isMatchingThis = matchingId === (item.id || item.title);

                  return (
                    <div
                      key={item.id || `${item.title}-${idx}`}
                      onClick={() => playSearchResult(item)}
                      className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-800/90 border border-zinc-800/60 hover:border-zinc-700 transition cursor-pointer select-none"
                    >
                      {/* Album Cover Thumbnail */}
                      <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700/50 shadow-sm flex items-center justify-center">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        ) : (
                          <Music2 className="w-5 h-5 text-zinc-500" />
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          {isMatchingThis ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                          )}
                        </div>
                      </div>

                      {/* Song & Artist & Site Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs md:text-sm font-bold text-zinc-100 truncate group-hover:text-rose-300 transition">
                            {item.title}
                          </span>
                          {/* Authentic Site Domain Badge */}
                          <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded border shrink-0 ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 truncate flex items-center gap-2 mt-0.5">
                          <span className="font-medium text-zinc-300">{item.artist}</span>
                          {item.album && (
                            <>
                              <span className="text-zinc-600">•</span>
                              <span className="text-zinc-400 truncate text-[11px]">{item.album}</span>
                            </>
                          )}
                          {item.durationText && (
                            <>
                              <span className="text-zinc-600">•</span>
                              <span className="flex items-center gap-0.5 text-zinc-500 text-[11px]">
                                <Clock className="w-3 h-3" /> {item.durationText}
                              </span>
                            </>
                          )}
                          {(() => {
                            const itemSrc = (item.source || searchSource || '').toLowerCase();
                            const isYt = itemSrc === 'youtube' || itemSrc === 'all' || !itemSrc;
                            const hasP = isYt ||
                              (itemSrc.includes('melon') && !!user?.passes?.melon) ||
                              (itemSrc.includes('bugs') && !!user?.passes?.bugs) ||
                              (itemSrc.includes('spotify') && !!user?.passes?.spotify) ||
                              (itemSrc.includes('flo') && !!user?.passes?.flo) ||
                              (itemSrc.includes('genie') && !!user?.passes?.genie);
                            return (
                              <span className={`text-[10px] font-semibold shrink-0 ${hasP ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {isYt ? '(풀버전)' : hasP ? '(이용권 연동 - 풀버전)' : '(1분 재생)'}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.siteUrl && (
                          <a
                            href={item.siteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg transition"
                            title={`${badge.label} 실제 페이지로 이동`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={(e) => queueSearchResult(item, e)}
                          className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition"
                          title="대기열에 추가"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playSearchResult(item);
                          }}
                          disabled={isMatchingThis}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center gap-1 disabled:opacity-50"
                        >
                          {isMatchingThis ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" />
                          )}
                          <span>재생</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Auth Modal for Login / Signup / Channeling SSO / Passes Management */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
        currentUser={user}
        onLoginSuccess={handleLoginSuccess}
      />
    </header>
  );
};
