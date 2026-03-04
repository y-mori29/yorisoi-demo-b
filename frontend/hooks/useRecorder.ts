import { useState, useRef, useCallback } from "react";

import { API_BASE as API_BASE_URL } from "../services/api";

const SIGN_URL = `${API_BASE_URL}/api/recordings/sign-upload`;
const FINALIZE_URL = (id: string) => `${API_BASE_URL}/api/recordings/${id}/finalize`;
const CHUNK_DURATION_MS = 10000; // 10 seconds
const SAMPLE_RATE = 16000;

interface RecordingMeta {
  patientId: string;
  patientName: string;
  facilityId: string;
  facilityName: string;
  recordedById?: string;
  recordedByName?: string;
  recordedByRole?: string;
}

// 無音を生成してループ再生する関数（iOS等のバックグラウンド録音停止回避ハック）
// グローバルに保持し、ユーザーの直接のClickイベントで再生を開始する
let globalSilentAudio: HTMLAudioElement | null = null;

export const initSilentAudio = () => {
  if (typeof window === 'undefined') return null;
  if (!globalSilentAudio) {
    globalSilentAudio = new Audio();
    // 小さな無音のBase64データ（1秒弱の無音WAV）
    globalSilentAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAAAA";
    globalSilentAudio.loop = true;
    globalSilentAudio.setAttribute('playsinline', 'true');
  }

  // --- Media Session API 導入 ---
  // ロック画面・コントロールセンターに「再生中」であることを明示し、OSにプロセス停止を躊躇させる
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: '録音中です',
      artist: 'Yorisoi App',
      album: 'CareVoice Rec'
    });

    // システム側からの再生・一時停止アクションに対するハンドラ（動作の保証として登録）
    navigator.mediaSession.setActionHandler('play', () => {
      globalSilentAudio?.play().catch(e => console.warn(e));
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      // 一時停止が押されても実際には停止しない（あるいは再開させる）ことでプロセスを維持する
      globalSilentAudio?.play().catch(e => console.warn(e));
    });
  }

  // Clickハンドラ等から直接呼ばれないとiOSでは再生が拒否される
  globalSilentAudio.play().catch(e => console.warn("Silent audio failed (Needs user gesture):", e));
  return globalSilentAudio;
};

export const useRecorder = (userId: string) => {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState<string>("");

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const pcmBufferRef = useRef<Int16Array[]>([]);
  const recordingIdRef = useRef<string>("");
  const chunkSeqRef = useRef<number>(0);
  const inflightUploadsRef = useRef<Promise<void>[]>([]);
  const isRecordingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Helper: Float32 to Int16 ---
  const floatTo16BitPCM = (output: Int16Array, input: Float32Array) => {
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
  };

  // --- Helper: Downsample and Convert to Int16 (High Quality with Filtering) ---
  const processAndResample = (
    inputData: Float32Array,
    fromRate: number,
    toRate: number
  ) => {
    if (fromRate === toRate) {
      const output = new Int16Array(inputData.length);
      floatTo16BitPCM(output, inputData);
      return output;
    }

    const ratio = fromRate / toRate;
    const newLength = Math.round(inputData.length / ratio);
    const result = new Int16Array(newLength);

    for (let i = 0; i < newLength; i++) {
      let sum = 0;
      let count = 0;
      const start = Math.floor(i * ratio);
      const end = Math.floor((i + 1) * ratio);

      for (let j = start; j < end; j++) {
        if (j < inputData.length) {
          sum += inputData[j];
          count++;
        }
      }

      const avg = count > 0 ? sum / count : 0;
      const s = Math.max(-1, Math.min(1, avg));
      // Boost volume for distance/mumbling (2.5x boost)
      // Note: noise suppression should help clean up the noise before boosting
      const boosted = s * 2.5;
      const clipped = Math.max(-1, Math.min(1, boosted));
      result[i] = clipped < 0 ? clipped * 0x8000 : clipped * 0x7FFF;
    }
    return result;
  };

  // --- Helper: Create Raw PCM Blob ---
  const createPcmBlob = (pcmData: Int16Array[]) => {
    const totalSamples = pcmData.reduce((acc, curr) => acc + curr.length, 0);
    const buffer = new Int16Array(totalSamples);

    let offset = 0;
    for (const chunk of pcmData) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    return new Blob([buffer], { type: 'application/octet-stream' });
  };

  // --- Upload Chunk Logic ---
  const uploadChunk = async (blob: Blob, meta: RecordingMeta) => {
    chunkSeqRef.current += 1;
    const seq = chunkSeqRef.current;

    try {
      const payload: any = {
        seq,
        contentType: blob.type,
        patientId: meta.patientId,
        facilityId: meta.facilityId,
        recordedById: meta.recordedById,
        recordedByName: meta.recordedByName,
        recordedByRole: meta.recordedByRole
      };
      if (recordingIdRef.current) {
        payload.recordingId = recordingIdRef.current;
      }

      const signRes = await fetch(SIGN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!signRes.ok) return;
      const { uploadUrl, recordingId } = await signRes.json();
      if (!recordingIdRef.current) recordingIdRef.current = recordingId;

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': blob.type },
        body: blob
      });
    } catch (e) {
      console.error(`Error uploading chunk #${seq}`, e);
    }
  };

  // --- Finalize Logic ---
  const finalizeRecording = useCallback(async (recordingId: string) => {
    setStatusText("AI解析を実行中...");
    try {
      const res = await fetch(FINALIZE_URL(recordingId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error(`解析リクエスト失敗: ${res.status}`);
      return await res.json();
    } catch (e: any) {
      console.error("Finalize error:", e);
      throw e;
    }
  }, []);

  const sendCurrentChunk = useCallback((meta: RecordingMeta) => {
    if (pcmBufferRef.current.length === 0) return;
    const blob = createPcmBlob(pcmBufferRef.current);
    pcmBufferRef.current = [];
    const task = uploadChunk(blob, meta);
    inflightUploadsRef.current.push(task);
  }, []);

  // --- Clear OS locks & hacks ---
  const releaseLocks = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(console.error);
      wakeLockRef.current = null;
    }
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
      silentAudioRef.current.src = "";
      silentAudioRef.current = null;
    }
  }, []);

  // --- Start Recording ---
  const startRecording = useCallback(async (meta: RecordingMeta) => {
    console.log("Starting recording with background/pocket fixes...");

    // Aggressive Cleanup
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch (e) { }
      audioContextRef.current = null;
    }
    releaseLocks();

    isRecordingRef.current = true;

    try {
      // 1. Silent Audio Play (Hack for iOS Background Execution)
      silentAudioRef.current = initSilentAudio();

      // 2. Wake Lock API Support (Android/Web)
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.error("Wake Lock error", err);
        }
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // POCKET NOISE FIX: Enable noise suppression, but disable AGC/Echo to prevent aggressive ducking of far away voices
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: true, // Enable to remove pocket rustling
            autoGainControl: false, // Keep false to use our custom 2.5x multiplier
            // @ts-ignore - WebKit specific
            latency: 0,
          }
        });

        if (!isRecordingRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        // Use hardware sample rate for stability (especially iOS)
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        const hardwareRate = audioContext.sampleRate;
        console.log(`Hardware Sample Rate: ${hardwareRate} Hz`);

        // 3. Audio Context State Recovery (iOS Sleep Recovery)
        audioContext.onstatechange = () => {
          console.log("AudioContext State changed to: ", audioContext.state);
          // If the system suspends it but we're still 'recording', force resume
          if (audioContext.state === 'suspended' && isRecordingRef.current) {
            console.log("Attempting force resume of AudioContext...");
            audioContext.resume();
          }
        };

        // Important for iOS: Context might start as 'suspended'
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        await audioContext.audioWorklet.addModule('/pcm-processor.js');
        const source = audioContext.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
        workletNodeRef.current = workletNode;

        pcmBufferRef.current = [];
        chunkSeqRef.current = 0;
        recordingIdRef.current = "";
        inflightUploadsRef.current = [];

        workletNode.port.onmessage = (event) => {
          const floatData = event.data; // Float32Array from Worklet
          // Downsample to 16kHz and convert to Int16 in one go
          const int16Data = processAndResample(floatData, hardwareRate, SAMPLE_RATE);
          pcmBufferRef.current.push(int16Data);
        };

        source.connect(workletNode);

        setIsRecording(true);
        setStatusText("録音中...");

        // Start chunk timer
        chunkTimerRef.current = setInterval(() => {
          sendCurrentChunk(meta);
        }, CHUNK_DURATION_MS);

      } else {
        setStatusText("マイクが使えません");
        isRecordingRef.current = false;
        releaseLocks();
      }
    } catch (e) {
      console.error("Mic error:", e);
      setStatusText("マイクへのアクセス失敗");
      isRecordingRef.current = false;
      releaseLocks();
    }
  }, [sendCurrentChunk, releaseLocks]);

  // --- Stop & Process Flow ---
  const stopRecording = useCallback(async (meta: RecordingMeta) => {
    setStatusText("録音停止中...");

    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    isRecordingRef.current = false;
    setIsRecording(false);
    setIsProcessing(true);
    releaseLocks();

    // Send the last chunk
    sendCurrentChunk(meta);

    // Stop tracks and close context
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close();
    }

    try {
      await Promise.allSettled(inflightUploadsRef.current);
      const recId = recordingIdRef.current;
      if (recId) {
        const result = await finalizeRecording(recId);
        return result;
      } else {
        return null;
      }
    } catch (e: any) {
      console.error("Stop logic error:", e);
      return { error: e.message };
    } finally {
      setIsProcessing(false);
      setStatusText("");
    }
  }, [finalizeRecording, sendCurrentChunk, releaseLocks]);

  // --- Cancel ---
  const cancelRecording = useCallback(() => {
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    streamRef.current = null;
    workletNodeRef.current = null;
    pcmBufferRef.current = [];
    inflightUploadsRef.current = [];
    setIsRecording(false);
    isRecordingRef.current = false;
    setIsProcessing(false);
    setStatusText("");
    releaseLocks();
  }, [releaseLocks]);

  return {
    isRecording,
    isProcessing,
    statusText,
    startRecording,
    stopRecording,
    cancelRecording
  };
};