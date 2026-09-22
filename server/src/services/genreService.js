import axios from 'axios';
import * as cheerio from 'cheerio';
import ytSearch from 'yt-search';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const genreCache = {
  data: {},
  timestamp: {}
};
const CACHE_TTL = 15 * 60 * 1000; // 15분

export const GENRE_CATEGORIES = [
  {
    category: '국내 가요 (K-POP & Domestic)',
    genres: [
      { id: 'dance', name: '댄스 / 아이돌', code: 'GN0200', query: '인기 댄스 아이돌 노래' },
      { id: 'ballad', name: '발라드', code: 'GN0100', query: '인기 발라드 노래' },
      { id: 'hiphop', name: '힙합 & R&B', code: 'GN0300', query: '한국 힙합 알앤비 인기곡' },
      { id: 'indie', name: '인디 & 어쿠스틱', code: 'GN0500', query: '인기 인디 음악 노래' },
      { id: 'rock', name: '락 & 밴드', code: 'GN0600', query: '한국 록 밴드 명곡 인기곡' },
      { id: 'trot', name: '트로트', code: 'GN0700', query: '인기 트로트 노래 차트' },
      { id: 'folk', name: '포크 & 블루스', code: 'GN0800', query: '포크 블루스 명곡' },
    ]
  },
  {
    category: '해외 팝 (Global & POP)',
    genres: [
      { id: 'pop_hot', name: '빌보드 Hot 100', code: 'GN0900', query: 'Billboard Hot 100 official audio' },
      { id: 'pop_dance', name: '팝 댄스 & 일렉트로닉', code: 'GN1100', query: 'EDM Electronic Dance Pop hits' },
      { id: 'pop_rnb', name: '해외 R&B / 소울', code: 'GN1200', query: 'Trending Pop R&B Soul music' },
      { id: 'pop_rock', name: '해외 락 & 얼터너티브', code: 'GN1000', query: 'Rock Alternative Pop hits' },
      { id: 'pop_lofi', name: 'Lo-Fi & 칠합 (Chill)', code: 'GN1300', query: 'Lofi hip hop chill beats to relax study' },
    ]
  },
  {
    category: '영상 & 서브컬처 (OST & Global Music)',
    genres: [
      { id: 'ost_drama', name: '드라마 / 영화 OST', code: 'GN1500', query: '인기 드라마 영화 OST 모음' },
      { id: 'jpop', name: 'J-POP & 일본 음악', code: 'GN1900', query: 'J-POP 인기곡 플레이리스트' },
      { id: 'anime', name: '애니메이션 OST', code: 'GN1500_A', query: '인기 애니메이션 명곡 OST' },
      { id: 'game', name: '게임 BGM / OST', code: 'GN1500_G', query: 'Game OST soundtrack' },
    ]
  },
  {
    category: '클래식 & 재즈 (Classic & Jazz)',
    genres: [
      { id: 'jazz', name: '재즈 (Jazz)', code: 'GN1700', query: 'Coffee shop Jazz Cafe Piano' },
      { id: 'classic', name: '클래식 (Classic)', code: 'GN1600', query: 'Classical music masterpiece' },
      { id: 'newage', name: '뉴에이지 & 피아노', code: 'GN1800', query: 'New Age Piano instrumental relaxing' },
    ]
  },
  {
    category: '테마 & 무드 (Mood & Vibes)',
    genres: [
      { id: 'driving', name: '신나는 드라이브', code: 'MOOD_DRIVE', query: '드라이브 신나는 노래 팝송' },
      { id: 'study', name: '공부 / 집중 / 카페', code: 'MOOD_STUDY', query: '공부할 때 듣는 카페 음악 피아노' },
      { id: 'workout', name: '헬스 & 운동 비트', code: 'MOOD_WORKOUT', query: '헬스 운동할 때 듣는 신나는 힙합 EDM' },
      { id: 'sleep', name: '새벽 감성 & 수면', code: 'MOOD_SLEEP', query: '새벽 감성 잠잘 때 듣는 잔잔한 노래' },
    ]
  }
];

/**
 * 멜론 장르별 차트 크롤링
 */
async function crawlMelonGenre(genreCode) {
  try {
    const url = `https://www.melon.com/chart/day/index.htm?classCd=${genreCode}`;
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000
    });
    const $ = cheerio.load(data);
    const tracks = [];

    $('tr.lst50, tr.lst100').each((i, el) => {
      if (i >= 50) return;
      const rank = $(el).find('span.rank').first().text().trim();
      const title = $(el).find('.ellipsis.rank01 a').first().text().trim();
      const artist = $(el).find('.ellipsis.rank02 > a').map((_, a) => $(a).text().trim()).get().join(', ');
      const album = $(el).find('.ellipsis.rank03 a').first().text().trim();
      const thumbnail = $(el).find('a.image_typeAll img').attr('src') || '';

      if (title && artist) {
        tracks.push({
          rank: parseInt(rank, 10) || i + 1,
          title,
          artist,
          album,
          thumbnail: thumbnail.split('?')[0] || thumbnail,
          source: 'melon_genre'
        });
      }
    });

    return tracks;
  } catch (err) {
    console.error(`Melon genre ${genreCode} error:`, err.message);
    return [];
  }
}

/**
 * 유튜브 기반 장르 트랙 검색 및 수집
 */
async function searchYoutubeGenre(query, genreName) {
  try {
    const res = await ytSearch(query);
    if (res && res.videos && res.videos.length > 0) {
      return res.videos.slice(0, 40).map((v, idx) => {
        const cleanTitle = v.title.replace(/\[.*?\]|\(.*?\)|official|mv|m\/v|audio|가사|lyrics/gi, '').trim();
        return {
          rank: idx + 1,
          title: cleanTitle || v.title,
          artist: v.author?.name || 'Various Artists',
          album: genreName || 'Genre Spotlight',
          thumbnail: v.thumbnail || v.image,
          videoId: v.videoId,
          duration: v.duration?.seconds || 0,
          source: 'youtube_genre'
        };
      });
    }
  } catch (err) {
    console.error(`YouTube genre error:`, err.message);
  }
  return [];
}

/**
 * 특정 장르 ID의 노래 목록 가져오기
 */
export async function getTracksByGenre(genreId) {
  const cacheKey = `genre_${genreId}`;
  if (genreCache.data[cacheKey] && Date.now() - genreCache.timestamp[cacheKey] < CACHE_TTL) {
    return genreCache.data[cacheKey];
  }

  // Find genre info
  let targetGenre = null;
  for (const cat of GENRE_CATEGORIES) {
    const found = cat.genres.find(g => g.id === genreId);
    if (found) {
      targetGenre = found;
      break;
    }
  }

  if (!targetGenre) {
    targetGenre = GENRE_CATEGORIES[0].genres[0];
  }

  let tracks = [];

  // If Melon code exists and is GN..., try Melon first
  if (targetGenre.code.startsWith('GN') && !targetGenre.code.includes('_')) {
    tracks = await crawlMelonGenre(targetGenre.code);
  }

  // If Melon returned few or no tracks, or it's a theme/mood genre, use YouTube Search
  if (!tracks || tracks.length < 5) {
    tracks = await searchYoutubeGenre(targetGenre.query, targetGenre.name);
  }

  if (tracks.length > 0) {
    genreCache.data[cacheKey] = {
      genre: targetGenre,
      tracks
    };
    genreCache.timestamp[cacheKey] = Date.now();
    return genreCache.data[cacheKey];
  }

  return {
    genre: targetGenre,
    tracks: []
  };
}
