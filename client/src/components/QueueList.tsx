import React from 'react';
import { X, Trash2, Play, Music, ListMusic } from 'lucide-react';
import type { Track } from '../types';

interface QueueListProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  currentTrack: Track | null;
  onSelectTrack: (track: Track, index: number) => void;
  onRemoveTrack: (index: number) => void;
  onClearQueue: () => void;
}

export const QueueList: React.FC<QueueListProps> = ({
  isOpen,
  onClose,
  queue,
  currentTrack,
  onSelectTrack,
  onRemoveTrack,
  onClearQueue,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed bottom-24 right-6 w-96 max-h-[550px] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-sm text-white">재생 대기열 ({queue.length}곡)</h3>
          </div>
          <div className="flex items-center gap-1">
            {queue.length > 0 && (
              <button
                onClick={onClearQueue}
                className="p-1.5 text-xs text-zinc-400 hover:text-rose-400 transition"
                title="전체 비우기"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Playing Indicator */}
        {currentTrack && (
          <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-rose-500/30">
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                현재 재생 중
              </span>
              <div className="text-xs font-semibold text-white truncate">
                {currentTrack.title}
              </div>
              <div className="text-[11px] text-zinc-400 truncate">
                {currentTrack.artist}
              </div>
            </div>
          </div>
        )}

        {/* Queue Tracks */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {queue.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-zinc-500 text-xs">
              <Music className="w-8 h-8 mb-2 opacity-40" />
              대기열이 비어 있습니다.
            </div>
          ) : (
            queue.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                className="group flex items-center gap-2.5 p-2 rounded-xl hover:bg-zinc-800/70 transition"
              >
                <span className="w-5 text-center text-xs text-zinc-500 font-medium">
                  {idx + 1}
                </span>
                <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-zinc-800 border border-zinc-700/50">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => onSelectTrack(track, idx)}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  >
                    <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-rose-300">
                    {track.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {track.artist}
                  </div>
                </div>

                <button
                  onClick={() => onRemoveTrack(idx)}
                  className="p-1.5 text-zinc-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                  title="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
