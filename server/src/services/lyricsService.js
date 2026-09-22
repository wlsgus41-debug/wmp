import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': USER_AGENT, 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' };

// ─── LRC Parser ──────────────────────────────────────────────────────────────
export function parseLrc(lrcText) {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    let match;
    const timestamps = [];
    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(line)) !== null) {
      const min    = parseInt(match[1], 10);
      const sec    = parseInt(match[2], 10);
      const millis = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      timestamps.push(min * 60 + sec + millis / 1000);
    }
    const text = line.replace(/\[[\d:\.]+\]/g, '').trim();
    if (timestamps.length > 0 && text) {
      for (const t of timestamps) result.push({ time: t, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

// ─── 텍스트 정규화 헬퍼 ──────────────────────────────────────────────────────
function cleanName(str = '') {
  return str
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/[^\w\s가-힣]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── LRCLIB (Spotify/YT Music 싱크가사) ──────────────────────────────────────
export async function getLrcLibLyrics(title, artist) {
  const cleanTitle  = cleanName(title);
  const cleanArtist = cleanName(artist);

  // 1) 정확한 get 요청
  try {
    const res = await axios.get('https://lrclib.net/api/get', {
      params: { track_name: title, artist_name: artist },
      headers: { 'User-Agent': 'WorldMusicPlayer/1.0 (https://github.com/wmp)' },
      timeout: 7000
    });
    if (res.data) {
      const synced = res.data.syncedLyrics ? parseLrc(res.data.syncedLyrics) : [];
      return {
        plainLyrics: res.data.plainLyrics || synced.map(s => s.text).join('\n'),
        syncedLyrics: synced,
        source: 'Spotify / LRCLIB'
      };
    }
  } catch {}

  // 2) 검색 쿼리 (정확 → 제목만 → 영문 변환 등 순서로 시도)
  const queries = [
    `${title} ${artist}`,
    title,
    `${cleanTitle} ${cleanArtist}`,
    cleanTitle,
  ];

  for (const q of queries) {
    try {
      const res = await axios.get('https://lrclib.net/api/search', {
        params: { q },
        headers: { 'User-Agent': 'WorldMusicPlayer/1.0' },
        timeout: 7000
      });
      const items = res.data || [];
      if (items.length === 0) continue;

      // 아티스트 + 제목 유사도로 최적 항목 선택
      const scored = items.map(item => {
        let score = 0;
        if (cleanName(item.trackName).includes(cleanTitle) || cleanTitle.includes(cleanName(item.trackName))) score += 50;
        if (cleanName(item.artistName).includes(cleanArtist) || cleanArtist.includes(cleanName(item.artistName))) score += 40;
        if (item.syncedLyrics) score += 20; // synced 보너스
        return { item, score };
      }).sort((a, b) => b.score - a.score);

      const best = scored[0];
      if (best.score >= 40) {
        const synced = best.item.syncedLyrics ? parseLrc(best.item.syncedLyrics) : [];
        return {
          plainLyrics: best.item.plainLyrics || synced.map(s => s.text).join('\n'),
          syncedLyrics: synced,
          source: 'Spotify / LRCLIB'
        };
      }
    } catch {}
  }

  return null;
}

// ─── Bugs 가사 ───────────────────────────────────────────────────────────────
export async function getBugsLyrics(title, artist) {
  try {
    const q = `${title} ${artist}`.trim();
    const { data: searchHtml } = await axios.get(
      `https://music.bugs.co.kr/search/track?q=${encodeURIComponent(q)}`,
      { headers: HEADERS, timeout: 7000 }
    );
    const $s = cheerio.load(searchHtml);
    const trackId = $s('table.trackList tbody tr').first().attr('trackid');

    if (trackId) {
      const { data: trackHtml } = await axios.get(
        `https://music.bugs.co.kr/track/${trackId}`,
        { headers: HEADERS, timeout: 7000 }
      );
      const $t = cheerio.load(trackHtml);
      $t('.lyricsContainer xmp').find('br').replaceWith('\n');
      const lyrics =
        $t('.lyricsContainer xmp').text().trim() ||
        $t('.lyricsContainer p').text().trim() ||
        $t('#lyricArea').text().trim();

      if (lyrics) return { plainLyrics: lyrics, syncedLyrics: [], source: 'Bugs' };
    }
  } catch {}
  return null;
}

// ─── Genie 가사 ──────────────────────────────────────────────────────────────
export async function getGenieLyrics(title, artist) {
  try {
    const q = `${title} ${artist}`.trim();
    const { data: searchHtml } = await axios.get(
      `https://www.genie.co.kr/search/searchMain?query=${encodeURIComponent(q)}`,
      { headers: HEADERS, timeout: 7000 }
    );
    const $s = cheerio.load(searchHtml);
    const songId = $s('table.list-wrap tbody tr.list').first().attr('songid')
                || $s('.info-zone li').first().find('a[onclick*="fnPlaySong"]').attr('onclick')?.match(/\d{5,}/)?.[0];

    if (songId) {
      const { data: lyricHtml } = await axios.get(
        `https://www.genie.co.kr/detail/songInfo?xgnm=${songId}`,
        { headers: HEADERS, timeout: 7000 }
      );
      const $l = cheerio.load(lyricHtml);
      const rawLyrics = $l('#p-lyrics p').html() || $l('.lyric-wrap').html();
      if (rawLyrics) {
        const plain = rawLyrics.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
        if (plain) return { plainLyrics: plain, syncedLyrics: [], source: 'Genie' };
      }
    }
  } catch {}
  return null;
}

// ─── Melon 가사 ──────────────────────────────────────────────────────────────
export async function getMelonLyrics(title, artist) {
  try {
    const q = `${title} ${artist}`.trim();
    const { data: searchHtml } = await axios.get(
      `https://www.melon.com/search/song/index.htm?q=${encodeURIComponent(q)}&section=song`,
      { headers: HEADERS, timeout: 7000 }
    );
    const $s = cheerio.load(searchHtml);
    let songId = null;

    $s('table tbody tr').first().find('[onclick]').each((_, el) => {
      const onclick = $s(el).attr('onclick') || '';
      const m = onclick.match(/goSongDetail\('(\d+)'\)/) || onclick.match(/(\d{6,})/);
      if (m && !songId) songId = m[1];
    });

    if (songId) {
      const { data: songHtml } = await axios.get(
        `https://www.melon.com/song/detail.htm?songId=${songId}`,
        { headers: HEADERS, timeout: 7000 }
      );
      const $song = cheerio.load(songHtml);
      const rawLyrics = $song('#d_video_summary').html()
                     || $song('.lyric_area').html();
      if (rawLyrics) {
        const plain = rawLyrics
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .trim();
        if (plain) return { plainLyrics: plain, syncedLyrics: [], source: 'Melon' };
      }
    }
  } catch {}
  return null;
}

// ─── 통합 가사 조회 ───────────────────────────────────────────────────────────
export async function getUnifiedLyrics(title, artist, requestedSource = 'all') {
  // 제목/아티스트 정제
  const cleanTitle  = title  ? title.replace(/\(.*?\)|\[.*?\]/g, '').trim()       : '';
  const cleanArtist = artist ? artist.split(',')[0].split('&')[0].replace(/\(.*?\)/, '').trim() : '';

  // 병렬 조회 (timeout 개별 적용)
  const withTimeout = (promise, ms = 8000) =>
    Promise.race([promise, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

  const [lrcRes, melonRes, genieRes, bugsRes] = await Promise.allSettled([
    withTimeout(getLrcLibLyrics(cleanTitle, cleanArtist)),
    withTimeout(getMelonLyrics(cleanTitle, cleanArtist)),
    withTimeout(getGenieLyrics(cleanTitle, cleanArtist)),
    withTimeout(getBugsLyrics(cleanTitle, cleanArtist)),
  ]);

  const val = (r) => (r.status === 'fulfilled' ? r.value : null);

  const sources = {
    spotify:  val(lrcRes),
    melon:    val(melonRes),
    genie:    val(genieRes),
    bugs:     val(bugsRes),
    // flo / youtube 는 melon / lrc 에서 재사용
    flo:      val(melonRes) ? { ...val(melonRes), source: 'FLO' } : null,
    youtube:  val(lrcRes)   ? { ...val(lrcRes),   source: 'YouTube Music' } : null,
  };

  // 요청한 소스가 있으면 해당 소스 우선
  let primary = (requestedSource && requestedSource !== 'all' && sources[requestedSource]) || null;

  // 자동 우선순위: 싱크가사 > 멜론 > 지니 > 벅스 > 가사만
  if (!primary) {
    if (sources.spotify?.syncedLyrics?.length > 0)  primary = sources.spotify;
    else if (sources.melon?.plainLyrics)             primary = sources.melon;
    else if (sources.genie?.plainLyrics)             primary = sources.genie;
    else if (sources.bugs?.plainLyrics)              primary = sources.bugs;
    else if (sources.spotify?.plainLyrics)           primary = sources.spotify;
  }

  return {
    primary: primary || { plainLyrics: '가사 정보를 찾을 수 없습니다.', syncedLyrics: [], source: 'None' },
    availableSources: Object.keys(sources).filter(k => sources[k] !== null),
  };
}
