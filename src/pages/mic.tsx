import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "../globals.css";
import "../styles/radix.css";
import VoiceConditionModal, {
  arrayBufferToBase64,
  base64ToUint8Array,
  blobToPCM16LE24kBase64,
  floatTo16BitPCM,
  int16ToBase64,
  pcm16ToWav,
  resampleLinearMono,
  resolveSampleBlob,
  VoiceSample,
} from "@/components/landing/VoiceConditionModal";

type STTTarget = "mic" | "speaker";

enum LANGUAGE_CODE {
  Arabic = "ar",
  Danish = "da",
  German = "de",
  Greek = "el",
  English = "en",
  Spanish = "es",
  Finnish = "fi",
  French = "fr",
  Hebrew = "he",
  Hindi = "hi",
  Italian = "it",
  Japanese = "ja",
  Korean = "ko",
  Malay = "ms",
  Dutch = "nl",
  Norwegian = "no",
  Polish = "pl",
  Portuguese = "pt",
  Russian = "ru",
  Swedish = "sv",
  Swahili = "sw",
  Turkish = "tr",
  Chinese = "zh",
}
const modelId = "gpt-4o-transcribe"; // STT
const llmId = "gpt-4.1-mini"; // translator

const LLM_COST = {
  "gpt-4.1-mini": { cached: 0.1, input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { cached: 0.025, input: 0.1, output: 0.4 },
  "gpt-5-nano": { cached: 0.005, input: 0.05, output: 0.4 },
  "gpt-4o-mini": { cached: 0.075, input: 0.15, output: 0.6 },
};

type LLMKey = keyof typeof LLM_COST;

// Match your server namespace
const SERVER_NS = "qi98kgjx2co45a"; // ← change if needed
const USE_LAT_LOG = false; // send latency ping every 1s

// Target sample rate your server expects (based on your Electron app)
const TARGET_SR = 24000;

// ---------------------------
// StreamingAudioPlayer (queue-based, gap-minimized)
// ---------------------------
class StreamingAudioPlayer {
  private audio: HTMLAudioElement;
  private q: { url: string }[] = [];
  private playing = false;
  private _volume = 1;

  constructor() {
    this.audio = new Audio();
    this.audio.addEventListener("ended", this._playNext);
    this.audio.addEventListener("error", this._playNext);
    this.audio.volume = this._volume;
  }

  dispose() {
    this.audio.pause();
    this.audio.src = "";
    this.q.forEach((x) => URL.revokeObjectURL(x.url));
    this.q = [];
  }

  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    this.audio.volume = this._volume;
  }

  private _playNext = () => {
    const next = this.q.shift();
    if (!next) {
      this.playing = false;
      return;
    }
    this.audio.src = next.url;
    this.audio.play().catch(() => {
      /* ignore */
    });
  };

  async pushBase64(
    b64: string,
    mime: "audio/mpeg" | "audio/wav" = "audio/mpeg"
  ) {
    const data = base64ToUint8Array(b64);
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    this.q.push({ url });
    if (!this.playing) {
      this.playing = true;
      this._playNext();
    }
  }
}

// ---------------------------
// VAD: very simple RMS-based start/stop detection
// ---------------------------
interface VADState {
  speaking: boolean;
  silenceMs: number;
  voiceMs: number;
}
function createVAD(
  thresholdStart = 0.0025,
  thresholdStop = 0.0015,
  minSilenceMs = 250
) {
  const state: VADState = { speaking: false, silenceMs: 0, voiceMs: 0 };
  let lastT = performance.now();
  return (rms: number) => {
    const now = performance.now();
    const dt = now - lastT;
    lastT = now;

    if (rms >= thresholdStart) {
      state.voiceMs += dt;
      state.silenceMs = 0;
      if (!state.speaking && state.voiceMs > 30) state.speaking = true;
    } else if (rms <= thresholdStop) {
      state.silenceMs += dt;
      state.voiceMs = 0;
      if (state.speaking && state.silenceMs >= minSilenceMs) {
        state.speaking = false;
        state.silenceMs = 0;
        return true; // voice end event
      }
    }
    return false;
  };
}

// ---------------------------
// Main Component
// ---------------------------
export default function WebRealtimeTranscriber() {
  const [recording, setRecording] = useState(false);
  const [connected, setConnected] = useState(false);

  const [languageCode, setLanguageCode] = useState<LANGUAGE_CODE>(
    LANGUAGE_CODE.Korean
  );
  const [outputLanguageCode, setOutputLanguageCode] = useState<LANGUAGE_CODE>(
    LANGUAGE_CODE.English
  );
  const [target, setTarget] = useState<STTTarget>("mic");
  const [isLogging, setIsLogging] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(false);

  const [scripting, setScripting] = useState("");
  const [lastSentence, setLastSentence] = useState("");
  const [lastTranslation, setLastTranslation] = useState("");
  const [myTranscripts, setMyTranscripts] = useState<string[]>([]);
  const [myTranslates, setMyTranslates] = useState<string[]>([]);
  const [ttsLog, setTtsLog] = useState("");

  const [openVoiceModal, setOpenVoiceModal] = useState(false);
  const [voiceSample, setVoiceSample] = useState<VoiceSample | null>(null);
  const initialSample = useMemo(() => voiceSample, [voiceSample]);

  const wsRef = useRef<WebSocket | null>(null);
  const hbRef = useRef<number | null>(null);
  const playerRef = useRef<StreamingAudioPlayer | null>(null);

  // latency calc like custom.ts
  const offsetMsRef = useRef(0); // serverClock -> clientClock
  const rttEmaRef = useRef(0);
  const ALPHA = 0.2;

  const voiceEndTimeRef = useRef<number>(0);

  // mic graph
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const procNodeRef = useRef<ScriptProcessorNode | null>(null);
  const vadRef = useRef<ReturnType<typeof createVAD> | null>(null);

  const resetAll = useCallback(() => {
    setScripting("");
    setLastSentence("");
    setLastTranslation("");
    setMyTranscripts([]);
    setMyTranslates([]);
    setTtsLog("");
  }, []);
  const scriptRef = useRef<string>("");
  const usedForTranslationRef = useRef<string>("");

  // ---------------------------
  // TTS Player setup
  // ---------------------------
  useEffect(() => {
    playerRef.current = new StreamingAudioPlayer();
    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, []);

  // ---------------------------
  // WebSocket handlers
  // ---------------------------
  const openSocket = useCallback(async () => {
    const endPoint = target === "mic" ? "ws" : "speakerws";
    // const url = `ws://ws.thesonus.xyz:5000/${endPoint}`;
    // const url = `ws://61.107.202.12:5000/${endPoint}`;
    const url = `wss://o9w9kyw31ggxq2-5000.proxy.runpod.net/${endPoint}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // start session
      const openMsg = {
        type: "scriptsession.start",
        in_language: languageCode,
        out_language: outputLanguageCode,
        model: modelId,
        use_filler: isLogging,
      };
      ws.send(JSON.stringify(openMsg));
      setIsSessionLoading(true);

      // 2) ---- ADD: 세션 시작 직후, voice condition 업로드 ----
      (async () => {
        try {
          let voiceBlob: Blob | null = await resolveSampleBlob(
            voiceSample as any
          );
          console.log("voiceBlob", voiceBlob);
          // 만약 따로 녹음 훅을 붙였다면 다음 줄처럼 보조 소스도 고려 가능:
          // if (!voiceBlob && recorder?.blob) voiceBlob = recorder.blob;

          if (voiceBlob) {
            const b64 = await blobToPCM16LE24kBase64(voiceBlob);
            const setVoiceMsg = {
              type: "scriptsession.setvoice",
              format: "pcm16le",
              sample_rate: TARGET_SR, // 24000
              channels: 1,
              audio: b64,
            };
            ws.send(JSON.stringify(setVoiceMsg));
            // 필요하면 확인 로그
            // console.log("[setvoice] sent", voiceBlob.type, voiceBlob.size);
          }
        } catch (e) {
          console.warn("setvoice failed:", e);
        }
      })();

      // heartbeat (app-level; browsers can't send WS ping frames)
      hbRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "heartbeat" }));
          if (USE_LAT_LOG)
            ws.send(JSON.stringify({ type: "latency.ping", t0: Date.now() }));
        }
      }, 30000);

      if (USE_LAT_LOG) {
        window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN)
            ws.send(JSON.stringify({ type: "latency.ping", t0: Date.now() }));
        }, 1000);
      }
    };

    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data);
      const msgType = msg.type as string;

      if (
        msgType !== "oai_event" &&
        msgType !== "tts_audio" &&
        msgType !== "latency.pong" &&
        msgType !== "audio.recv.ack"
      ) {
        console.log("msg", msg);
      }

      if (msgType === "scriptsession.started") {
        setConnected(true);
        setIsSessionLoading(false);
      }

      if (msgType === "latency.pong") {
        const t3 = Date.now();
        const { t0, t1, t2 } = msg; // server recv/send(ms, server clock)
        const rtt = t3 - t0 - (t2 - t1);
        const off = (t1 + t2 - (t0 + t3)) / 2;
        offsetMsRef.current = (1 - ALPHA) * offsetMsRef.current + ALPHA * off;
        rttEmaRef.current = (1 - ALPHA) * rttEmaRef.current + ALPHA * rtt;
      }
      console.log("msgType", msgType);
      if (msgType === "audio.recv.ack") {
        const { t0, t1 } = msg;
        const oneWay = t1 - offsetMsRef.current - t0;
        // console.log(
        //   `[audio→] one-way≈${oneWay.toFixed(
        //     1
        //   )}ms (rtt≈${rttEmaRef.current.toFixed(1)}ms)`
        // );
      }

      if (msgType === "delta") {
        setScripting(msg.text ?? "");
      } else if (msgType === "transcript") {
        setLastSentence((prev) =>
          prev ? prev + " " + (msg.text ?? "") : msg.text ?? ""
        );
        scriptRef.current += " " + msg.text;
        setScripting("");
      } else if (msgType === "translated") {
        if (!msg.is_final) return;
        let translatedText = String(msg.text ?? "").replace(/<SKIP>/g, "");
        if (!translatedText.trim()) return;
        const usedForTranslation = msg.script;
        usedForTranslationRef.current += " " + usedForTranslation;

        // 사용할 때
        translatedText =
          (lastTranslationRef.current ? lastTranslationRef.current + " " : "") +
          translatedText;

        if (translatedText.includes("<END>")) {
          const clean = translatedText.replace("<END>", "").trim();
          if (usedForTranslation !== null) {
            setMyTranscripts((ts) => [usedForTranslation, ...ts]);
          } else {
            setMyTranscripts((ts) => [usedForTranslationRef.current, ...ts]);
            usedForTranslationRef.current = "";
            scriptRef.current = scriptRef.current.slice(
              usedForTranslationRef.current.length - scriptRef.current.length
            );
          }
          setMyTranslates((ts) => [clean, ...ts]);
          setLastTranslation("");
          setLastSentence((prev) =>
            prev.slice(usedForTranslationRef.current.length ?? 0)
          );
          // scriptRef.current = scriptRef.current.slice(
          //   usedForTranslationRef.current.length ?? 0
          // );
        } else {
          setLastTranslation(translatedText);
          // scriptRef.current = scriptRef.current.slice(
          //   usedForTranslation?.length ?? 0
          // );
        }
      } else if (msgType === "tts_audio") {
        // measure TTS latency from voice end to first audio
        if (voiceEndTimeRef.current) {
          const ms = performance.now() - voiceEndTimeRef.current - 300;
          setTtsLog(`TTS first audio in ${ms.toFixed(1)} ms`);
          voiceEndTimeRef.current = 0;
        }
        if (!playerRef.current) return;
        if (msg.audio) {
          if (msg.format === "mp3_22050_32") {
            await playerRef.current.pushBase64(msg.audio, "audio/mpeg");
          } else if (msg.format === "pcm16le") {
            const raw = base64ToUint8Array(msg.audio).buffer;
            const pcm = new Int16Array(raw);
            const wavBuffer = pcm16ToWav(pcm, TARGET_SR, 1);
            const wavB64 = arrayBufferToBase64(wavBuffer);
            await playerRef.current.pushBase64(wavB64, "audio/wav");
          }
        }
      } else if (msgType === "session.close") {
        const {
          connected_time,
          llm_cached_token_count,
          llm_input_token_count,
          llm_output_token_count,
        } = msg;
        const sttCost =
          modelId === "gpt-4o-transcribe"
            ? (connected_time / 60) * 0.003
            : (connected_time / 60) * 0.006;
        const cost =
          (llm_cached_token_count * LLM_COST[llmId as LLMKey].cached +
            (llm_input_token_count - llm_cached_token_count) *
              LLM_COST[llmId as LLMKey].input +
            llm_output_token_count * LLM_COST[llmId as LLMKey].output) /
            1_000_000 +
          sttCost;
        console.log("session.close cost:", cost);
        if (hbRef.current) {
          window.clearInterval(hbRef.current);
          hbRef.current = null;
        }
      }
    };

    ws.onclose = () => {
      if (hbRef.current) {
        window.clearInterval(hbRef.current);
        hbRef.current = null;
      }
      setConnected(false);
      wsRef.current = null;
    };

    ws.onerror = (err) => {
      console.error("Socket error:", err);
      alert(
        "Server error! It looks like the temporary GPU server may be down. Please let us know."
      );
    };
  }, [languageCode, target, ALPHA, voiceSample, outputLanguageCode]);

  const lastTranslationRef = useRef("");

  useEffect(() => {
    lastTranslationRef.current = lastTranslation;
  }, [lastTranslation]);

  // ---------------------------
  // Mic capture & push loop
  // ---------------------------
  const stopMic = useCallback(() => {
    sendAudioCommit();

    procNodeRef.current?.disconnect();
    audioCtxRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    procNodeRef.current = null;
    audioCtxRef.current = null;
    mediaStreamRef.current = null;
  }, []);

  const sendAudioCommit = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
    }
  }, []);

  const startMic = useCallback(async () => {
    const ws = wsRef.current;
    // if (!ws || ws.readyState !== 1) return;

    // request mic
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // channelCount: 1,
        // echoCancellation: true,
        // noiseSuppression: true,
        channelCount: 1,
        sampleRate: 48000, // 브라우저 기본
        sampleSize: 16, // 일부 브라우저만 반영
        echoCancellation: true, // 스피커로 재생도 한다면 켜기 (AEC)
        noiseSuppression: true, // 1차 노이즈 억제
        autoGainControl: false, // 크기 “과다·펌핑” 문제의 주범 → 끄기
      },
      video: false,
    });
    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)({ sampleRate: 48000 });

    const src = audioCtx.createMediaStreamSource(stream);

    // (a) High-pass (HPF) 80~120 Hz
    const hpf = audioCtx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 100;

    // (b) DynamicsCompressor: 소프트 리미터처럼 사용
    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -6; // 피크 보호
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.05;

    const proc = audioCtx.createScriptProcessor(4096, 1, 1); // deprecated but simple & widely supported
    // const proc = audioCtx.createScriptProcessor(2048, 1, 1); // deprecated but simple & widely supported
    vadRef.current = createVAD(0.0025, 0.0015, 250);

    src.connect(hpf);
    hpf.connect(comp);
    comp.connect(proc);
    proc.connect(audioCtx.destination);

    proc.onaudioprocess = (ev) => {
      const inRate = audioCtx.sampleRate;
      const input = ev.inputBuffer.getChannelData(0);

      // compute RMS for simple VAD
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      const rms = Math.sqrt(sum / input.length);

      // 1/4 크기로 줄이기
      const scaled = new Float32Array(input.length);
      for (let i = 0; i < input.length; i++) {
        scaled[i] = input[i] * 0.8;
      }

      // resample to 24kHz then encode PCM16 -> base64
      const mono24k = resampleLinearMono(scaled, inRate, TARGET_SR);
      const pcm16 = floatTo16BitPCM(mono24k);
      const audioB64 = int16ToBase64(pcm16);

      // send chunk
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: audioB64,
            t0: Date.now(),
          })
        );
      }

      // Voice-end detection → commit
      if (vadRef.current && vadRef.current(rms)) {
        voiceEndTimeRef.current = performance.now();
        // sendAudioCommit();
      }
    };

    mediaStreamRef.current = stream;
    audioCtxRef.current = audioCtx;
    procNodeRef.current = proc;
  }, [sendAudioCommit]);

  const startSession = useCallback(async () => {
    if (connected || isSessionLoading) return;
    resetAll();
    await openSocket(); // 세션 연결만 수행
  }, [connected, isSessionLoading, openSocket, resetAll]);

  const stopSession = useCallback(() => {
    // 세션만 종료 (마이크는 그대로 두되, 아래에서 안전하게 정리)
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "session.close" }));
      } catch {}
      ws.close();
    }
    if (hbRef.current) {
      window.clearInterval(hbRef.current);
      hbRef.current = null;
    }
    wsRef.current = null;
    setIsSessionLoading(false);
    setConnected(false);

    // 세션이 끊기면 마이크도 의미 없으니 같이 끄는 것을 권장
    if (recording) {
      stopMic();
      setRecording(false);
    }
  }, [recording, stopMic]);

  const startMicOnly = useCallback(async () => {
    if (!connected) {
      // 세션 없이 마이크만 켜면 보낼 곳이 없음
      // 1) 자동으로 세션 먼저 열기:
      await startSession();
      // 2) 또는 사용자에게 알림 띄우고 return:
      // alert("세션이 연결되어 있지 않습니다. 먼저 세션을 시작하세요.");
      // return;
    }
    if (recording) return;
    await startMic();
    setRecording(true);
  }, [connected, recording, startMic, startSession]);

  const stopMicOnly = useCallback(() => {
    if (!recording) return;
    // 남은 버퍼를 확정 커밋하고 싶으면 선택:
    // try { sendAudioCommit(); } catch {}
    stopMic();
    setRecording(false);
  }, [recording, stopMic /*, sendAudioCommit*/]);

  return (
    <div className="w-full min-h-screen bg-xopp text-xmain p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">
            Web Real‑Time Transcriber
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={recording ? stopMicOnly : startMicOnly}
              className={`px-4 py-2 rounded-2xl border border-white/70 shadow-sm flex items-center gap-2 ${
                isSessionLoading ? "opacity-50" : "hover:bg-white/10"
              } ${recording ? "text-red-400" : "text-xmain"}`}
            >
              {recording ? "Stop Sending Audio" : "Record Audio"}
              <span
                className={`ml-1 inline-block w-2 h-2 rounded-full ${
                  recording ? "bg-red-500" : "bg-white/80"
                }`}
              />
            </button>
            <button
              onClick={connected ? stopSession : startSession}
              disabled={isSessionLoading}
              className={`px-4 py-2 rounded-2xl border border-white/70 shadow-sm flex items-center gap-2 ${
                isSessionLoading ? "opacity-50" : "hover:bg-white/10"
              } ${recording ? "text-red-400" : "text-xmain"}`}
            >
              {isSessionLoading
                ? "Loading…"
                : connected
                ? "Close Connection"
                : "Connect"}
              <span
                className={`ml-1 inline-block w-2 h-2 rounded-full ${
                  connected ? "bg-red-500" : "bg-white/80"
                }`}
              />
            </button>
          </div>
        </header>

        <div className="text-sm text-xmain/60">
          {/* We’re originally building this as a native app, but in the process of
          moving it to the web, the way we capture microphone audio is
          different. As a result, the speech recognition accuracy on the web is
          relatively lower compared to the app.
          <br />
          To use, first click Connect button and then click Record Audio button.
          <br /> If you don’t upload a cloned voice, a default voice will be
          used.
          <br /> Right after the first connection, latency may be higher for the
          first two or three tries.  */}
          Sonus was originally designed as a native app, and the web demo uses a
          different method to capture microphone audio—so you may notice
          slightly lower speech recognition accuracy compared to the Mac app.
          <br /> To try it out, click “Connect” first, then “Record Audio.”
          <br /> If no custom voice is uploaded, a default voice will be used
          automatically.
          <br /> Please note: right after the first connection, you may
          experience increased latency for the first two or three attempts.
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
            <label className="text-sm text-xmain/80">Input Language(My)</label>
            <select
              className="bg-transparent outline-none ml-auto"
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value as LANGUAGE_CODE)}
            >
              {Object.entries(LANGUAGE_CODE).map(([k, v]) => (
                <option className="bg-neutral-900" key={k} value={v}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
            <label className="text-sm text-xmain/80">Output Language</label>
            <select
              className="bg-transparent outline-none ml-auto"
              value={outputLanguageCode}
              onChange={(e) =>
                setOutputLanguageCode(e.target.value as LANGUAGE_CODE)
              }
            >
              {Object.entries(LANGUAGE_CODE).map(([k, v]) => (
                <option className="bg-neutral-900" key={k} value={v}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="flex items-center gap-3">
          <button
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-sm"
            onClick={() => setOpenVoiceModal((s) => !s)}
          >
            {initialSample ? "Use My Voice ✅" : "Use My Voice ❌"}
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-sm"
            onClick={() => resetAll()}
          >
            Clear Messages
          </button>

          {openVoiceModal && (
            <VoiceConditionModal
              initialSample={initialSample} // ← 외부에서 보관 중인 샘플
              onSampleChange={(s) => setVoiceSample(s)} // ← 모달이 변경 시 부모에 반영
              onClose={() => setOpenVoiceModal(false)}
              onUploaded={(p) => {
                setOpenVoiceModal(false);
              }}
            />
          )}
        </section>

        <section className="bg-white/5 rounded-2xl p-4 space-y-3">
          <div className="text-sm uppercase tracking-wide text-xmain/60">
            Speaking
          </div>
          <div className="text-base whitespace-pre-wrap break-words selection:bg-emerald-500/30">
            {lastSentence} {scripting}
          </div>

          <div className="pt-3 border-t border-white/10" />

          <div className="text-sm uppercase tracking-wide text-xmain/60">
            Current Translation
          </div>
          <div className="text-base whitespace-pre-wrap break-words selection:bg-indigo-500/30">
            {lastTranslation}
          </div>

          {ttsLog && <div className="text-xs text-xmain/60">{ttsLog}</div>}
        </section>

        <section className="bg-white/5 rounded-2xl p-4">
          <div className="text-sm uppercase tracking-wide text-xmain/60 mb-2">
            History
          </div>
          <div className="space-y-3">
            {myTranscripts.map((t, i) => (
              <div
                key={`row_${i}`}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-xs text-xmain/60">Original</div>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {t}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-xs text-xmain/60">Translated</div>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {myTranslates[i] ?? "translating…"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-xs text-xmain/40 pt-4">
          WebSocket: wss://{SERVER_NS}-5000.proxy.runpod.net/ws · SR:{" "}
          {TARGET_SR / 1000} kHz
        </footer>
      </div>
    </div>
  );
}
