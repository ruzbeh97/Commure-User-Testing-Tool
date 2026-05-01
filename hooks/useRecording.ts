'use client';
import { useState, useRef, useCallback } from 'react';
import { upload } from '@vercel/blob/client';

export type RecordingState = 'idle' | 'recording' | 'uploading' | 'done' | 'error';

export function useRecording(enabled: boolean) {
  const [state, setState] = useState<RecordingState>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamsRef = useRef<MediaStream[]>([]);

  const start = useCallback(async () => {
    if (!enabled) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const tracks = [...screenStream.getVideoTracks()];
      streamsRef.current = [screenStream];

      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        tracks.push(...micStream.getAudioTracks());
        streamsRef.current.push(micStream);
      } catch {
        // mic is optional
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';

      const combined = new MediaStream(tracks);
      chunksRef.current = [];
      const recorder = new MediaRecorder(combined, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000);
      recorderRef.current = recorder;
      setState('recording');
    } catch (err) {
      console.error('[Recording] Failed to start:', err);
      setState('error');
      setUploadError(String(err));
    }
  }, [enabled]);

  const stop = useCallback((): Promise<string | null> => {
    return new Promise(resolve => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        // Still try to upload buffered chunks if any
        if (chunksRef.current.length > 0) {
          setState('uploading');
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          upload(`recordings/${Date.now()}.webm`, blob, {
            access: 'public',
            handleUploadUrl: '/api/upload',
          }).then(({ url }) => {
            setState('done');
            resolve(url);
          }).catch(err => {
            console.error('[Recording] Upload failed:', err);
            setUploadError(String(err));
            setState('error');
            resolve(null);
          });
        } else {
          resolve(null);
        }
        return;
      }

      recorder.onstop = async () => {
        streamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()));
        streamsRef.current = [];

        if (chunksRef.current.length === 0) { resolve(null); return; }

        setState('uploading');
        try {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const { url } = await upload(`recordings/${Date.now()}.webm`, blob, {
            access: 'public',
            handleUploadUrl: '/api/upload',
          });
          setState('done');
          resolve(url);
        } catch (err) {
          console.error('[Recording] Upload failed:', err);
          setUploadError(String(err));
          setState('error');
          resolve(null);
        }
      };

      recorder.stop();
    });
  }, []);

  return { state, uploadError, start, stop };
}
