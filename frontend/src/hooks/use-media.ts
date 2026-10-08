"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export function useMedia(initialVideo: boolean) {
  const streamRef = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audio, setAudio] = useState(false);
  const [video, setVideo] = useState(false);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [audioId, setAudioId] = useState("");
  const [videoId, setVideoId] = useState("");
  const refreshDevices = useCallback(async () => {
    if (navigator.mediaDevices?.enumerateDevices)
      setDevices(await navigator.mediaDevices.enumerateDevices());
  }, []);
  const acquire = useCallback(
    async (
      wantVideo: boolean,
      wantAudio: boolean,
      nextAudioId?: string,
      nextVideoId?: string,
    ) => {
      const attempt = ++generation.current;
      setBusy(true);
      setError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Camera access requires HTTPS or localhost. You can still join without media.",
        );
        setBusy(false);
        return;
      }
      const constraints = {
        audio: wantAudio
          ? nextAudioId
            ? { deviceId: { exact: nextAudioId } }
            : true
          : false,
        video: wantVideo
          ? nextVideoId
            ? {
                deviceId: { exact: nextVideoId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : { width: { ideal: 1280 }, height: { ideal: 720 } }
          : false,
      };
      let next: MediaStream;
      try {
        next =
          wantAudio || wantVideo
            ? await navigator.mediaDevices.getUserMedia(constraints)
            : new MediaStream();
      } catch (e) {
        if (attempt !== generation.current) return;
        // If camera fails, keep an audio-only path available.
        if (wantVideo && wantAudio) {
          try {
            next = await navigator.mediaDevices.getUserMedia({
              audio: constraints.audio,
              video: false,
            });
            setError(
              "Camera unavailable. Your microphone is ready; you can join with video off.",
            );
          } catch {
            setError(
              "Camera or microphone permission was denied or no device is available. You can join with both off.",
            );
            setBusy(false);
            return;
          }
        } else {
          setError(
            (e as Error).name === "NotAllowedError"
              ? "Permission denied. Allow access in your browser or join with media off."
              : "This device is unavailable. Select another device or join with media off.",
          );
          setBusy(false);
          return;
        }
      }
      if (attempt !== generation.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = next;
      setStream(next);
      setAudio(next.getAudioTracks().some((t) => t.enabled));
      setVideo(next.getVideoTracks().some((t) => t.enabled));
      setBusy(false);
      await refreshDevices();
    },
    [refreshDevices],
  );
  useEffect(() => {
    acquire(initialVideo, true);
    const change = () => void refreshDevices();
    navigator.mediaDevices?.addEventListener("devicechange", change);
    return () => {
      generation.current++;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      navigator.mediaDevices?.removeEventListener("devicechange", change);
    };
  }, [initialVideo, acquire, refreshDevices]);
  const toggleAudio = useCallback(async () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track && track.readyState === "live") {
      track.enabled = !track.enabled;
      setAudio(track.enabled);
    } else await acquire(video, true, audioId, videoId);
  }, [acquire, video, audioId, videoId]);
  const toggleVideo = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && track.readyState === "live") {
      track.enabled = !track.enabled;
      setVideo(track.enabled);
    } else await acquire(true, audio, audioId, videoId);
  }, [acquire, audio, audioId, videoId]);
  const mute = useCallback(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
    setAudio(false);
  }, []);
  async function selectDevice(kind: "audio" | "video", id: string) {
    if (kind === "audio") setAudioId(id);
    else setVideoId(id);
    await acquire(
      video,
      audio,
      kind === "audio" ? id : audioId,
      kind === "video" ? id : videoId,
    );
  }
  return {
    stream,
    audio,
    video,
    error,
    devices,
    busy,
    audioId,
    videoId,
    toggleAudio,
    toggleVideo,
    mute,
    selectDevice,
    retry: () => acquire(initialVideo, true, audioId, videoId),
  };
}
