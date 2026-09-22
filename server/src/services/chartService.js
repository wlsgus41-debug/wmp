import axios from 'axios';
import * as cheerio from 'cheerio';
import ytSearch from 'yt-search';

// 1-hour in-memory cache
const cache = { data: {}, timestamp: {} };
const CACHE_TTL = 60 * 60 * 1000;

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Cache-Control': 'no-cache',
};

// ─── Melon ───────────────────────────────────────────────────────────────────
export async function getMelonChart() {
  const key = 'melon';
  if (cache.data[key] && Date.now() - cache.timestamp[key] < CACHE_TTL) return cache.data[key];

  try {
    const { data } = await axios.get('https://www.melon.com/chart/index.htm', {
      headers: HEADERS, timeout: 8000
    });
    const $ = cheerio.load(data);
    const chart = [];

    $('tr.lst50, tr.lst100').each((i, el) => {
      const rank  = $(el).find('span.rank').first().text().trim();
      const title = $(el).find('.ellipsis.rank01 a').first().text().trim();
      const artist = $(el).find('.ellipsis.rank02 > a').map((_, a) => $(a).text().trim()).get().join(', ')
                  || $(el).find('#artistName a').first().text().trim();
      const album  = $(el).find('.ellipsis.rank03 a').first().text().trim();
      let thumbnail = $(el).find('a.image_typeAll img').attr('src') || '';
      if (thumbnail) {
        thumbnail = thumbnail.split('?')[0].replace(/\/resize\/\d+\/quality\/\d+\/optimize/, '/resize/500/quality/90/optimize');
      }
      if (title && artist) chart.push({ rank: parseInt(rank, 10) || i + 1, title, artist, album, thumbnail, source: 'melon' });
    });

    if (chart.length > 0) { cache.data[key] = chart; cache.timestamp[key] = Date.now(); return chart; }
  } catch (err) {
    console.error('Melon Chart Error:', err.message);
  }
  return cache.data[key] || getFallbackChart('melon');
}

// ─── Genie ────────────────────────────────────────────────────────────────────
export async function getGenieChart() {
  const key = 'genie';
  if (cache.data[key] && Date.now() - cache.timestamp[key] < CACHE_TTL) return cache.data[key];

  try {
    const chart = [];
    for (let page = 1; page <= 2; page++) {
      const { data } = await axios.get(`https://www.genie.co.kr/chart/top200?ditc=D&rtm=N&pg=${page}`, {
        headers: HEADERS, timeout: 8000
      });
      const $ = cheerio.load(data);
      $('table.list-wrap tbody tr.list').each((i, el) => {
        const rank = $(el).find('td.number').contents().first().text().trim();
        $(el).find('td.info a.title span').remove();
        const title  = $(el).find('td.info a.title').text().trim();
        const artist = $(el).find('td.info a.artist').text().trim();
        const album  = $(el).find('td.info a.albumtitle').text().trim();
        let thumbnail = $(el).find('td a.cover img').attr('src') || '';
        if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
        if (thumbnail) thumbnail = thumbnail.replace(/140x140|200x200/, '600x600');
        if (title && artist) chart.push({ rank: parseInt(rank, 10) || (page - 1) * 50 + i + 1, title, artist, album, thumbnail, source: 'genie' });
      });
    }
    if (chart.length > 0) { cache.data[key] = chart; cache.timestamp[key] = Date.now(); return chart; }
  } catch (err) {
    console.error('Genie Chart Error:', err.message);
  }

  // Fallback: Genie JSON API
  try {
    const res = await axios.get('https://www.genie.co.kr/api/RealTimeChart?ditc=D&rtm=N&pg=1&cnt=50', {
      headers: { ...HEADERS, 'X-Requested-With': 'XMLHttpRequest' }, timeout: 6000
    });
    const items = res.data?.DATA || [];
    if (items.length > 0) {
      const chart = items.map((t, i) => ({
        rank: t.RANK_NO || i + 1, title: t.SONG_NAME, artist: t.ARTIST_NAME,
        album: t.ALBUM_NAME || '', thumbnail: t.ALBUM_IMG_PATH ? `https://image.genie.co.kr${t.ALBUM_IMG_PATH}` : '',
        source: 'genie'
      }));
      cache.data[key] = chart; cache.timestamp[key] = Date.now(); return chart;
    }
  } catch {}

  return cache.data[key] || getFallbackChart('genie');
}

// ─── FLO ─────────────────────────────────────────────────────────────────────
export async function getFloChart(ageGroup = '') {
  const key = `flo_${ageGroup || 'all'}`;
  if (cache.data[key] && Date.now() - cache.timestamp[key] < CACHE_TTL) return cache.data[key];

  // FLO API endpoints (try multiple)
  const endpoints = [
    'https://api.music-flo.com/display/v1/browser/chart/1/track/list?size=100',
    'https://api.music-flo.com/display/v2/browser/chart?chartType=REALTIME&size=100',
  ];

  for (const url of endpoints) {
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': USER_AGENT, 'x-gm-channel-id': 'FLO_WEB', 'Origin': 'https://www.music-flo.com' },
        timeout: 6000
      });

      const trackList = res.data?.data?.trackList || res.data?.data?.list || [];
      if (trackList.length === 0) continue;

      let chart = trackList.map((t, i) => {
        const artist = t.artistList?.map(a => a.name).join(', ') || t.representationArtist?.name || '';
        const imgObj = t.album?.imgList?.find(img => img.size >= 350) || t.album?.imgList?.[0];
        return { rank: i + 1, title: t.name, artist, album: t.album?.title || '', thumbnail: imgObj?.url || '', source: 'flo' };
      });

      chart = applyAgeFilter(chart, ageGroup);
      if (chart.length > 0) { cache.data[key] = chart; cache.timestamp[key] = Date.now(); return chart; }
    } catch (err) {
      console.error('FLO Chart Error:', err.message);
    }
  }
  return cache.data[key] || getFallbackChart('flo');
}

function applyAgeFilter(chart, ageGroup) {
  const groups = {
    '10-20': ['aespa','뉴진스','NewJeans','IVE','아이브','LE SSERAFIM','르세라핌','ILLIT','아일릿','QWER','ROSÉ','로제','Bruno Mars','지코','ZICO','Jennie','제니','BOYNEXTDOOR','RIIZE','라이즈','TWS','투어스','NCT','SEVENTEEN','세븐틴','Stray Kids','스트레이 키즈','BABYMONSTER','KISS OF LIFE','NMIXX','엔믹스'],
    '30-40': ['임영웅','성시경','박효신','아이유','IU','이무진','볼빨간사춘기','멜로망스','MeloMance','폴킴','Paul Kim','잔나비','JANNABI','윤하','YOUNHA','10CM','태연','TAEYEON','임재현','황인욱'],
    '50-60': ['임영웅','영탁','이찬원','장민호','김호중','송가인','장윤정','진성','조용필','나훈아','주현미','심수봉','김연자','박서진','전유진','안성훈','손태진'],
    '70-80': ['나훈아','이미자','남진','패티김','배호','하춘화','현미','현철','설운도','태진아','송대관','심수봉','조용필','주현미','임영웅','김연자'],
  };
  const kws = groups[ageGroup];
  if (!kws) return chart;
  const matched = chart.filter(t => kws.some(kw => t.artist.includes(kw) || t.title.includes(kw)));
  const rest = chart.filter(t => !matched.some(m => m.title === t.title));
  return [...matched, ...rest].map((t, idx) => ({ ...t, rank: idx + 1 }));
}

// ─── Bugs ─────────────────────────────────────────────────────────────────────
export async function getBugsChart() {
  const key = 'bugs';
  if (cache.data[key] && Date.now() - cache.timestamp[key] < CACHE_TTL) return cache.data[key];

  // Try Bugs API first (more reliable than scraping)
  try {
    const res = await axios.get('https://music.bugs.co.kr/api/3/chart/track/realtime?page=1&size=100&wl_backupgcode=2', {
      headers: { ...HEADERS, 'Referer': 'https://music.bugs.co.kr/chart' }, timeout: 6000
    });
    const list = res.data?.list || [];
    if (list.length > 0) {
      const chart = list.map((t, i) => ({
        rank: t.track_ranking || i + 1, title: t.track_title, artist: t.artist_nm,
        album: t.album_title || '', thumbnail: t.thumbnail_img ? t.thumbnail_img.replace(/\d+x\d+/, '500x500') : '',
        source: 'bugs'
      }));
      cache.data[key] = chart; cache.timestamp[key] = Date.now(); return chart;
    }
  } catch {}

  // Fallback: scrape Bugs chart page
  try {
    const { data } = await axios.get('https://music.bugs.co.kr/chart', {
      headers: HEADERS, timeout: 8000
    });
    const $ = cheerio.load(data);
    const chart = [];
    $('table.list.trackList tbody tr').each((i, el) => {
      const rank   = $(el).find('.ranking strong').text().trim();
      const title  = $(el).find('p.title a').first().text().trim();
      const artist = $(el).find('p.artist a').first().text().trim();
      const album  = $(el).find('a.album').first().text().trim();
      let thumbnail = $(el).find('a.thumbnail img').attr('src') || '';
      if (thumbnail) thumbnail = thumbnail.replace(/\/album\/images\/\d+\//, '/album/images/500/');
      if (title && artist) chart.push({ rank: parseInt(rank, 10) || i + 1, title, artist, album, thumbnail, source: 'bugs' });
    });
    if (chart.length > 0) { cache.data[key] = chart; cache.timestamp[key] = Date.now(); return chart; }
  } catch (err) {
    console.error('Bugs Chart Error:', err.message);
  }

  return cache.data[key] || getFallbackChart('bugs');
}

// ─── YouTube Music Chart ───────────────────────────────────────────────────────
export async function getYoutubeMusicChart() {
  const key = 'youtube';
  if (cache.data[key] && Date.now() - cache.timestamp[key] < CACHE_TTL) return cache.data[key];

  const queries = ['K-POP 인기차트 2025', '한국 인기가요 top50', 'kpop hits playlist 2025'];
  for (const q of queries) {
    try {
      const res = await ytSearch(q);
      const videos = res?.videos?.filter(v => v.videoId) || [];
      if (videos.length < 5) continue;
      const chart = videos.slice(0, 50).map((v, idx) => ({
        rank: idx + 1,
        title: v.title.replace(/\[.*?\]|\(.*?\)|official|mv|m\/v|audio|가사|lyrics/gi, '').trim() || v.title,
        artist: v.author?.name || 'Various Artists',
        album: 'YouTube Trending', thumbnail: v.thumbnail || v.image,
        videoId: v.videoId, duration: v.duration?.seconds || 0, source: 'youtube'
      }));
      cache.data[key] = chart; cache.timestamp[key] = Date.now(); return chart;
    } catch (err) {
      console.error('YouTube Chart Error:', err.message);
    }
  }
  return cache.data[key] || getFallbackChart('youtube');
}

// ─── New Songs ─────────────────────────────────────────────────────────────────
async function fetchNewSongsFor(platform) {
  switch (platform) {
    case 'genie': {
      try {
        const { data } = await axios.get('https://www.genie.co.kr/newest/song', { headers: HEADERS, timeout: 8000 });
        const $ = cheerio.load(data);
        const list = [];
        $('table.list-wrap tbody tr.list').each((i, el) => {
          $(el).find('td.info a.title span').remove();
          const title  = $(el).find('td.info a.title').text().trim();
          const artist = $(el).find('td.info a.artist').text().trim();
          const album  = $(el).find('td.info a.albumtitle').text().trim();
          let thumbnail = $(el).find('td a.cover img').attr('src') || '';
          if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
          if (thumbnail) thumbnail = thumbnail.replace(/140x140|200x200/, '600x600');
          if (title && artist) list.push({ rank: i + 1, title, artist, album, thumbnail, source: 'genie_new' });
        });
        if (list.length > 0) return list;
      } catch {}
      return getGenieChart();
    }
    case 'bugs': {
      try {
        const { data } = await axios.get('https://music.bugs.co.kr/newest/track/total', { headers: HEADERS, timeout: 8000 });
        const $ = cheerio.load(data);
        const list = [];
        $('table.list.trackList tbody tr').each((i, el) => {
          const title  = $(el).find('p.title a').first().text().trim();
          const artist = $(el).find('p.artist a').first().text().trim();
          const album  = $(el).find('a.album').first().text().trim();
          let thumbnail = $(el).find('a.thumbnail img').attr('src') || '';
          if (thumbnail) thumbnail = thumbnail.replace(/\/album\/images\/\d+\//, '/album/images/500/');
          if (title && artist) list.push({ rank: i + 1, title, artist, album, thumbnail, source: 'bugs_new' });
        });
        if (list.length > 0) return list;
      } catch {}
      return getBugsChart();
    }
    case 'flo': {
      try {
        const res = await axios.get('https://api.music-flo.com/display/v1/browser/chart/2/track/list?size=60', {
          headers: { 'User-Agent': USER_AGENT, 'x-gm-channel-id': 'FLO_WEB' }, timeout: 6000
        });
        const list = (res.data?.data?.trackList || []).map((t, i) => ({
          rank: i + 1, title: t.name,
          artist: t.artistList?.map(a => a.name).join(', ') || t.representationArtist?.name || '',
          album: t.album?.title || '', thumbnail: t.album?.imgList?.[0]?.url || '', source: 'flo_new'
        }));
        if (list.length > 0) return list;
      } catch {}
      return getFloChart();
    }
    case 'melon': {
      try {
        const { data } = await axios.get('https://www.melon.com/new/index.htm', { headers: HEADERS, timeout: 8000 });
        const $ = cheerio.load(data);
        const list = [];
        $('form#frm table tbody tr, table tbody tr').each((i, el) => {
          const title  = $(el).find('.ellipsis.rank01 a').first().text().trim();
          const artist = $(el).find('.ellipsis.rank02 > a').map((_, a) => $(a).text().trim()).get().join(', ');
          const album  = $(el).find('.ellipsis.rank03 a').first().text().trim();
          let thumbnail = $(el).find('a.image_typeAll img').attr('src') || '';
          if (thumbnail) thumbnail = thumbnail.split('?')[0].replace(/\/resize\/\d+\/quality\/\d+\/optimize/, '/resize/500/quality/90/optimize');
          if (title && artist) list.push({ rank: i + 1, title, artist, album, thumbnail, source: 'melon_new' });
        });
        if (list.length > 0) return list;
      } catch {}
      return getMelonChart();
    }
    case 'youtube': {
      try {
        const res = await ytSearch('최신 신곡 kpop 2025');
        const list = (res?.videos || []).slice(0, 50).map((v, idx) => ({
          rank: idx + 1,
          title: v.title.replace(/\[.*?\]|\(.*?\)|official|mv|m\/v|audio|가사|lyrics/gi, '').trim() || v.title,
          artist: v.author?.name || 'Various Artists', album: 'YouTube New Releases',
          thumbnail: v.thumbnail || v.image, videoId: v.videoId, duration: v.duration?.seconds || 0, source: 'youtube_new'
        }));
        if (list.length > 0) return list;
      } catch {}
      return getYoutubeMusicChart();
    }
    default:
      return getMelonChart();
  }
}

export async function getNewSongs(platform = 'melon') {
  const key = `new_${platform}`;
  if (cache.data[key] && Date.now() - cache.timestamp[key] < CACHE_TTL) return cache.data[key];
  const result = await fetchNewSongsFor(platform.toLowerCase());
  if (result?.length > 0) { cache.data[key] = result; cache.timestamp[key] = Date.now(); }
  return result;
}

// ─── Fallback Chart ────────────────────────────────────────────────────────────
function getFallbackChart(source) {
  return [
    { rank: 1, title: 'APT.', artist: '로제 (ROSÉ) & Bruno Mars', album: 'rosie', thumbnail: 'https://cdnimg.melon.co.kr/cm2/album/images/116/16/582/11616582_20241018114002_500.jpg', source },
    { rank: 2, title: 'Whiplash', artist: 'aespa', album: 'Whiplash - The 5th Mini Album', thumbnail: 'https://cdnimg.melon.co.kr/cm2/album/images/116/17/740/11617740_20241021175114_500.jpg', source },
    { rank: 3, title: 'Supernova', artist: 'aespa', album: 'Armageddon', thumbnail: 'https://cdnimg.melon.co.kr/cm2/album/images/115/57/862/11557862_20240522181304_500.jpg', source },
    { rank: 4, title: '이 별로부터', artist: '아이유 (IU)', album: '이 별로부터', thumbnail: 'https://cdnimg.melon.co.kr/cm2/album/images/116/53/706/11653706_20241203181510_500.jpg', source },
    { rank: 5, title: 'UP', artist: 'KARINA (카리나)', album: 'SYNK : PARALLEL LINE', thumbnail: '', source },
    { rank: 6, title: 'Magnetic', artist: 'ILLIT (아일릿)', album: 'SUPER REAL ME', thumbnail: '', source },
    { rank: 7, title: 'SPOT!', artist: 'ZICO (지코) & Jennie', album: 'SPOT!', thumbnail: '', source },
    { rank: 8, title: 'Love Wins All', artist: '아이유 (IU)', album: 'Love Wins All', thumbnail: '', source },
    { rank: 9, title: 'Perfect Night', artist: 'LE SSERAFIM (르세라핌)', album: 'EASY', thumbnail: '', source },
    { rank: 10, title: 'Drama', artist: 'aespa', album: 'Drama', thumbnail: '', source },
  ];
}
