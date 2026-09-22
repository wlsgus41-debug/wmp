import express from 'express';
import {
  getMelonChart,
  getGenieChart,
  getFloChart,
  getBugsChart,
  getYoutubeMusicChart,
  getNewSongs
} from '../services/chartService.js';
import { getUnifiedLyrics } from '../services/lyricsService.js';
import { searchYouTube, matchYouTubeTrack } from '../services/youtubeService.js';
import { GENRE_CATEGORIES, getTracksByGenre } from '../services/genreService.js';
import { YEAR_CATEGORIES, getTracksByYear } from '../services/yearService.js';
import { MV_PLATFORMS, getMusicVideos } from '../services/mvService.js';
import { searchByPlatform } from '../services/searchService.js';
import { getMelonTrendingKeywords } from '../services/trendingKeywordsService.js';

const router = express.Router();

/**
 * 실시간 차트 조회 API
 * GET /api/charts/:platform (melon, genie, flo, bugs, youtube)
 */
router.get('/charts/:platform', async (req, res) => {
  const { platform } = req.params;
  const { age } = req.query;
  try {
    let data = [];
    switch (platform.toLowerCase()) {
      case 'melon':
        data = await getMelonChart();
        break;
      case 'genie':
        data = await getGenieChart();
        break;
      case 'flo':
        data = await getFloChart(age || '');
        break;
      case 'bugs':
        data = await getBugsChart();
        break;
      case 'youtube':
        data = await getYoutubeMusicChart();
        break;
      default:
        data = await getMelonChart();
    }
    res.json({ success: true, platform, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 신곡/최신 음악 조회 API
 * GET /api/new-songs/:platform (melon, genie, flo, bugs, youtube)
 */
router.get('/new-songs/:platform', async (req, res) => {
  const { platform } = req.params;
  try {
    const data = await getNewSongs(platform || 'melon');
    res.json({ success: true, platform, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 멜론 실시간 급상승 / 검색어 TOP 10 API
 * GET /api/trending-keywords
 */
router.get('/trending-keywords', async (req, res) => {
  try {
    const keywords = await getMelonTrendingKeywords();
    res.json({ success: true, keywords });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 뮤직비디오 플랫폼 카테고리 목록 API
 * GET /api/mv/platforms
 */
router.get('/mv/platforms', (req, res) => {
  res.json({ success: true, platforms: MV_PLATFORMS });
});

/**
 * 뮤직비디오 차트 목록 조회 API
 * GET /api/mv/:platform
 */
router.get('/mv/:platform', async (req, res) => {
  const { platform } = req.params;
  try {
    const data = await getMusicVideos(platform || 'all');
    res.json({ success: true, platform, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 장르 목록 조회 API
 * GET /api/genres
 */
router.get('/genres', (req, res) => {
  res.json({ success: true, categories: GENRE_CATEGORIES });
});

/**
 * 특정 장르 노래 목록 조회 API
 * GET /api/genres/:genreId
 */
router.get('/genres/:genreId', async (req, res) => {
  const { genreId } = req.params;
  try {
    const data = await getTracksByGenre(genreId);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 연도별 카테고리 목록 API
 * GET /api/years
 */
router.get('/years', (req, res) => {
  res.json({ success: true, categories: YEAR_CATEGORIES });
});

/**
 * 특정 연도 노래 목록 API
 * GET /api/years/:yearId
 */
router.get('/years/:yearId', async (req, res) => {
  const { yearId } = req.params;
  try {
    const data = await getTracksByYear(yearId);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 통합 가사 조회 API
 * GET /api/lyrics?title=...&artist=...&source=...
 */
router.get('/lyrics', async (req, res) => {
  const { title, artist, source } = req.query;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  try {
    const lyricsData = await getUnifiedLyrics(title, artist || '', source || 'all');
    res.json({ success: true, ...lyricsData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 각종 음원 사이트 및 통합 실제 검색 API (멜론 melon.com, 벅스 music.bugs.co.kr, 지니 genie.co.kr, 플로 music-flo.com, 스포티파이 open.spotify.com, 유튜브)
 * GET /api/search?q=...&source=...
 */
router.get('/search', async (req, res) => {
  const { q, source } = req.query;
  if (!q) {
    return res.status(400).json({ success: false, message: 'Query string q is required' });
  }

  try {
    const results = await searchByPlatform(q, source || 'all');
    res.json({ success: true, results, source: source || 'all' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 곡 매칭 API (차트 항목 클릭 시 유튜브 오디오 트랙 자동 매핑)
 * GET /api/match?title=...&artist=...
 */
router.get('/match', async (req, res) => {
  const { title, artist } = req.query;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  try {
    const track = await matchYouTubeTrack(title, artist || '');
    if (!track) {
      return res.status(404).json({ success: false, message: 'Track not found on YouTube' });
    }
    res.json({ success: true, track });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
