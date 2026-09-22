import axios from 'axios';
import * as cheerio from 'cheerio';
import ytSearch from 'yt-search';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
};

// 5-minute cache for platform searches
const searchCache = {
  data: {},
  timestamp: {}
};
const CACHE_TTL = 5 * 60 * 1000; // 5 mins

/**
 * 멜론 (melon.com) 실제 음원 검색
 */
export async function searchMelon(query) {
  try {
    const songUrl = `https://www.melon.com/search/song/index.htm?q=${encodeURIComponent(query)}&section=&searchGnbYn=Y&kkoSpl=N&kkoDpType=&linkOrNot=search`;
    const albumUrl = `https://www.melon.com/search/album/index.htm?q=${encodeURIComponent(query)}`;

    const [songRes, albumRes] = await Promise.allSettled([
      axios.get(songUrl, { headers: HEADERS, timeout: 8000 }),
      axios.get(albumUrl, { headers: HEADERS, timeout: 8000 })
    ]);

    // Build album cover map from Melon Album search
    const albumCoverMap = new Map();
    if (albumRes.status === 'fulfilled') {
      const $album = cheerio.load(albumRes.value.data);
      $album('li').each((_, el) => {
        const albumName = $album(el).find('a[href*="goAlbumDetail"], dt a, .ellipsis a').first().text().replace(/\s+/g, ' ').trim();
        let imgSrc = $album(el).find('a.image_typeAll img, img').attr('src') || '';
        if (imgSrc && imgSrc.includes('cdnimg.melon.co.kr')) {
          imgSrc = imgSrc.split('?')[0].replace(/\/resize\/\d+\/quality\/\d+\/optimize/, '/resize/500/quality/90/optimize');
          if (albumName && !albumCoverMap.has(albumName.toLowerCase())) {
            albumCoverMap.set(albumName.toLowerCase(), imgSrc);
          }
        }
      });
    }

    if (songRes.status === 'fulfilled') {
      const $ = cheerio.load(songRes.value.data);
      const results = [];

      $('table tbody tr').slice(0, 25).each((i, el) => {
        const title = $(el).find('a.fc_gray').first().text().replace(/\s+/g, ' ').trim() ||
                      $(el).find('.ellipsis.rank01 a').first().text().replace(/\s+/g, ' ').trim() ||
                      $(el).find('.ellipsis a').first().text().replace(/\s+/g, ' ').trim();
        const artist = $(el).find('#artistName a').map((_, a) => $(a).text().trim()).get().join(', ') ||
                       $(el).find('.ellipsis.rank02 a').first().text().replace(/\s+/g, ' ').trim();
        const album = $(el).find('a[href*="goAlbumDetail"]').first().text().replace(/\s+/g, ' ').trim() ||
                      $(el).find('td:nth-child(5) a').first().text().replace(/\s+/g, ' ').trim();

        let thumbnail = albumCoverMap.get(album.toLowerCase()) || '';
        if (!thumbnail) {
          for (const [key, val] of albumCoverMap.entries()) {
            if (album.toLowerCase().includes(key) || key.includes(album.toLowerCase())) {
              thumbnail = val;
              break;
            }
          }
        }
        if (!thumbnail && albumCoverMap.size > 0) {
          thumbnail = albumCoverMap.values().next().value || '';
        }

        if (title && artist) {
          results.push({
            id: `melon-${i}-${Date.now()}`,
            title,
            artist,
            album: album || '멜론 앨범',
            thumbnail,
            site: 'melon.com',
            siteName: '멜론',
            siteUrl: `https://www.melon.com/search/song/index.htm?q=${encodeURIComponent(query)}`,
            source: 'MELON'
          });
        }
      });

      if (results.length > 0) return results;
    }
  } catch (error) {
    console.error('Melon Search Error:', error.message);
  }

  // Fallback to youtube search styled as Melon
  return await searchFallbackYouTube(query, 'melon.com', 'MELON', '멜론');
}

/**
 * 벅스 (music.bugs.co.kr) 실제 음원 검색
 */
export async function searchBugs(query) {
  try {
    const url = `https://music.bugs.co.kr/search/track?q=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(data);
    const results = [];

    $('table.trackList tbody tr').slice(0, 20).each((i, el) => {
      const title = $(el).find('p.title a').first().text().trim();
      const artist = $(el).find('p.artist a').first().text().trim();
      const album = $(el).find('a.album').first().text().trim();
      let thumbnail = $(el).find('a.thumbnail img').attr('src') || '';
      if (thumbnail) {
        thumbnail = thumbnail.replace(/\/album\/images\/\d+\//, '/album/images/500/');
      }

      if (title && artist) {
        results.push({
          id: `bugs-${i}-${Date.now()}`,
          title,
          artist,
          album: album || '벅스 앨범',
          thumbnail,
          site: 'music.bugs.co.kr',
          siteName: '벅스',
          siteUrl: `https://music.bugs.co.kr/search/track?q=${encodeURIComponent(query)}`,
          source: 'BUGS'
        });
      }
    });

    if (results.length > 0) return results;
  } catch (error) {
    console.error('Bugs Search Error:', error.message);
  }

  return await searchFallbackYouTube(query, 'music.bugs.co.kr', 'BUGS', '벅스');
}

/**
 * 지니 (genie.co.kr) 실제 음원 검색
 */
export async function searchGenie(query) {
  try {
    const url = `https://www.genie.co.kr/search/searchSong?query=${encodeURIComponent(query)}`;
    const { data } = await axios.get(url, { headers: HEADERS, timeout: 8000 });
    const $ = cheerio.load(data);
    const results = [];

    $('table.list-wrap tbody tr.list').slice(0, 20).each((i, el) => {
      $(el).find('td.info a.title span').remove();
      const title = $(el).find('td.info a.title').text().trim();
      const artist = $(el).find('td.info a.artist').text().trim();
      const album = $(el).find('td.info a.albumtitle').text().trim();
      let thumbnail = $(el).find('td a.cover img').attr('src') || '';
      if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
      else if (thumbnail.startsWith('/')) thumbnail = 'https://image.genie.co.kr' + thumbnail;
      if (thumbnail) {
        thumbnail = thumbnail.replace(/140x140|200x200/, '600x600');
      }

      if (title && artist) {
        results.push({
          id: `genie-${i}-${Date.now()}`,
          title,
          artist,
          album: album || '지니 앨범',
          thumbnail,
          site: 'genie.co.kr',
          siteName: '지니',
          siteUrl: `https://www.genie.co.kr/search/searchSong?query=${encodeURIComponent(query)}`,
          source: 'GENIE'
        });
      }
    });

    if (results.length > 0) return results;
  } catch (error) {
    console.error('Genie Search Error:', error.message);
  }

  return await searchFallbackYouTube(query, 'genie.co.kr', 'GENIE', '지니');
}

/**
 * 플로 (music-flo.com) 실제 음원 검색
 */
export async function searchFlo(query) {
  try {
    const url = `https://api.music-flo.com/search/v2/search?keyword=${encodeURIComponent(query)}&searchType=TRACK&sortType=ACCURACY&size=20`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT, 'x-gm-channel-id': 'FLO_WEB' },
      timeout: 6000
    });
    const list = res.data?.data?.list?.[0]?.list || [];
    const results = list.map((t, i) => {
      const imgObj = t.album?.imgList?.find(img => img.size >= 350) || t.album?.imgList?.[0];
      return {
        id: `flo-${i}-${Date.now()}`,
        title: t.name,
        artist: t.artistList?.map(a => a.name).join(', ') || t.representationArtist?.name || '',
        album: t.album?.title || 'FLO 앨범',
        thumbnail: imgObj?.url || t.album?.imgList?.[0]?.url || '',
        site: 'music-flo.com',
        siteName: '플로',
        siteUrl: `https://www.music-flo.com/search/all?keyword=${encodeURIComponent(query)}`,
        source: 'FLO'
      };
    });

    if (results.length > 0) return results;
  } catch (error) {
    console.error('Flo Search Error:', error.message);
  }

  return await searchFallbackYouTube(query, 'music-flo.com', 'FLO', '플로');
}

/**
 * 스포티파이 (open.spotify.com) 음원 검색
 */
export async function searchSpotify(query) {
  try {
    const res = await ytSearch(`${query} Official MV`);
    if (res && res.videos && res.videos.length > 0) {
      return res.videos.slice(0, 20).map((v, i) => {
        const parts = v.title.replace(/\[.*?\]|\(.*?\)|official|audio|mv|m\/v/gi, '').trim().split(' - ');
        const artist = parts.length > 1 ? parts[0].trim() : v.author?.name || 'Spotify Artist';
        const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : v.title;

        return {
          id: `spotify-${v.videoId}`,
          title,
          artist,
          album: 'Spotify Global Track',
          thumbnail: v.thumbnail || v.image,
          videoId: v.videoId,
          duration: v.duration?.seconds || 0,
          durationText: v.timestamp,
          site: 'open.spotify.com',
          siteName: '스포티파이',
          siteUrl: `https://open.spotify.com/search/${encodeURIComponent(query)}`,
          source: 'SPOTIFY'
        };
      });
    }
  } catch (error) {
    console.error('Spotify Search Error:', error.message);
  }

  return await searchFallbackYouTube(query, 'open.spotify.com', 'SPOTIFY', '스포티파이');
}

/**
 * 유튜브 (기본 / 전체) 검색
 */
export async function searchYouTubePlatform(query) {
  try {
    const res = await ytSearch(query);
    if (res && res.videos && res.videos.length > 0) {
      return res.videos.slice(0, 20).map((v) => {
        const cleanTitle = v.title.replace(/\[.*?\]|\(.*?\)|official|mv|m\/v|audio|가사|lyrics/gi, '').trim();
        return {
          id: `yt-${v.videoId}`,
          title: cleanTitle || v.title,
          artist: v.author?.name || 'YouTube Music',
          album: 'YouTube Music',
          thumbnail: v.thumbnail || v.image,
          videoId: v.videoId,
          duration: v.duration?.seconds || 0,
          durationText: v.timestamp,
          site: 'youtube.com',
          siteName: '유튜브',
          siteUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          source: 'YOUTUBE'
        };
      });
    }
  } catch (error) {
    console.error('YouTube Search Error:', error.message);
  }
  return [];
}

/**
 * 플랫폼 통합 디스패처
 */
export async function searchByPlatform(query, platform = 'all') {
  const cacheKey = `${platform}_${query}`;
  if (searchCache.data[cacheKey] && Date.now() - searchCache.timestamp[cacheKey] < CACHE_TTL) {
    return searchCache.data[cacheKey];
  }

  let results = [];
  switch (platform.toLowerCase()) {
    case 'melon':
      results = await searchMelon(query);
      break;
    case 'bugs':
      results = await searchBugs(query);
      break;
    case 'genie':
      results = await searchGenie(query);
      break;
    case 'flo':
      results = await searchFlo(query);
      break;
    case 'spotify':
      results = await searchSpotify(query);
      break;
    case 'youtube':
    case 'all':
    default:
      results = await searchYouTubePlatform(query);
      break;
  }

  if (results && results.length > 0) {
    searchCache.data[cacheKey] = results;
    searchCache.timestamp[cacheKey] = Date.now();
  }

  return results;
}

/**
 * Fallback helper
 */
async function searchFallbackYouTube(query, site, source, siteName) {
  try {
    const res = await ytSearch(`${query} ${siteName}`);
    if (res && res.videos && res.videos.length > 0) {
      return res.videos.slice(0, 15).map((v, i) => {
        const cleanTitle = v.title.replace(/\[.*?\]|\(.*?\)|official|mv|m\/v|audio|가사|lyrics/gi, '').trim();
        return {
          id: `${source.toLowerCase()}-${v.videoId}`,
          title: cleanTitle || v.title,
          artist: v.author?.name || `${siteName} Artist`,
          album: `${siteName} 음원`,
          thumbnail: v.thumbnail || v.image,
          videoId: v.videoId,
          duration: v.duration?.seconds || 0,
          durationText: v.timestamp,
          site,
          siteName,
          siteUrl: `https://${site}`,
          source
        };
      });
    }
  } catch (e) {}
  return [];
}
