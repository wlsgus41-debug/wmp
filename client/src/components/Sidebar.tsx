import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Play,
  Plus,
  Flame,
  Sparkles,
  RefreshCw,
  Calendar,
  CheckSquare,
  Square,
  ListPlus,
  Users,
  Film,
  HardDrive,
  FolderOpen,
  Trash2,
  FileAudio,
  FileVideo,
  PanelLeftClose
} from 'lucide-react';
import type { ChartItem, Track, YearCategory, YearItem, MVPlatform } from '../types';
import { parseLrcOrSlf, parseSrt, srtToVttBlobUrl } from '../utils/lyricsParser';

interface SidebarProps {
  onPlayTrack: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  currentTrackId?: string;
  isPlaying: boolean;
  onClose?: () => void;
  isOffline?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onPlayTrack,
  onAddToQueue,
  currentTrackId,
  isPlaying,
  onClose,
  isOffline = false,
}) => {
  // Mode: 'chart' | 'new' | 'mv' | 'year' | 'local'
  const [sidebarMode, setSidebarMode] = useState<'chart' | 'new' | 'mv' | 'year' | 'local'>(
    isOffline ? 'local' : 'chart'
  );

  // Auto switch to local mode when going offline
  useEffect(() => {
    if (isOffline) {
      setSidebarMode('local');
    }
  }, [isOffline]);

  // Chart state
  const [platform, setPlatform] = useState<'melon' | 'genie' | 'flo' | 'bugs' | 'youtube'>('melon');
  const [floAge, setFloAge] = useState<'' | '10-20' | '30-40' | '50-60' | '70-80'>('');
  const [chart, setChart] = useState<ChartItem[]>([]);

  // New Songs state
  const [newPlatform, setNewPlatform] = useState<'melon' | 'genie' | 'flo' | 'bugs' | 'youtube'>('melon');
  const [newSongs, setNewSongs] = useState<ChartItem[]>([]);

  // MV state
  const [mvPlatforms, setMvPlatforms] = useState<MVPlatform[]>([]);
  const [selectedMvPlatform, setSelectedMvPlatform] = useState<string>('melon_new');
  const [mvTracks, setMvTracks] = useState<ChartItem[]>([]);

  // Year state
  const [yearCategories, setYearCategories] = useState<YearCategory[]>([]);
  const [activeYearCategoryIndex, setActiveYearCategoryIndex] = useState(3);
  const [selectedYear, setSelectedYear] = useState<YearItem | null>(null);
  const [yearTracks, setYearTracks] = useState<ChartItem[]>([]);

  // Local files state (Offline mode)
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [localFilter, setLocalFilter] = useState<'all' | 'audio' | 'video'>('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Multi-selection state
  const [selectedTrackTitles, setSelectedTrackTitles] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [loading, setLoading] = useState(false);
  const [matchingTrackTitle, setMatchingTrackTitle] = useState<string | null>(null);

  // --- Data fetching ---
  const fetchChart = async (p: string, age: string = '') => {
    setLoading(true);
    try {
      const url = p === 'flo' && age ? `/api/charts/flo?age=${age}` : `/api/charts/${p}`;
      const res = await axios.get(url);
      if (res.data.success) {
        setChart(res.data.data);
        setSelectedTrackTitles([]);
      }
    } catch (err) {
      console.error('Chart fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNewSongs = async (p: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/new-songs/${p}`);
      if (res.data.success) {
        setNewSongs(res.data.data);
        setSelectedTrackTitles([]);
      }
    } catch (err) {
      console.error('New songs fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMvPlatforms = async () => {
    try {
      const res = await axios.get('/api/mv/platforms');
      if (res.data.success) {
        setMvPlatforms(res.data.platforms);
      }
    } catch (err) {
      console.error('MV platforms fetch error', err);
    }
  };

  const fetchMvTracks = async (pId: string = 'melon_new') => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/mv/${pId}`);
      if (res.data.success) {
        setMvTracks(res.data.data);
        setSelectedTrackTitles([]);
      }
    } catch (err) {
      console.error('MV tracks fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchYearCategories = async () => {
    try {
      const res = await axios.get('/api/years');
      if (res.data.success) {
        setYearCategories(res.data.categories);
        if (res.data.categories.length > 0 && !selectedYear) {
          const cats = res.data.categories;
          const defaultCat = cats[cats.length - 1];
          const defaultYear = defaultCat.years[defaultCat.years.length - 1];
          setActiveYearCategoryIndex(cats.length - 1);
          setSelectedYear(defaultYear);
          fetchYearTracks(defaultYear.id);
        }
      }
    } catch (err) {
      console.error('Year categories fetch error', err);
    }
  };

  const fetchYearTracks = async (id: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/years/${id}`);
      if (res.data.success) {
        setYearTracks(res.data.tracks);
        setSelectedTrackTitles([]);
      }
    } catch (err) {
      console.error('Year tracks fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sidebarMode === 'chart') {
      fetchChart(platform, platform === 'flo' ? floAge : '');
    } else if (sidebarMode === 'new') {
      fetchNewSongs(newPlatform);
    } else if (sidebarMode === 'mv') {
      if (mvPlatforms.length === 0) fetchMvPlatforms();
      fetchMvTracks(selectedMvPlatform);
    } else if (sidebarMode === 'year') {
      if (yearCategories.length === 0) fetchYearCategories();
      else if (selectedYear) fetchYearTracks(selectedYear.id);
    }
  }, [sidebarMode, platform, floAge, newPlatform, selectedMvPlatform]);

  // Handle local file upload (.mp3, .flac, .wma, .wav, .mp4, .avi, .mkv, .webm, .mov, .lrc, .slf, .srt)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    // Separate media files and lyrics/subtitle files
    const lyricsFiles: { name: string; baseName: string; ext: string; file: File }[] = [];
    const mediaFiles: { name: string; baseName: string; ext: string; isVideo: boolean; file: File }[] = [];

    fileList.forEach(file => {
      const dotIndex = file.name.lastIndexOf('.');
      const ext = dotIndex !== -1 ? file.name.substring(dotIndex + 1).toLowerCase() : '';
      const baseName = dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name;

      if (['lrc', 'slf', 'srt', 'vtt', 'txt'].includes(ext)) {
        lyricsFiles.push({ name: file.name, baseName, ext, file });
      } else {
        const isVideo = ['mp4', 'mkv', 'avi', 'webm', 'mov'].includes(ext);
        mediaFiles.push({ name: file.name, baseName, ext, isVideo, file });
      }
    });

    // Read and parse all uploaded lyrics / subtitle files
    const parsedLyricsMap = new Map<string, { customLyrics?: any[]; customSubtitles?: any[]; subtitlesUrl?: string }>();

    for (const lf of lyricsFiles) {
      try {
        const content = await lf.file.text();
        if (lf.ext === 'srt' || lf.ext === 'vtt') {
          const subs = parseSrt(content);
          const vttUrl = srtToVttBlobUrl(content);
          parsedLyricsMap.set(lf.baseName.toLowerCase(), {
            customSubtitles: subs,
            subtitlesUrl: vttUrl,
            customLyrics: subs.map(s => ({ time: s.start, text: s.text }))
          });
        } else {
          // .lrc / .slf
          const lyrics = parseLrcOrSlf(content);
          parsedLyricsMap.set(lf.baseName.toLowerCase(), {
            customLyrics: lyrics
          });
        }
      } catch (err) {
        console.error('Error reading lyrics file:', lf.name, err);
      }
    }

    const newTracks: Track[] = [];

    mediaFiles.forEach(({ baseName, ext, isVideo, file }) => {
      const url = URL.createObjectURL(file);
      const parts = baseName.split(' - ');
      const artist = parts.length > 1 ? parts[0].trim() : 'Local Artist';
      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : baseName;

      // Find matching lyrics or subtitle
      const matchingLyrics = parsedLyricsMap.get(baseName.toLowerCase()) ||
        parsedLyricsMap.get(title.toLowerCase()) ||
        (lyricsFiles.length === 1 ? parsedLyricsMap.values().next().value : undefined);

      newTracks.push({
        id: `local-${file.name}-${Date.now()}-${Math.random()}`,
        title,
        artist,
        album: `로컬 파일 (${ext.toUpperCase()})`,
        thumbnail: '',
        fileUrl: url,
        fileName: file.name,
        fileType: isVideo ? 'video' : 'audio',
        isVideo,
        isLocal: true,
        source: 'LOCAL',
        customLyrics: matchingLyrics?.customLyrics,
        customSubtitles: matchingLyrics?.customSubtitles,
        subtitlesUrl: matchingLyrics?.subtitlesUrl
      });
    });

    // If only lyrics files were uploaded, attach to existing matching local tracks
    if (mediaFiles.length === 0 && lyricsFiles.length > 0) {
      setLocalTracks(prev =>
        prev.map(t => {
          const tBase = t.fileName ? t.fileName.substring(0, t.fileName.lastIndexOf('.')) : t.title;
          const match = parsedLyricsMap.get(tBase.toLowerCase()) || parsedLyricsMap.get(t.title.toLowerCase());
          if (match) {
            return {
              ...t,
              customLyrics: match.customLyrics || t.customLyrics,
              customSubtitles: match.customSubtitles || t.customSubtitles,
              subtitlesUrl: match.subtitlesUrl || t.subtitlesUrl
            };
          }
          return t;
        })
      );
    } else {
      setLocalTracks(prev => [...prev, ...newTracks]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeLocalTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalTracks(prev => prev.filter(t => t.id !== id));
  };

  const clearAllLocalTracks = () => {
    setLocalTracks([]);
  };

  const currentList: (ChartItem | Track)[] =
    sidebarMode === 'chart' ? chart :
    sidebarMode === 'new' ? newSongs :
    sidebarMode === 'mv' ? mvTracks :
    sidebarMode === 'year' ? yearTracks :
    localTracks.filter(t => {
      if (localFilter === 'audio') return !t.isVideo;
      if (localFilter === 'video') return t.isVideo;
      return true;
    });

  // --- Track matching helper ---
  const matchTrack = async (item: ChartItem | Track): Promise<Track | null> => {
    // If it's already a local track
    if ((item as Track).isLocal && (item as Track).fileUrl) {
      return item as Track;
    }

    let videoId = item.videoId;
    let duration = item.duration;
    let fallbackThumbnail = '';

    if (!videoId) {
      const res = await axios.get('/api/match', {
        params: { title: item.title, artist: item.artist }
      });
      if (res.data.success && res.data.track) {
        videoId = res.data.track.videoId;
        duration = res.data.track.duration;
        fallbackThumbnail = res.data.track.thumbnail || '';
      }
    }

    if (videoId) {
      // Check login status for chart / new songs / year tracks preview rules
      let isLoggedIn = false;
      try {
        const savedUser = localStorage.getItem('wmp_user');
        isLoggedIn = !!savedUser;
      } catch (e) {}

      return {
        id: `${item.title}-${item.artist}-${videoId}`,
        title: item.title,
        artist: item.artist,
        album: item.album,
        thumbnail: item.thumbnail || fallbackThumbnail, // 각 음원 사이트의 고유 앨범 커버 최우선 적용
        videoId,
        duration,
        source: item.source,
        isVideo: sidebarMode === 'mv' || item.isVideo === true,
        isPreview: !isLoggedIn // 비로그인 상태는 1분 미리듣기, 로그인 시 풀버전 재생
      };
    }
    return null;
  };

  // --- Track play/queue ---
  const handleTrackAction = async (item: ChartItem | Track, action: 'play' | 'queue') => {
    if (isOffline && !(item as Track).isLocal) {
      alert('오프라인 상태입니다. 내 PC에 저장된 로컬 파일만 재생할 수 있습니다.');
      setSidebarMode('local');
      return;
    }

    setMatchingTrackTitle(item.title);
    try {
      const track = await matchTrack(item);
      if (track) {
        if (action === 'play') onPlayTrack(track);
        else onAddToQueue(track);
      }
    } catch (err) {
      console.error('Match error:', err);
    } finally {
      setMatchingTrackTitle(null);
    }
  };

  // --- Multi-selection handlers ---
  const toggleTrackSelection = (title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTrackTitles(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleSelectAll = () => {
    if (selectedTrackTitles.length === currentList.length) {
      setSelectedTrackTitles([]);
    } else {
      setSelectedTrackTitles(currentList.map(item => item.title));
    }
  };

  const handlePlaySelected = async () => {
    const selectedItems = currentList.filter(item => selectedTrackTitles.includes(item.title));
    if (selectedItems.length === 0) return;

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      try {
        const track = await matchTrack(item);
        if (track) {
          if (i === 0) {
            onPlayTrack(track);
          } else {
            onAddToQueue(track);
          }
        }
      } catch (err) {
        console.error('Error queuing selected track:', err);
      }
    }
  };

  const handleQueueSelected = async () => {
    const selectedItems = currentList.filter(item => selectedTrackTitles.includes(item.title));
    if (selectedItems.length === 0) return;

    for (const item of selectedItems) {
      try {
        const track = await matchTrack(item);
        if (track) {
          onAddToQueue(track);
        }
      } catch (err) {
        console.error('Error queuing selected track:', err);
      }
    }
  };

  const platforms = [
    { id: 'melon', name: '멜론' },
    { id: 'genie', name: '지니' },
    { id: 'flo', name: '플로(FLO)' },
    { id: 'bugs', name: '벅스' },
    { id: 'youtube', name: '유튜브' },
  ];

  const floAgeGroups = [
    { id: '', name: '전체' },
    { id: '10-20', name: '10~20대' },
    { id: '30-40', name: '30~40대' },
    { id: '50-60', name: '50~60대' },
    { id: '70-80', name: '70~80대' },
  ];

  const defaultMvPlatforms: MVPlatform[] = [
    { id: 'melon_new', name: '신곡 MV (멜론 기준)', query: '' },
    { id: 'all', name: '인기 통합 MV', query: '' },
    { id: 'melon', name: '멜론 MV', query: '' },
    { id: 'genie', name: '지니 MV', query: '' },
    { id: 'flo', name: '플로 MV', query: '' },
    { id: 'bugs', name: '벅스 MV', query: '' },
    { id: 'billboard', name: '빌보드 팝 MV', query: '' },
  ];

  const availableMvPlatforms = mvPlatforms.length > 0 ? mvPlatforms : defaultMvPlatforms;

  const modeLabel =
    sidebarMode === 'chart'
      ? platform === 'flo' && floAge
        ? `플로 ${floAgeGroups.find(ag => ag.id === floAge)?.name ?? floAge}`
        : `${platforms.find(p => p.id === platform)?.name ?? '실시간'} 차트`
      : sidebarMode === 'new'
      ? `${platforms.find(p => p.id === newPlatform)?.name ?? '멜론'} 신곡`
      : sidebarMode === 'mv'
      ? (availableMvPlatforms.find(p => p.id === selectedMvPlatform)?.name ?? '뮤직비디오')
      : sidebarMode === 'local'
      ? `오프라인 (${localTracks.length}곡)`
      : (selectedYear?.name ?? '연도');

  return (
    <aside className="w-80 md:w-96 flex flex-col h-full bg-zinc-900/80 border-r border-zinc-800/80 backdrop-blur-xl shrink-0">
      {/* Hidden File Input for Offline Mode */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        accept=".mp3,.flac,.wma,.wav,.m4a,.ogg,.mp4,.mkv,.avi,.webm,.mov,.lrc,.slf,.srt,.vtt,.txt"
        className="hidden"
      />

      {/* Header */}
      <div className="p-3 border-b border-zinc-800/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-500 text-white shadow-md shadow-rose-500/20">
              {sidebarMode === 'chart' ? <Flame className="w-4 h-4" /> :
               sidebarMode === 'new' ? <Sparkles className="w-4 h-4 text-amber-300" /> :
               sidebarMode === 'mv' ? <Film className="w-4 h-4" /> :
               sidebarMode === 'local' ? <HardDrive className="w-4 h-4" /> :
               <Calendar className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="font-bold text-sm text-white flex items-center gap-1.5 flex-wrap">
                {sidebarMode === 'chart' ? '실시간 차트' :
                 sidebarMode === 'new' ? '최신 신곡' :
                 sidebarMode === 'mv' ? '뮤직비디오' :
                 sidebarMode === 'local' ? '로컬/오프라인' :
                 '연도별 탐색'}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30 max-w-[120px] truncate">
                  {modeLabel}
                </span>
                {sidebarMode !== 'local' && (
                  (() => {
                    const isLoggedIn = !!localStorage.getItem('wmp_user');
                    return (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold border ${
                        isLoggedIn
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {isLoggedIn ? '풀버전' : '1분 미리듣기'}
                      </span>
                    );
                  })()
                )}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSelectMode(!isSelectMode)}
              className={`p-1.5 rounded-lg text-xs font-medium transition ${
                isSelectMode
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              title={isSelectMode ? '선택 모드 종료' : '다중 선택 모드'}
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (sidebarMode === 'chart') fetchChart(platform, platform === 'flo' ? floAge : '');
                else if (sidebarMode === 'new') fetchNewSongs(newPlatform);
                else if (sidebarMode === 'mv') fetchMvTracks(selectedMvPlatform);
                else if (sidebarMode === 'year' && selectedYear) fetchYearTracks(selectedYear.id);
              }}
              disabled={loading || sidebarMode === 'local'}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition disabled:opacity-50"
              title="새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-400 transition"
                title="차트/메뉴 패널 접기"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mode Toggle — 5 tabs: 차트 & 신곡 & MV & 연도 & 로컬(오프라인) */}
        <div className="grid grid-cols-5 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800/80 gap-0.5">
          <button
            onClick={() => {
              if (isOffline) {
                alert('오프라인 상태입니다. 인터넷 연결이 없어 로컬 파일만 재생할 수 있습니다.');
                return;
              }
              setSidebarMode('chart');
            }}
            className={`py-1.5 text-[10px] md:text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-0.5 ${
              sidebarMode === 'chart'
                ? 'bg-rose-600 text-white shadow'
                : isOffline
                ? 'text-zinc-600 cursor-not-allowed opacity-50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={isOffline ? '오프라인 상태 (이용 불가)' : '실시간 차트'}
          >
            <Flame className="w-3 h-3 shrink-0" /> 차트
          </button>
          <button
            onClick={() => {
              if (isOffline) {
                alert('오프라인 상태입니다. 인터넷 연결이 없어 로컬 파일만 재생할 수 있습니다.');
                return;
              }
              setSidebarMode('new');
              fetchNewSongs(newPlatform);
            }}
            className={`py-1.5 text-[10px] md:text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-0.5 ${
              sidebarMode === 'new'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                : isOffline
                ? 'text-zinc-600 cursor-not-allowed opacity-50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={isOffline ? '오프라인 상태 (이용 불가)' : '최신 신곡'}
          >
            <Sparkles className="w-3 h-3 shrink-0" /> 신곡
          </button>
          <button
            onClick={() => {
              if (isOffline) {
                alert('오프라인 상태입니다. 인터넷 연결이 없어 로컬 파일만 재생할 수 있습니다.');
                return;
              }
              setSidebarMode('mv');
              if (mvPlatforms.length === 0) fetchMvPlatforms();
              fetchMvTracks(selectedMvPlatform);
            }}
            className={`py-1.5 text-[10px] md:text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-0.5 ${
              sidebarMode === 'mv'
                ? 'bg-purple-600 text-white shadow'
                : isOffline
                ? 'text-zinc-600 cursor-not-allowed opacity-50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={isOffline ? '오프라인 상태 (이용 불가)' : '뮤직비디오'}
          >
            <Film className="w-3 h-3 shrink-0" /> MV
          </button>
          <button
            onClick={() => {
              if (isOffline) {
                alert('오프라인 상태입니다. 인터넷 연결이 없어 로컬 파일만 재생할 수 있습니다.');
                return;
              }
              setSidebarMode('year');
              if (yearCategories.length === 0) fetchYearCategories();
            }}
            className={`py-1.5 text-[10px] md:text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-0.5 ${
              sidebarMode === 'year'
                ? 'bg-indigo-600 text-white shadow'
                : isOffline
                ? 'text-zinc-600 cursor-not-allowed opacity-50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={isOffline ? '오프라인 상태 (이용 불가)' : '연도별 노래'}
          >
            <Calendar className="w-3 h-3 shrink-0" /> 연도
          </button>
          <button
            onClick={() => setSidebarMode('local')}
            className={`py-1.5 text-[10px] md:text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-0.5 ${
              sidebarMode === 'local'
                ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-500/40'
                : isOffline
                ? 'bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title={isOffline ? '오프라인 모드 활성 (내 PC 파일)' : '내 PC 로컬 파일'}
          >
            <HardDrive className="w-3 h-3 shrink-0 text-emerald-300" /> 로컬
          </button>
        </div>
      </div>

      {/* Sub-filter area: Chart */}
      {sidebarMode === 'chart' && (
        <div className="p-2 bg-zinc-950/40 border-b border-zinc-800/60 flex flex-col gap-2">
          <div className="grid grid-cols-5 gap-1">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPlatform(p.id as any);
                  if (p.id !== 'flo') setFloAge('');
                }}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-medium transition-all text-center truncate ${
                  platform === p.id
                    ? 'bg-zinc-800 text-white border border-zinc-700/80 font-semibold shadow'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {platform === 'flo' && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/50">
              <span className="text-[10px] font-semibold text-rose-400 shrink-0 flex items-center gap-1 px-1">
                <Users className="w-3 h-3" /> 연령대:
              </span>
              <div className="flex items-center gap-1 flex-1">
                {floAgeGroups.map((ag) => (
                  <button
                    key={ag.id}
                    onClick={() => setFloAge(ag.id as any)}
                    className={`flex-1 py-1 rounded-md text-[10px] font-medium transition-all text-center ${
                      floAge === ag.id
                        ? 'bg-gradient-to-r from-rose-500 to-indigo-500 text-white font-bold shadow'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    {ag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-filter area: New Songs (신곡) */}
      {sidebarMode === 'new' && (
        <div className="p-2 bg-zinc-950/40 border-b border-zinc-800/60 flex flex-col gap-2">
          <div className="grid grid-cols-5 gap-1">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setNewPlatform(p.id as any);
                  fetchNewSongs(p.id);
                }}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-medium transition-all text-center truncate ${
                  newPlatform === p.id
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sub-filter area: MV */}
      {sidebarMode === 'mv' && (
        <div className="p-2.5 bg-zinc-950/50 border-b border-zinc-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {availableMvPlatforms.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedMvPlatform(p.id);
                  fetchMvTracks(p.id);
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                  selectedMvPlatform === p.id
                    ? 'bg-gradient-to-r from-purple-500 to-rose-500 text-white font-bold shadow'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800/80'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sub-filter area: Year */}
      {sidebarMode === 'year' && (
        <div className="p-2.5 bg-zinc-950/50 border-b border-zinc-800/60 flex flex-col gap-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
            {yearCategories.map((cat, idx) => (
              <button
                key={cat.label}
                onClick={() => {
                  setActiveYearCategoryIndex(idx);
                  if (cat.years.length > 0) {
                    const y = cat.years[cat.years.length - 1];
                    setSelectedYear(y);
                    fetchYearTracks(y.id);
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  activeYearCategoryIndex === idx
                    ? 'bg-emerald-700 text-white border border-emerald-600'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {yearCategories[activeYearCategoryIndex] && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {yearCategories[activeYearCategoryIndex].years.map((y) => (
                <button
                  key={y.id}
                  onClick={() => {
                    setSelectedYear(y);
                    fetchYearTracks(y.id);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                    selectedYear?.id === y.id
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800/80'
                  }`}
                >
                  {y.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-filter area: Local / Offline Mode */}
      {sidebarMode === 'local' && (
        <div className="p-2.5 bg-zinc-950/50 border-b border-zinc-800/60 flex flex-col gap-2">
          {/* Upload Button + Clear Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow transition"
            >
              <FolderOpen className="w-4 h-4" /> 파일 불러오기 (.mp3, .mp4, .flac 등)
            </button>
            {localTracks.length > 0 && (
              <button
                onClick={clearAllLocalTracks}
                className="p-1.5 bg-zinc-800 hover:bg-rose-600 text-zinc-400 hover:text-white rounded-lg transition"
                title="목록 비우기"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills: All / Audio / Video */}
          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setLocalFilter('all')}
              className={`flex-1 py-1 rounded-md text-center transition ${
                localFilter === 'all' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              전체 ({localTracks.length})
            </button>
            <button
              onClick={() => setLocalFilter('audio')}
              className={`flex-1 py-1 rounded-md text-center transition ${
                localFilter === 'audio' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              음원 ({localTracks.filter(t => !t.isVideo).length})
            </button>
            <button
              onClick={() => setLocalFilter('video')}
              className={`flex-1 py-1 rounded-md text-center transition ${
                localFilter === 'video' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              영상/MV ({localTracks.filter(t => t.isVideo).length})
            </button>
          </div>
        </div>
      )}

      {/* Multi-selection Action Toolbar */}
      {isSelectMode && (
        <div className="px-3 py-2 bg-zinc-950/90 border-b border-zinc-800/80 flex items-center justify-between gap-2">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white"
          >
            {selectedTrackTitles.length === currentList.length ? (
              <CheckSquare className="w-4 h-4 text-rose-500" />
            ) : (
              <Square className="w-4 h-4 text-zinc-500" />
            )}
            <span>전체 ({selectedTrackTitles.length}/{currentList.length})</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePlaySelected}
              disabled={selectedTrackTitles.length === 0}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow transition"
            >
              <Play className="w-3 h-3 fill-current" /> 선택 재생
            </button>
            <button
              onClick={handleQueueSelected}
              disabled={selectedTrackTitles.length === 0}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 border border-zinc-700 transition"
            >
              <ListPlus className="w-3 h-3" /> 담기
            </button>
          </div>
        </div>
      )}

      {/* Track list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="h-48 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <div className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin ${
              sidebarMode === 'chart' ? 'border-rose-500' :
              sidebarMode === 'mv' ? 'border-purple-500' :
              sidebarMode === 'local' ? 'border-emerald-500' :
              'border-indigo-500'
            }`} />
            <span className="text-xs">목록을 불러오는 중...</span>
          </div>
        ) : currentList.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-zinc-500 text-xs">
            {sidebarMode === 'local' ? (
              <>
                <HardDrive className="w-8 h-8 mb-2 text-zinc-600" />
                <p>로컬에 저장된 음원 및 비디오 파일을 불러와 오프라인 상태에서도 자유롭게 청취/시청할 수 있습니다.</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow"
                >
                  파일 추가하기
                </button>
              </>
            ) : (
              '음악 목록이 없습니다.'
            )}
          </div>
        ) : (
          currentList.map((item, idx) => {
            const isCurrent = currentTrackId?.includes(item.title);
            const isMatching = matchingTrackTitle === item.title;
            const isSelected = selectedTrackTitles.includes(item.title);
            const isLocal = (item as Track).isLocal;

            return (
              <div
                key={`${idx}-${item.title}`}
                onClick={() => {
                  if (isSelectMode) {
                    toggleTrackSelection(item.title, { stopPropagation: () => {} } as any);
                  } else {
                    handleTrackAction(item, 'play');
                  }
                }}
                className={`group relative flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-rose-500/20 border border-rose-500/50 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-rose-500/15 border border-rose-500/30 text-white'
                    : 'hover:bg-zinc-800/80 text-zinc-300'
                }`}
              >
                {/* Checkbox / Rank */}
                {isSelectMode ? (
                  <button
                    onClick={(e) => toggleTrackSelection(item.title, e)}
                    className="w-6 flex items-center justify-center shrink-0 text-zinc-400 hover:text-rose-400"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-600" />
                    )}
                  </button>
                ) : (
                  <span
                    className={`w-6 text-center font-bold shrink-0 ${
                      (item.rank || idx + 1) === 1 ? 'text-amber-400 font-extrabold text-base' :
                      (item.rank || idx + 1) === 2 ? 'text-zinc-300 font-bold text-sm' :
                      (item.rank || idx + 1) === 3 ? 'text-amber-600 font-bold text-sm' :
                      'text-zinc-500 text-xs'
                    }`}
                  >
                    {item.rank || idx + 1}
                  </span>
                )}

                {/* Thumbnail / Icon */}
                <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                  ) : item.isVideo ? (
                    <FileVideo className="w-5 h-5 text-purple-400" />
                  ) : (
                    <FileAudio className="w-5 h-5 text-emerald-400" />
                  )}
                  {/* Play Overlay */}
                  <div
                    className={`absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all ${
                      isCurrent && isPlaying ? '!opacity-100 bg-black/40' : ''
                    }`}
                  >
                    {isMatching ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    )}
                  </div>
                </div>

                {/* Song info */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="font-medium text-xs truncate text-zinc-100 group-hover:text-rose-300 transition flex items-center gap-1.5">
                    <span className="truncate">{item.title}</span>
                    {item.isVideo && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold border border-purple-500/30 shrink-0">
                        MV
                      </span>
                    )}
                    {isLocal && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/30 shrink-0">
                        OFFLINE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {item.artist}
                  </div>
                </div>

                {/* Queue / Delete button */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {isLocal ? (
                    <button
                      onClick={(e) => removeLocalTrack((item as Track).id, e)}
                      className="p-1.5 hover:bg-rose-900/60 rounded-md text-zinc-400 hover:text-rose-400 transition"
                      title="로컬 목록에서 제거"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrackAction(item, 'queue');
                      }}
                      className="p-1.5 hover:bg-zinc-700 rounded-md text-zinc-400 hover:text-white transition"
                      title="대기열에 추가"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
