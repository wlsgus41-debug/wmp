import ytSearch from 'yt-search';

const yearCache = {
  data: {},
  timestamp: {}
};
const CACHE_TTL = 20 * 60 * 1000; // 20분

export const YEAR_CATEGORIES = [
  {
    label: '클래식 연대',
    years: [
      { id: '1960s', name: '1960년대', query: '1960년대 명곡 한국 팝 인기곡' },
      { id: '1970s', name: '1970년대', query: '1970년대 명곡 한국 팝 포크 인기곡' },
      { id: '1980s', name: '1980년대', query: '1980s Korean pop hits classic 80s' },
      { id: '1990s', name: '1990년대', query: '90년대 인기가요 명곡 추억의 노래' },
    ]
  },
  {
    label: '2000년대',
    years: [
      { id: '2000', name: '2000년', query: '2000년 인기가요 히트곡' },
      { id: '2001', name: '2001년', query: '2001년 인기가요 히트곡' },
      { id: '2002', name: '2002년', query: '2002년 인기가요 히트곡' },
      { id: '2003', name: '2003년', query: '2003년 인기가요 히트곡' },
      { id: '2004', name: '2004년', query: '2004년 인기가요 히트곡' },
      { id: '2005', name: '2005년', query: '2005년 인기가요 히트곡' },
      { id: '2006', name: '2006년', query: '2006년 인기가요 히트곡' },
      { id: '2007', name: '2007년', query: '2007년 인기가요 히트곡' },
      { id: '2008', name: '2008년', query: '2008년 인기가요 히트곡' },
      { id: '2009', name: '2009년', query: '2009년 인기가요 히트곡' },
    ]
  },
  {
    label: '2010년대',
    years: [
      { id: '2010', name: '2010년', query: '2010년 인기가요 히트곡 playlist' },
      { id: '2011', name: '2011년', query: '2011년 인기가요 히트곡 playlist' },
      { id: '2012', name: '2012년', query: '2012년 인기가요 히트곡 playlist' },
      { id: '2013', name: '2013년', query: '2013년 인기가요 히트곡 playlist' },
      { id: '2014', name: '2014년', query: '2014년 인기가요 히트곡 playlist' },
      { id: '2015', name: '2015년', query: '2015년 인기가요 히트곡 playlist' },
      { id: '2016', name: '2016년', query: '2016년 인기가요 히트곡 playlist' },
      { id: '2017', name: '2017년', query: '2017년 인기가요 히트곡 playlist' },
      { id: '2018', name: '2018년', query: '2018년 인기가요 히트곡 playlist' },
      { id: '2019', name: '2019년', query: '2019년 인기가요 히트곡 playlist' },
    ]
  },
  {
    label: '2020년대',
    years: [
      { id: '2020', name: '2020년', query: '2020년 인기가요 히트곡 KPOP' },
      { id: '2021', name: '2021년', query: '2021년 인기가요 히트곡 KPOP' },
      { id: '2022', name: '2022년', query: '2022년 인기가요 히트곡 KPOP' },
      { id: '2023', name: '2023년', query: '2023년 인기가요 히트곡 KPOP' },
      { id: '2024', name: '2024년', query: '2024년 인기가요 히트곡 KPOP' },
      { id: '2025', name: '2025년', query: '2025년 인기가요 히트곡 KPOP' },
      { id: '2026', name: '2026년', query: '2026년 신곡 인기가요 KPOP' },
    ]
  }
];

// Decade-specific queries for classic eras
const DECADE_QUERIES = {
  '1960s': [
    '1960년대 한국 팝 명곡 추억의 노래',
    '1960s Korean pop classic hits',
    '1960년대 한국 가요 best'
  ],
  '1970s': [
    '1970년대 한국 포크 명곡 추억',
    '1970s Korean classic hits playlist',
    '70년대 한국 가요 명곡'
  ],
  '1980s': [
    '1980년대 한국 팝 댄스 명곡 추억',
    '80년대 인기가요 명곡 모음',
    '1980s Kpop classic hits'
  ],
  '1990s': [
    '90년대 인기가요 명곡 모음 추억',
    '1990년대 한국 댄스 발라드 명곡',
    '90s Korean pop hits playlist'
  ]
};

/**
 * 연도/연대별 노래 목록 가져오기
 */
export async function getTracksByYear(yearId) {
  const cacheKey = `year_${yearId}`;
  if (yearCache.data[cacheKey] && Date.now() - yearCache.timestamp[cacheKey] < CACHE_TTL) {
    return yearCache.data[cacheKey];
  }

  // Find year info
  let targetYear = null;
  for (const cat of YEAR_CATEGORIES) {
    const found = cat.years.find(y => y.id === yearId);
    if (found) {
      targetYear = found;
      break;
    }
  }

  if (!targetYear) {
    targetYear = YEAR_CATEGORIES[YEAR_CATEGORIES.length - 1].years.at(-1);
  }

  const tracks = [];

  // Use multiple queries for decade searches
  const queries = DECADE_QUERIES[yearId]
    ? DECADE_QUERIES[yearId]
    : [targetYear.query, `${targetYear.name} 인기 히트곡 노래 모음`, `${yearId} kpop hits top songs`];

  for (const query of queries) {
    if (tracks.length >= 40) break;
    try {
      const res = await ytSearch(query);
      if (res && res.videos && res.videos.length > 0) {
        const newTracks = res.videos
          .filter(v => !tracks.some(t => t.videoId === v.videoId))
          .slice(0, Math.max(0, 40 - tracks.length))
          .map((v, idx) => {
            const rawTitle = v.title;
            const cleanTitle = rawTitle
              .replace(/\[.*?\]|\(.*?\)/g, '')
              .replace(/official|mv|m\/v|audio|가사|lyrics|playlist|playlists|모음|히트곡|인기가요/gi, '')
              .trim() || rawTitle;

            return {
              rank: tracks.length + idx + 1,
              title: cleanTitle,
              artist: v.author?.name || 'Various Artists',
              album: `${targetYear.name} 히트곡`,
              thumbnail: v.thumbnail || v.image,
              videoId: v.videoId,
              duration: v.duration?.seconds || 0,
              source: `youtube_${yearId}`
            };
          });

        tracks.push(...newTracks);
      }
    } catch (err) {
      console.error(`Year search error (${query}):`, err.message);
    }
  }

  const result = {
    year: targetYear,
    tracks
  };

  if (tracks.length > 0) {
    yearCache.data[cacheKey] = result;
    yearCache.timestamp[cacheKey] = Date.now();
  }

  return result;
}
