"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

type AvatarProps = {
  audioUrl: string | null;
  isProcessing: boolean;
  playbackRate?: number;
};

export function Avatar({
  audioUrl,
  isProcessing,
  playbackRate = 1,
}: AvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    const playVideo = () => video.play();
    const pauseVideo = () => video.pause();

    audio.removeEventListener("play", playVideo);
    audio.removeEventListener("pause", pauseVideo);
    audio.removeEventListener("ended", pauseVideo);

    if (audioUrl) {
      audio.src = audioUrl;
      audio.playbackRate = playbackRate;

      audio.addEventListener("play", playVideo);
      audio.addEventListener("pause", pauseVideo);
      audio.addEventListener("ended", pauseVideo);

      audio.play().catch((e) => console.error("Audio play failed:", e));
    } else {
      pauseVideo();
    }

    return () => {
      audio.removeEventListener("play", playVideo);
      audio.removeEventListener("pause", pauseVideo);
      audio.removeEventListener("ended", pauseVideo);
    };
  }, [audioUrl, playbackRate]);

  return (
    <div className="relative w-64 h-64">
      <video
        ref={videoRef}
        src="/avatar.mp4"
        loop
        muted
        playsInline
        className="w-full h-full rounded-full object-cover border-4 border-primary"
      />
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 rounded-full flex justify-center items-center">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
      )}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
