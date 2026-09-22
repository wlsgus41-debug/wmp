import ytSearch from 'yt-search';

// ─────────────────────────────────────────────
// 문자열 정규화 헬퍼
// ─────────────────────────────────────────────

/** 비교용 정규화: 소문자 + 특수문자 제거 + 공백 통일 */
function normalize(str = '') {
  return str
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')   // 괄호 안 내용 제거
    .replace(/[^\w\s가-힣ぁ-んァ-ン一-龥]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 두 문자열의 단어 겹침 유사도 (0 ~ 1) */
function wordOverlap(a, b) {
  const setA = new Set(normalize(a).split(' ').filter(Boolean));
  const setB = new Set(normalize(b).split(' ').filter(Boolean));
  if (!setA.size || !setB.size) return 0;
  let common = 0;
  for (const w of setA) if (setB.has(w)) common++;
  return common / Math.max(setA.size, setB.size);
}

/** 한 문자열이 다른 문자열을 포함하는지 (정규화 후) */
function normalizedIncludes(haystack, needle) {
  const n = normalize(needle);
  const h = normalize(haystack);
  if (!n || !h) return false;
  return h.includes(n) || n.includes(h);
}

// ─────────────────────────────────────────────
// 영상 후보 점수 계산 (Official MV 최우선 모드)
// ─────────────────────────────────────────────

/**
 * 각 YouTube 영상 후보에 점수를 매겨 가장 정확한 Official MV를 선택합니다.
 * @param {object} video  yt-search 결과 영상 객체
 * @param {string} title  원본 곡 제목
 * @param {string} artist 원본 아티스트명
 * @returns {number} 점수 (높을수록 정확)
 */
function scoreVideo(video, title, artist) {
  const vtitle  = video.title  || '';
  const vauthor = video.author?.name || '';
  const vtitleLower = vtitle.toLowerCase();
  const authorLower = vauthor.toLowerCase();
  let score = 0;

  // ── 제목 유사도 (최대 40점) ──────────────────
  const titleOverlap = wordOverlap(vtitle, title);
  score += titleOverlap * 40;

  // 제목 완전 포함 보너스
  if (normalizedIncludes(vtitle, title)) score += 15;

  // ── 아티스트 유사도 (최대 30점) ───────────────
  if (artist) {
    const artistInTitle  = wordOverlap(vtitle, artist);
    const artistInAuthor = wordOverlap(vauthor, artist);
    score += Math.max(artistInTitle, artistInAuthor) * 30;

    if (normalizedIncludes(vtitle, artist) || normalizedIncludes(vauthor, artist)) {
      score += 10;
    }
  }

  // ── 🎬 OFFICIAL MV / 뮤직비디오 최우선 가산점 (최대 50점) ──────
  const isOfficialMV =
    vtitleLower.includes('official mv') ||
    vtitleLower.includes('official m/v') ||
    vtitleLower.includes('official music video') ||
    (vtitleLower.includes('official') && (vtitleLower.includes('m/v') || vtitleLower.includes('mv')));

  const isGeneralMV =
    vtitleLower.includes('m/v') ||
    vtitleLower.includes('mv') ||
    vtitleLower.includes('music video') ||
    vtitleLower.includes('뮤직비디오');

  if (isOfficialMV) {
    score += 50; // ⭐ OFFICIAL MV에 최고 점수 부여!
  } else if (isGeneralMV) {
    score += 35; // 일반 MV에도 높은 점수
  } else if (vtitleLower.includes('official video')) {
    score += 30;
  } else if (vtitleLower.includes('performance video') || vtitleLower.includes('choreography')) {
    score += 15;
  } else if (vtitleLower.includes('official audio')) {
    score += 8; // MV가 없을 때 오디오로 fallback
  }

  // ── 공식 채널 / 음반사 채널 우선순위 보너스 ──────
  const officialDistributors = [
    'smtown', 'hybe labels', 'jyp entertainment', 'yg entertainment',
    '1thek', 'stone music', 'starship', 'cube', 'edam', 'wm entertainment',
    'rbw', 'fnc', 'woollim', 'kakao entertainment', 'genie music', 'warner music'
  ];

  if (authorLower.includes('vevo')) score += 20;
  if (authorLower.includes('official')) score += 15;
  if (officialDistributors.some(dist => authorLower.includes(dist))) score += 25;
  if (authorLower.includes('- topic')) score += 5; // 토픽은 MV가 없을 때의 대비용

  // ── 감점 항목 (MV 본편이 아닌 것들 철저히 배제) ─────
  if (vtitleLower.includes('teaser') || vtitleLower.includes('티저')) score -= 45; // 티저 강력 감점!
  if (vtitleLower.includes('trailer') || vtitleLower.includes('예고')) score -= 40;
  if (vtitleLower.includes('making') || vtitleLower.includes('behind')) score -= 35; // 메이킹/비하인드 감점
  if (vtitleLower.includes('cover') || vtitleLower.includes('커버')) score -= 35; // 커버곡 강력 감점
  if (vtitleLower.includes('1시간') || vtitleLower.includes('1 hour') || vtitleLower.includes('loop')) score -= 40; // 루프 감점
  if (vtitleLower.includes('reaction') || vtitleLower.includes('리액션')) score -= 35;
  if (vtitleLower.includes('remix') && !title.toLowerCase().includes('remix')) score -= 20;
  if (vtitleLower.includes('live') || vtitleLower.includes('concert')) score -= 15; // 라이브 감점

  // ── 재생 시간 보정 (MV 일반 길이: 1분 30초 ~ 7분) ─────
  const dur = video.duration?.seconds || video.seconds || 0;
  if (dur > 0) {
    if (dur >= 90 && dur <= 420) score += 10;
    else if (dur < 60) score -= 30; // 1분 미만은 쇼츠/티저일 확률 높음
    else if (dur > 600) score -= 20; // 10분 이상은 모음집일 확률 높음
  }

  return score;
}

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

/**
 * 차트 트랙 및 음원에 최적화된 유튜브 OFFICIAL MV 매칭
 * 여러 쿼리로 검색 후 점수 기반으로 공식 뮤직비디오 최우선 선택
 */
export async function matchYouTubeTrack(title, artist) {
  const cleanT = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
  const cleanA = artist ? artist.split(',')[0].split('&')[0].replace(/\(.*?\)/, '').trim() : '';

  // OFFICIAL MV 우선 쿼리 세트
  const queries = [
    `${cleanA} ${cleanT} Official MV`,
    `${cleanA} ${cleanT} M/V`,
    `${cleanT} ${cleanA} Official Music Video`,
    `${cleanA} ${cleanT} Official Video`,
    `${cleanT} ${cleanA}`,
  ].filter(Boolean);

  const candidateMap = new Map(); // videoId → {video, score}

  for (const q of queries) {
    try {
      const res = await ytSearch(q);
      const videos = res?.videos?.slice(0, 8) || [];
      for (const video of videos) {
        if (!video.videoId) continue;
        const s = scoreVideo(video, title, artist);
        if (!candidateMap.has(video.videoId) || candidateMap.get(video.videoId).score < s) {
          candidateMap.set(video.videoId, { video, score: s });
        }
      }
    } catch (err) {
      console.error(`[matchYouTubeTrack] query failed: "${q}"`, err.message);
    }
  }

  if (candidateMap.size === 0) return null;

  // 점수 내림차순 정렬 → 최고 점수 선택
  const sorted = [...candidateMap.values()].sort((a, b) => b.score - a.score);

  // 디버그용 로그 (상위 3개)
  console.log(`[matchYouTubeTrack (Official MV)] "${title} - ${artist}" top candidates:`);
  sorted.slice(0, 3).forEach(({ video, score }, i) => {
    console.log(`  #${i + 1} [${score.toFixed(1)}] "${video.title}" by ${video.author?.name} (${video.duration?.timestamp || ''})`);
  });

  const best = sorted[0].video;
  const isMvDetected =
    best.title.toLowerCase().includes('mv') ||
    best.title.toLowerCase().includes('m/v') ||
    best.title.toLowerCase().includes('music video');

  return {
    videoId:   best.videoId,
    title:     best.title,
    artist:    artist || best.author?.name,
    thumbnail: best.thumbnail || best.image,
    duration:  best.duration?.seconds || best.seconds || 0,
    url:       best.url,
    isMV:      isMvDetected,
  };
}

/**
 * 모든 장르 및 키워드 유튜브 검색 (검색바 직접 검색용)
 */
export async function searchYouTube(query) {
  try {
    const searchRes = await ytSearch(`${query} Official MV`);
    if (searchRes?.videos && searchRes.videos.length > 0) {
      return searchRes.videos.slice(0, 30).map(v => ({
        videoId:      v.videoId,
        title:        v.title,
        artist:       v.author?.name || 'Unknown',
        thumbnail:    v.thumbnail || v.image,
        duration:     v.duration?.seconds || v.seconds || 0,
        durationText: v.duration?.timestamp || '',
        views:        v.views || 0,
        ago:          v.ago || '',
      }));
    }
  } catch (error) {
    console.error('YouTube Search Error:', error.message);
  }
  return [];
}
