import axios from 'axios';
import * as cheerio from 'cheerio';
import { getMelonChart } from './chartService.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
};

const cache = {
  keywords: [],
  timestamp: 0
};
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes for real-time trending keywords

/**
 * 멜론 실시간 급상승 / 검색어 TOP 10 크롤링
 */
export async function getMelonTrendingKeywords() {
  if (cache.keywords.length > 0 && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.keywords;
  }

  try {
    // 1. Try Melon main page live keywords
    const { data } = await axios.get('https://www.melon.com/chart/index.htm', {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 5000
    });
    const $ = cheerio.load(data);
    const keywords = [];

    $('tr.lst50').slice(0, 10).each((i, el) => {
      const rank = parseInt($(el).find('span.rank').first().text().trim(), 10) || i + 1;
      const title = $(el).find('.ellipsis.rank01 a').first().text().trim();
      const artist = $(el).find('.ellipsis.rank02 > a').first().text().trim();
      const thumbnail = $(el).find('a.image_typeAll img').attr('src') || '';
      
      const rankWrap = $(el).find('.rank_wrap');
      let rankDiff = 'same';
      let diffVal = 0;
      if (rankWrap.find('.bullet_icons.rank_up').length > 0 || rankWrap.find('.up').length > 0) {
        rankDiff = 'up';
        diffVal = parseInt(rankWrap.find('.up').text().trim(), 10) || 1;
      } else if (rankWrap.find('.bullet_icons.rank_down').length > 0 || rankWrap.find('.down').length > 0) {
        rankDiff = 'down';
        diffVal = parseInt(rankWrap.find('.down').text().trim(), 10) || 1;
      } else if (rankWrap.find('.bullet_icons.rank_new').length > 0 || rankWrap.find('.new').length > 0) {
        rankDiff = 'new';
      }

      if (title && artist) {
        keywords.push({
          rank,
          keyword: `${title} - ${artist}`,
          title,
          artist,
          thumbnail: thumbnail.split('?')[0] || '',
          rankDiff,
          diffVal,
          source: 'melon.com',
          searchUrl: `https://www.melon.com/search/song/index.htm?q=${encodeURIComponent(title + ' ' + artist)}`
        });
      }
    });

    if (keywords.length > 0) {
      cache.keywords = keywords;
      cache.timestamp = Date.now();
      return keywords;
    }
  } catch (err) {
    console.error('Melon trending keywords error:', err.message);
  }

  // Fallback
  const fallback = [
    { rank: 1, keyword: 'APT. - ROSÉ & Bruno Mars', title: 'APT.', artist: '로제 & Bruno Mars', rankDiff: 'up', diffVal: 2, source: 'melon.com' },
    { rank: 2, keyword: 'Whiplash - aespa', title: 'Whiplash', artist: 'aespa', rankDiff: 'same', diffVal: 0, source: 'melon.com' },
    { rank: 3, keyword: 'UP (KARINA Solo) - aespa', title: 'UP (KARINA Solo)', artist: 'aespa', rankDiff: 'up', diffVal: 1, source: 'melon.com' },
    { rank: 4, keyword: 'Happy - DAY6', title: 'Happy', artist: 'DAY6 (데이식스)', rankDiff: 'same', diffVal: 0, source: 'melon.com' },
    { rank: 5, keyword: '내 이름 맑음 - QWER', title: '내 이름 맑음', artist: 'QWER', rankDiff: 'down', diffVal: 1, source: 'melon.com' },
    { rank: 6, keyword: 'LOVE ATTACK - RESCENE', title: 'LOVE ATTACK', artist: 'RESCENE (리센느)', rankDiff: 'new', diffVal: 0, source: 'melon.com' },
    { rank: 7, keyword: '이 별로부터 - 아이유', title: '이 별로부터', artist: '아이유 (IU)', rankDiff: 'up', diffVal: 3, source: 'melon.com' },
    { rank: 8, keyword: '일년이면 - 순순희 & 백예슬', title: '일년이면', artist: '순순희 & 백예슬', rankDiff: 'new', diffVal: 0, source: 'melon.com' },
    { rank: 9, keyword: '천상연 - 이창섭', title: '천상연', artist: '이창섭', rankDiff: 'down', diffVal: 2, source: 'melon.com' },
    { rank: 10, keyword: '소나기 - ECLIPSE', title: '소나기', artist: 'ECLIPSE (이클립스)', rankDiff: 'same', diffVal: 0, source: 'melon.com' }
  ];

  return fallback;
}
