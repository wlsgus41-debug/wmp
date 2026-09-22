import type { LyricLine, SubtitleItem } from '../types';

/**
 * .lrc 및 .slf 싱크 가사 파일 파서
 * 지원 규격:
 * [00:12.34]가사
 * [00:12:34]가사
 * [00:12.345]가사
 * [01:23]가사
 * [00:10.00][00:20.00]다중 타임태그 가사
 */
export function parseLrcOrSlf(content: string): LyricLine[] {
  if (!content || !content.trim()) return [];

  const lines = content.split(/\r?\n/);
  const result: LyricLine[] = [];

  const timeRegex = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip metadata header tags like [ti:], [ar:], [al:], [by:], [offset:]
    if (/^\[(ti|ar|al|by|offset|length|re|ve):/i.test(line)) {
      continue;
    }

    const matches = Array.from(line.matchAll(timeRegex));
    if (matches.length > 0) {
      // Remove all time tags to get text
      const text = line.replace(timeRegex, '').trim();

      for (const match of matches) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        let ms = 0;
        if (match[3]) {
          if (match[3].length === 2) {
            ms = parseInt(match[3], 10) * 10;
          } else if (match[3].length === 3) {
            ms = parseInt(match[3], 10);
          } else if (match[3].length === 1) {
            ms = parseInt(match[3], 10) * 100;
          }
        }

        const timeInSeconds = min * 60 + sec + ms / 1000;
        result.push({
          time: parseFloat(timeInSeconds.toFixed(3)),
          text: text || '♪'
        });
      }
    }
  }

  // Sort by timestamp ascending
  result.sort((a, b) => a.time - b.time);
  return result;
}

/**
 * .srt 자막 파일 파서
 * 규격:
 * 1
 * 00:01:20,000 --> 00:01:24,400
 * 자막 텍스트
 */
export function parseSrt(content: string): SubtitleItem[] {
  if (!content || !content.trim()) return [];

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const blocks = normalized.split(/\n\s*\n/);
  const items: SubtitleItem[] = [];

  const timeRegex = /(\d{1,2}):(\d{2}):(\d{2})[,\.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,\.](\d{1,3})/;

  let autoId = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (timeRegex.test(lines[i])) {
        timeLineIndex = i;
        break;
      }
    }

    if (timeLineIndex === -1) continue;

    const timeMatch = lines[timeLineIndex].match(timeRegex);
    if (!timeMatch) continue;

    const startH = parseInt(timeMatch[1], 10);
    const startM = parseInt(timeMatch[2], 10);
    const startS = parseInt(timeMatch[3], 10);
    const startMs = parseInt(timeMatch[4].padEnd(3, '0').slice(0, 3), 10);

    const endH = parseInt(timeMatch[5], 10);
    const endM = parseInt(timeMatch[6], 10);
    const endS = parseInt(timeMatch[7], 10);
    const endMs = parseInt(timeMatch[8].padEnd(3, '0').slice(0, 3), 10);

    const start = startH * 3600 + startM * 60 + startS + startMs / 1000;
    const end = endH * 3600 + endM * 60 + endS + endMs / 1000;

    const textLines = lines.slice(timeLineIndex + 1);
    const text = textLines.join('\n');

    items.push({
      id: autoId++,
      start: parseFloat(start.toFixed(3)),
      end: parseFloat(end.toFixed(3)),
      text
    });
  }

  items.sort((a, b) => a.start - b.start);
  return items;
}

/**
 * SRT 내용을 HTML5 Video용 WebVTT Blob URL로 변환
 */
export function srtToVttBlobUrl(srtContent: string): string {
  const items = parseSrt(srtContent);
  if (items.length === 0) return '';

  let vtt = 'WEBVTT\n\n';

  const formatVttTime = (secTotal: number) => {
    const h = Math.floor(secTotal / 3600);
    const m = Math.floor((secTotal % 3600) / 60);
    const s = Math.floor(secTotal % 60);
    const ms = Math.floor((secTotal % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  };

  items.forEach(item => {
    vtt += `${item.id}\n`;
    vtt += `${formatVttTime(item.start)} --> ${formatVttTime(item.end)}\n`;
    vtt += `${item.text}\n\n`;
  });

  const blob = new Blob([vtt], { type: 'text/vtt;charset=utf-8' });
  return URL.createObjectURL(blob);
}
