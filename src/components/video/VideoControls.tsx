"use client";

import { VideoScrubTimeline } from "./VideoScrubTimeline";
import type { ProjectVideo } from "@/lib/video/videoTypes";

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7.5 5.5h3.75v13H7.5zM12.75 5.5h3.75v13h-3.75z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m8 5 11 7-11 7V5z" />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3.5 8.75v6.5H7l6 4.25v-15L7 8.75H3.5z" />
      <path d="m17.2 8.7 1.8 2.45 1.8-2.45 1.7 1.25-2.42 3.05 2.42 3.05-1.7 1.25L19 14.85l-1.8 2.45-1.7-1.25 2.42-3.05-2.42-3.05z" />
    </svg>
  );
}

function SoundIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3.5 8.75v6.5H7l6 4.25v-15L7 8.75H3.5z" />
      <path d="M15.9 8.15a6.2 6.2 0 0 1 0 9.7l-1.35-1.55a4.15 4.15 0 0 0 0-6.6z" />
      <path d="M18.55 5.55a9.65 9.65 0 0 1 0 12.9L17.1 17a7.55 7.55 0 0 0 0-10z" />
    </svg>
  );
}

export function VideoControls({
  currentTime,
  duration,
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
      <VideoScrubTimeline currentTime={currentTime} duration={duration} onSeek={onSeek} video={video} />
    </div>
  );
}
