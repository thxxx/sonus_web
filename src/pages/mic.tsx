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

/**
 * WebRealtimeTranscriber.tsx
 * -------------------------------------------------------------
 * A single-file, browser-only React + TypeScript + Tailwind app that
 * combines the functionality of your Electron main (custom.ts) and
 * renderer (client.ts) into one component for the web.
 *
 * What it does
 * - Opens a WebSocket to your real-time STT/translation/TTS server
 * - Captures mic audio (getUserMedia + WebAudio), does simple energy VAD
 * - Streams base64 PCM16LE chunks (resampled to 24 kHz) to the server
 * - Receives transcript/translation deltas and TTS audio, plays seamlessly
 * - Provides Start/Stop, language/provider selectors, and simple logs
 *
 * Tailwind
 * - Uses Tailwind utility classes for layout & styling
 *
 * Notes
 * - Replace SERVER_NS with your actual Runpod proxy namespace
 * - Ensure the page is served over HTTPS to access the mic
 * - The server is assumed to accept messages identical to custom.ts
 */

// ---------------------------
// Types / constants
// ---------------------------

type STTTarget = "mic" | "speaker";

enum LANGUAGE_CODE {
  KO = "ko",
  EN = "en",
  JA = "ja",
  FR = "fr",
  DE = "de",
  ES = "es",
  IT = "it",
  PT_PT = "pt-pt",
  PT_BR = "pt-br",
  RU = "ru",
  AR = "ar",
  TR = "tr",
  HE = "he",
  HI = "hi",
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
  const [loading, setLoading] = useState(false);
  const [languageCode, setLanguageCode] = useState<LANGUAGE_CODE>(
    LANGUAGE_CODE.KO
  );
  const [target, setTarget] = useState<STTTarget>("mic");
  const [isLogging, setIsLogging] = useState(false);

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
    // const url = `wss://ws.thesonus.xyz/${endPoint}`;
    // const url = `wss://61.107.202.12:5000/${endPoint}`;
    const url = `wss://qxsuomndj8cec9-5000.proxy.runpod.net/${endPoint}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    console.log("openSocket");

    ws.onopen = () => {
      // start session
      const openMsg = {
        type: "scriptsession.start",
        language: languageCode,
        model: modelId,
        use_filler: isLogging,
      };
      ws.send(JSON.stringify(openMsg));
      console.log("openSocket");

      // 2) ---- ADD: 세션 시작 직후, voice condition 업로드 ----
      (async () => {
        try {
          // 우선순위: VoiceConditionModal -> (선택) useAudioRecorder 훅 blob
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
      } else if (msgType === "stop-talking") {
        setScripting("");
      } else if (msgType === "transcript") {
        // final sentence chunk
        setLastSentence((prev) =>
          prev ? prev + " " + (msg.text ?? "") : msg.text ?? ""
        );
        scriptRef.current = msg.text ?? "";
        setScripting("");
      } else if (msgType === "translated") {
        if (!msg.is_final) return;
        let translatedText = String(msg.text ?? "").replace(/<SKIP>/g, "");
        if (!translatedText.trim()) return;

        translatedText =
          (lastTranslation ? lastTranslation + " " : "") + translatedText;
        // if (translatedText.includes("<END>")) {
        const clean = translatedText.replace("<END>", "").trim();
        setMyTranslates((ts) => [...ts, clean]);
        setLastTranslation("");
        setLastSentence("");
        scriptRef.current = "";
        // } else {
        //   setLastTranslation(translatedText);
        // }
      } else if (msgType === "tts_audio") {
        // measure TTS latency from voice end to first audio
        if (voiceEndTimeRef.current) {
          const ms = performance.now() - voiceEndTimeRef.current;
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
      wsRef.current = null;
    };

    ws.onerror = (err) => {
      console.error("Socket error:", err);
      alert("Error! 알려주세요. 아마 서버가 꺼졌거나 등등");
    };
  }, [languageCode, target, ALPHA, voiceSample]);

  useEffect(() => {
    if (lastSentence != "") setMyTranscripts((ts) => [...ts, lastSentence]);
  }, [lastSentence]);

  const closeSocket = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    if (hbRef.current) {
      window.clearInterval(hbRef.current);
      hbRef.current = null;
    }
    wsRef.current = null;
  }, []);

  // ---------------------------
  // Mic capture & push loop
  // ---------------------------
  const stopMic = useCallback(() => {
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
    console.log("startMic", ws);
    // if (!ws || ws.readyState !== 1) return;
    console.log("startMic 2");

    // request mic
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    });
    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)({ sampleRate: 48000 });

    const src = audioCtx.createMediaStreamSource(stream);
    const proc = audioCtx.createScriptProcessor(2048, 1, 1); // deprecated but simple & widely supported
    vadRef.current = createVAD(0.0025, 0.0015, 250);

    proc.onaudioprocess = (ev) => {
      const inRate = audioCtx.sampleRate;
      const input = ev.inputBuffer.getChannelData(0);

      // compute RMS for simple VAD
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      const rms = Math.sqrt(sum / input.length);

      // resample to 24kHz then encode PCM16 -> base64
      const mono24k = resampleLinearMono(input, inRate, TARGET_SR);
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

    src.connect(proc);
    proc.connect(audioCtx.destination); // required for some browsers to keep processor alive

    mediaStreamRef.current = stream;
    audioCtxRef.current = audioCtx;
    procNodeRef.current = proc;
  }, [sendAudioCommit]);

  // ---------------------------
  // Start/Stop button
  // ---------------------------
  const onToggle = useCallback(async () => {
    if (recording) {
      setLoading(true);
      // Stop capture & close session on server
      try {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: "session.close" }));
      } catch {}
      stopMic();
      closeSocket();
      setRecording(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    resetAll();
    await openSocket();
    setRecording(true);
    await startMic();
    setLoading(false);
  }, [recording, openSocket, startMic, stopMic, closeSocket, resetAll]);

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="w-full min-h-screen bg-xmain text-xopp p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">
            Web Real‑Time Transcriber
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              disabled={loading}
              className={`px-4 py-2 rounded-2xl border border-white/70 shadow-sm flex items-center gap-2 ${
                loading ? "opacity-50" : "hover:bg-white/10"
              } ${recording ? "text-red-400" : "text-xopp"}`}
            >
              {loading ? "Loading…" : recording ? "Stop" : "Start"}
              <span
                className={`ml-1 inline-block w-2 h-2 rounded-full ${
                  recording ? "bg-red-500" : "bg-white/80"
                }`}
              />
            </button>
          </div>
        </header>

        <div className="text-sm text-xopp/60">
          아직 수정중이라 주의사항이 몇개 있습니다. 1) 조용한 환경에서
          해야합니다. 실제로는 소음있는 환경에서도 되게 하겠지만 아직은 2)
          중간에 로직이 한번 꼬이면 이상한 말들을 뱉을 때가 있습니다. ex) 네,
          네, 네, 네, 네, | 감사합니다.
          <br />
          클로닝 하고싶은 목소리를 바꾸실 때는 한번 stop 후 다시 start 하셔야
          합니다.
          <br /> cloning voice를 직접 넣지 않으면, 디폴트 목소리로 나옵니다.
          <br /> start로 웹소켓을 연결한 후 처음 한두번 정도는 latency가 높을 수
          있습니다.
        </div>

        {/* <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
            <label className="text-sm text-xopp/80">Language</label>
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
            <label className="text-sm text-xopp/80">Provider</label>
            <select
              className="bg-transparent outline-none ml-auto"
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as PROVIDER_TYPE)}
            >
              <option className="bg-neutral-900" value={PROVIDER_TYPE.OPENAI}>
                OpenAI
              </option>
              <option className="bg-neutral-900" value={PROVIDER_TYPE.GEMINI}>
                Gemini
              </option>
              <option className="bg-neutral-900" value={PROVIDER_TYPE.DEEPGRAM}>
                Deepgram
              </option>
              <option className="bg-neutral-900" value={PROVIDER_TYPE.CUSTOM}>
                Custom
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2">
            <label className="text-sm text-xopp/80">Target</label>
            <select
              className="bg-transparent outline-none ml-auto"
              value={target}
              onChange={(e) => setTarget(e.target.value as STTTarget)}
            >
              <option className="bg-neutral-900" value="mic">
                Mic
              </option>
              <option className="bg-neutral-900" value="speaker">
                Speaker
              </option>
            </select>
          </div>
        </section> */}

        <section className="flex items-center gap-3">
          <button
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-sm"
            onClick={() => setIsLogging((s) => !s)}
          >
            <input type="checkbox" checked={isLogging} />
            {isLogging ? "Random filler audio ✅" : "Random filler audio ❌"}
          </button>
          {/* <button
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-sm"
            onClick={() => sendAudioCommit()}
          >
            Send Commit (VAD manual)
          </button> */}
          <button
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-sm"
            onClick={() => resetAll()}
          >
            Clear
          </button>
          <button
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-sm"
            onClick={() => setOpenVoiceModal((s) => !s)}
          >
            {initialSample ? "Use My voice ✅" : "Use My voice ❌"}
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
          <div className="text-sm uppercase tracking-wide text-xopp/60">
            Speaking
          </div>
          <div className="text-base whitespace-pre-wrap break-words selection:bg-emerald-500/30">
            {lastSentence} {scripting}
          </div>

          <div className="pt-3 border-t border-white/10" />

          <div className="text-sm uppercase tracking-wide text-xopp/60">
            Current Translation
          </div>
          <div className="text-base whitespace-pre-wrap break-words selection:bg-indigo-500/30">
            {lastTranslation}
          </div>

          {ttsLog && <div className="text-xs text-xopp/60">{ttsLog}</div>}
        </section>

        <section className="bg-white/5 rounded-2xl p-4">
          <div className="text-sm uppercase tracking-wide text-xopp/60 mb-2">
            History
          </div>
          <div className="space-y-3">
            {myTranscripts.map((t, i) => (
              <div
                key={`row_${i}`}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-xs text-xopp/60">Original</div>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {t}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-xs text-xopp/60">Translated</div>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {myTranslates[i] ?? "translating…"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center text-xs text-xopp/40 pt-4">
          WebSocket: wss://{SERVER_NS}-5000.proxy.runpod.net/ws · SR:{" "}
          {TARGET_SR / 1000} kHz
        </footer>
      </div>
    </div>
  );
}
