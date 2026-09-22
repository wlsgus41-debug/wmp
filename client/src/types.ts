export interface SubtitleItem {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail: string;
  duration?: number;
  rank?: number;
  videoId?: string; // YouTube videoId if online
  fileUrl?: string; // Blob or Object URL if local file
  fileType?: string; // 'audio' | 'video'
  fileName?: string;
  source?: string;
  isVideo?: boolean;
  isLocal?: boolean;
  isPreview?: boolean; // 1-minute preview mode for unauthenticated sources
  lyricsFileUrl?: string;
  subtitlesUrl?: string;
  customLyrics?: LyricLine[];
  customSubtitles?: SubtitleItem[];
}

export interface ChartItem {
  rank: number;
  title: string;
  artist: string;
  album: string;
  thumbnail: string;
  videoId?: string;
  fileUrl?: string;
  duration?: number;
  source: string;
  isVideo?: boolean;
  isLocal?: boolean;
  isPreview?: boolean;
}

export interface GenreItem {
  id: string;
  name: string;
  code: string;
  query: string;
}

export interface GenreCategory {
  category: string;
  genres: GenreItem[];
}

export interface YearItem {
  id: string;
  name: string;
  query: string;
}

export interface YearCategory {
  label: string;
  years: YearItem[];
}

export interface MVPlatform {
  id: string;
  name: string;
  query: string;
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface LyricsResponse {
  success: boolean;
  primary: {
    plainLyrics: string;
    syncedLyrics: LyricLine[];
    source: string;
  };
  availableSources: string[];
}

export interface TrendingKeyword {
  rank: number;
  keyword: string;
  title: string;
  artist: string;
  thumbnail?: string;
  rankDiff?: 'up' | 'down' | 'same' | 'new';
  diffVal?: number;
  source: string;
  searchUrl?: string;
}

export interface PlatformPasses {
  melon?: boolean;
  bugs?: boolean;
  spotify?: boolean;
  flo?: boolean;
  genie?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  provider: 'email' | 'melon' | 'bugs' | 'spotify' | 'flo' | 'genie' | 'google';
  avatar?: string;
  passes: PlatformPasses;
  joinedAt: string;
}
