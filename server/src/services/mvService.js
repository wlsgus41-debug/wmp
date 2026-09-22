import ytSearch from 'yt-search';

// 1-hour cache for MV charts
const mvCache = {
  data: {},
  timestamp: {}
};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export const MV_PLATFORMS = [
  { id: 'melon_new', name: '신곡 MV (멜론 기준)', query: '멜론 최신 신곡 Official Music Video' },
  { id: 'all', name: '인기 통합 Official MV', query: 'Official Music Video KPOP playlist' },
  { id: 'melon', name: '멜론 Official MV', query: '멜론 인기 Official MV' },
  { id: 'genie', name: '지니 Official MV', query: '지니 인기 Official MV' },
  { id: 'flo', name: '플로 Official MV', query: 'FLO 인기 Official MV' },
  { id: 'bugs', name: '벅스 Official MV', query: '벅스 인기 Official MV' },
  { id: 'billboard', name: '글로벌 팝 Official MV', query: 'Billboard Hot 100 Official Music Video' },
];

/**
 * 플랫폼별 오직 'Official MV'만 필터링하여 가져오기
 */
export async function getMusicVideos(platformId = 'all') {
  const cacheKey = `mv_${platformId}`;
  if (mvCache.data[cacheKey] && Date.now() - mvCache.timestamp[cacheKey] < CACHE_TTL) {
    return mvCache.data[cacheKey];
  }

  const target = MV_PLATFORMS.find(p => p.id === platformId) || MV_PLATFORMS[0];
  const query = `${target.query} "Official MV"`;

  try {
    const res = await ytSearch(query);
    if (res && res.videos && res.videos.length > 0) {
      // Exclude non-official content: news, reactions, covers, 1-hour, shorts, dance practice, live stage, teaser
      const excludedKeywords = [
        '뉴스', 'sbs', 'kbs', 'mbc', 'jtbc', '연예', '화제', 'reaction', '리액션', 'cover', '커버',
        '1시간', '1hour', '모음', 'playlist', 'shorts', 'dance practice', '안무영상', '교차편집',
        'stage', 'live', '직캠', 'fancam', 'teaser', '티저', 'making', 'behind', '비하인드', 'audio', '가사', 'lyrics'
      ];

      const items = res.videos
        .filter(v => {
          const t = v.title.toLowerCase();
          const dur = v.duration?.seconds || 0;

          // Duration check: standard MV is between 90s and 420s (7 minutes)
          if (dur < 90 || dur > 450) return false;

          // Exclude non-official keywords
          const hasExcluded = excludedKeywords.some(kw => t.includes(kw));
          if (hasExcluded) return false;

          // Must be an Official Music Video (M/V or MV or Official Music Video)
          const isOfficial = t.includes('official') || t.includes('m/v') || t.includes('mv') || t.includes('music video');
          return isOfficial;
        })
        .slice(0, 50)
        .map((v, idx) => {
          let cleanTitle = v.title
            .replace(/\[Official.*?\]|\(Official.*?\)/gi, '')
            .replace(/\[M\/V\]|\(M\/V\)|\[MV\]|\(MV\)/gi, '')
            .replace(/Official Music Video|Music Video/gi, '')
            .trim() || v.title;

          return {
            rank: idx + 1,
            title: cleanTitle,
            artist: v.author?.name || 'Official Artist',
            album: `${target.name}`,
            thumbnail: v.thumbnail || v.image,
            videoId: v.videoId,
            duration: v.duration?.seconds || 0,
            isVideo: true,
            source: `mv_${platformId}`
          };
        });

      mvCache.data[cacheKey] = items;
      mvCache.timestamp[cacheKey] = Date.now();
      return items;
    }
  } catch (err) {
    console.error(`MV fetch error (${platformId}):`, err.message);
  }

  return [];
}
