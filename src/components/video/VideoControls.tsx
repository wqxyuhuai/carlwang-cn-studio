"use client";

import { VideoScrubTimeline } from "./VideoScrubTimeline";
import type { ProjectVideo } from "@/lib/video/videoTypes";

function PauseIcon() {
  return (
    <svg aria-hidden="true" className="video-icon-fill video-icon-pause" viewBox="0 0 24 24">
      <rect x="7" y="5.5" width="3.75" height="13" rx="1.1" />
      <rect x="13.25" y="5.5" width="3.75" height="13" rx="1.1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" className="video-icon-fill video-icon-play" viewBox="0 0 24 24">
      <path d="M8.25 6.35c0-.88.96-1.42 1.72-.96l9.28 5.65c.72.44.72 1.48 0 1.92l-9.28 5.65c-.76.46-1.72-.08-1.72-.96V6.35z" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 9.25v5.5h3.35l5.15 3.75v-13L7.35 9.25H4z" />
      <path d="m17 9.2 4 5.6m0-5.6-4 5.6" />
    </svg>
  );
}

function SoundIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 9.25v5.5h3.35l5.15 3.75v-13L7.35 9.25H4z" />
      <path d="M16 8.7a5 5 0 0 1 0 6.6" />
      <path d="M18.7 6.1a8.5 8.5 0 0 1 0 11.8" />
    </svg>
  );
}

export function VideoControls({
  currentTime,
  duration,
  isActive,
  isDimmed,
  isMuted,
  isPlaying,
  onSeek,
  onToggleMute,
  onTogglePlay,
  video
}: {
  currentTime: number;
  duration: number;
  isActive: boolean;
  isDimmed: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  video: ProjectVideo;
}) {
  return (
    <div className={["video-controls", isDimmed ? "is-dimmed" : ""].filter(Boolean).join(" ")} onClick={(event) => event.stopPropagation()}>
      <button aria-label={isPlaying ? "Pause video" : "Play video"} className="video-control-button" onClick={onTogglePlay} type="button">
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button aria-label={isMuted ? "Unmute video" : "Mute video"} className="video-control-button" onClick={onToggleMute} type="button">
        {isMuted ? <MutedIcon /> : <SoundIcon />}
      </button>
      <VideoScrubTimeline currentTime={currentTime} duration={duration} isActive={isActive} onSeek={onSeek} video={video} />
    </div>
  );
}
