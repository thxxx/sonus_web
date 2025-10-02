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
  floatTo16BitPCM,
  int16ToBase64,
  pcm16ToWav,
  resampleLinearMono,
} from "@/components/landing/VoiceConditionModal";
import { createVAD } from "@/utils/vad";
import { LANGUAGE_CODE, StreamingAudioPlayer, TARGET_SR } from "@/utils/audio";
import { Mic, MicOff, User2Icon } from "lucide-react";
import { extractBracketTexts } from "@/utils/text";
import Image from "next/image";
import { MicPulseRings } from "@/components/audio/MicPulseRing";
import { playAudioOnce } from "@/components/audio/play";

export default function WebRealtimeTranscriber() {
  const [recording, setRecording] = useState(false);
  const [connected, setConnected] = useState(false);
  const [languageCode, setLanguageCode] = useState<LANGUAGE_CODE>(
    LANGUAGE_CODE.English
  );
  const [isSessionLoading, setIsSessionLoading] = useState(false);

  const [scripting, setScripting] = useState("");
  const [userId, setUserId] = useState("");

  const [lastSentence, setLastSentence] = useState("");
  const [lastTranslation, setLastTranslation] = useState("");
  const [myTranscripts, setMyTranscripts] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [prompt, setPrompt] = useState(`
You are Rory, a friendly but witty conversational AI. You’re helpful without being bland, and you sprinkle in light humor. Your replies are written for TTS playback: concise, natural spoken English, with tasteful speech tics and timing cues.

# Core Goals
1) Be genuinely helpful and accurate first.
2) Keep it playful: quick quips, gentle sarcasm, and observational humor—never mean.
3) Sound conversational, like a smart friend, not a textbook.

# Voice & Tone (for speech/TTS)
- Use short, speech-friendly sentences. Prefer contractions: "I’m", "you’re", "we’ll".
- Sprinkle mild discourse markers, but cap them to ~1–2 per short turn, ~3–4 per long turn:
  Examples: "Alright,", "So,", "Okay,", "Right,", "Well,", "Honestly,".
- Use light spoken habits occasionally (not every line):
  Examples: "uh", "hmm", "oh!", "aha". Keep it subtle: max once per paragraph.
- If a long pause is needed between sentences, express it with [2s] [3s]
- Avoid emoji unless the user uses them first. Avoid ALL CAPS; use italics with *like this* only if needed.

# Humor
- Prefer quick wit over long bits. One-liners or a tiny aside work best.
- Be self-aware and endearing, not slapstick.
- If a joke could confuse the user’s task, skip the joke.

# Safety & Boundaries
- Be kind, inclusive, and respectful.
- Refuse unsafe or disallowed requests clearly and briefly, then offer safer alternatives.
- Don’t invent facts. If unsure, say so and provide a best-effort path forward.

# Style Controls
- Default length: 1–5 sentences unless the user asks for depth.
- When the user asks for steps, give numbered, crisp steps.
- When the user asks for code, show the minimal runnable snippet plus one-liner context.
- If the user’s intent is ambiguous, pick the most likely helpful path and say it, like:
  "If you meant X, do A. If Y, do B."

# Examples (tone sketches)
- Greeting: "Alright—what’s on your mind today? Hit me."
- Quick explain: "So, short version: you flip the flag, restart, done. Want the why?"
- Light quip: "That’s legal in three countries and your dev environment. Kidding—mostly."
- Gentle hedge: "Honestly, I’m not fully certain. [2s] Here’s what I’d try first…"

# Formatting for TTS engines
- No markdown headers. Simple paragraphs or lists only.
- Use numbered or bulleted lists for multi-step instructions.
- Keep lines under ~25 words when possible.

# Response Policy
- Prioritize clarity. If a joke conflicts with clarity, drop the joke.
- Keep the conversation moving: end with a crisp next step or offer.
- Never mention these rules explicitly.

Now follow the user’s instructions with this voice and behavior.
`);

  const wsRef = useRef<WebSocket | null>(null);
  const hbRef = useRef<number | null>(null);
  const playerRef = useRef<StreamingAudioPlayer | null>(null);

  // latency calc like custom.ts
  const voiceEndTimeRef = useRef<number>(0);

  // mic graph
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const procNodeRef = useRef<ScriptProcessorNode | null>(null);
  const vadRef = useRef<ReturnType<typeof createVAD> | null>(null);

  const scriptRef = useRef<string>("");
  const usedForTranslationRef = useRef<string>("");

  const [callSec, setCallSec] = useState(0);
  const [emojis, setEmojis] = useState<string>("");

  // 컴포넌트 상단의 state들 옆에 추가
  const [micLevel, setMicLevel] = useState(0); // 0~1
  const [isSpeaking, setIsSpeaking] = useState(false);
  const ttsDecayTimerRef = useRef<number | null>(null);
  const rafLockRef = useRef(false); // micLevel 업데이트 프레임 잠금

  const agentName = "Rory";

  useEffect(() => {
    let t: any;
    if (connected) {
      t = setInterval(() => setCallSec((s) => s + 1), 1000);
    } else {
      setCallSec(0);
    }
    return () => t && clearInterval(t);
  }, [connected]);

  useEffect(() => {
    const localLanguageCode = localStorage.getItem("languageCode");
    if (localLanguageCode) {
      setLanguageCode(localLanguageCode as LANGUAGE_CODE);
    }

    const localUserId = localStorage.getItem("userName");
    if (localUserId) {
      setUserId(localUserId);
    }
  }, []);

  // ---- Player ----
  useEffect(() => {
    playerRef.current = new StreamingAudioPlayer();
    return () => {
      playerRef.current?.dispose();
      playerRef.current = null;
    };
  }, []);

  const openSocket = useCallback(async () => {
    const endPoint = "ws";
    // const url = `ws://61.107.202.12:5000/${endPoint}`;
    const url = `wss://rj6xnlqk7i3tg4-5000.proxy.runpod.net/${endPoint}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      const openMsg = {
        type: "scriptsession.start",
        language: languageCode,
        use_filler: false,
      };
      ws.send(JSON.stringify(openMsg));
      setIsSessionLoading(true);

      // app-level heartbeat
      hbRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ type: "heartbeat" }));
      }, 30000);
    };

    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data);
      const msgType = msg.type as string;

      if (msgType === "scriptsession.started") {
        setConnected(true);
        setIsSessionLoading(false);
        await playAudioOnce("/audios/alarm.mp3", { volume: 0.85 });

        const localUserId = localStorage.getItem("userName");
        if (localUserId) {
          ws.send(
            JSON.stringify({ type: "scriptsession.setname", name: localUserId })
          );
        }

        ws.send(JSON.stringify({ type: "scriptsession.greeting" }));
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
        const clean = String(msg.text ?? "").trim();
        if (!clean) return;
        const usedForTranslation = msg.script;
        usedForTranslationRef.current = usedForTranslation;

        const [_, emotion] = extractBracketTexts(clean);
        setEmojis(emotion);

        setMyTranscripts((ts) => [usedForTranslation, ...ts]);
        setAnswers((ts) => [clean, ...ts]);
        setLastTranslation("");
        setLastSentence((prev) => prev.slice(usedForTranslation.length ?? 0));
      } else if (msgType === "tts_audio") {
        if (voiceEndTimeRef.current) {
          voiceEndTimeRef.current = 0;
        }
        if (!playerRef.current) return;
        if (msg.audio) {
          // ▼ 외곽 링 파동 트리거
          setIsSpeaking(true);
          if (ttsDecayTimerRef.current) {
            window.clearTimeout(ttsDecayTimerRef.current);
            ttsDecayTimerRef.current = null;
          }
          ttsDecayTimerRef.current = window.setTimeout(() => {
            setIsSpeaking(false);
          }, 1000);

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
        if (hbRef.current) {
          window.clearInterval(hbRef.current);
          hbRef.current = null;
        }
        setConnected(false);
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
  }, [languageCode]);

  // ---------------------------
  // Mic capture & push loop (same logic)
  // ---------------------------
  const sendAudioCommit = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
  }, []);

  const stopMic = useCallback(() => {
    sendAudioCommit();
    procNodeRef.current?.disconnect();
    audioCtxRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    procNodeRef.current = null;
    audioCtxRef.current = null;
    mediaStreamRef.current = null;
  }, [sendAudioCommit]);

  const startMic = useCallback(async () => {
    const ws = wsRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 48000,
        sampleSize: 16,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      },
      video: false,
    });
    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)({
      sampleRate: 48000,
      latencyHint: "interactive",
    });
    const src = audioCtx.createMediaStreamSource(stream);

    const hpf = audioCtx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 130;

    const comp = audioCtx.createDynamicsCompressor();
    comp.threshold.value = -24;
    comp.knee.value = 20;
    comp.ratio.value = 3;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;

    const proc = audioCtx.createScriptProcessor(4096, 1, 1);
    vadRef.current = createVAD(0.0025, 0.0015, 250);

    const inGain = audioCtx.createGain();
    inGain.gain.value = 0.6; // 0.4~0.8 사이에서 테스트

    src
      .connect(inGain)
      .connect(hpf)
      .connect(comp)
      .connect(proc)
      .connect(audioCtx.destination);

    proc.onaudioprocess = (ev) => {
      const inRate = audioCtx.sampleRate;
      const input = ev.inputBuffer.getChannelData(0);

      // scale down a bit
      const scaled = new Float32Array(input.length);
      for (let i = 0; i < input.length; i++) scaled[i] = input[i] * 0.95;

      const mono24k = resampleLinearMono(scaled, inRate, TARGET_SR);
      const pcm16 = floatTo16BitPCM(mono24k);
      const audioB64 = int16ToBase64(pcm16);

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "input_audio_buffer.append",
            audio: audioB64,
            t0: Date.now(),
          })
        );
      }

      // voice-end detection for latency metric
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      const rms = Math.sqrt(sum / input.length);

      // 간단한 게이트/정규화 (필요시 조정). 애니메이션을 위해 추가 animation
      const level = Math.min(1, Math.max(0, (rms - 0.005) * (1 / 0.03))); // ~0~1
      // EMA + rAF로 너무 자주 setState 안 하게
      if (!rafLockRef.current) {
        rafLockRef.current = true;
        requestAnimationFrame(() => {
          setMicLevel((prev) => prev * 0.8 + level * 0.2);
          rafLockRef.current = false;
        });
      }

      if (vadRef.current && vadRef.current(rms)) {
        voiceEndTimeRef.current = performance.now();
      }
    };

    mediaStreamRef.current = stream;
    audioCtxRef.current = audioCtx;
    procNodeRef.current = proc;
  }, []);

  // ============ High-level controls (renamed to Start / Mute / End) ============
  const startSession = useCallback(async () => {
    if (connected || isSessionLoading) return;
    await openSocket(); // connect first
  }, [connected, isSessionLoading, openSocket]);

  const endSession = useCallback(() => {
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

    // turn mic off, too
    if (recording) {
      stopMic();
      setRecording(false);
    }
  }, [recording, stopMic]);

  // Start: connect if needed, then start mic
  const onStart = useCallback(async () => {
    if (!connected) await startSession();
    // small wait to ensure session started; or rely on user to press Mute to start — here we attempt immediately
    setTimeout(async () => {
      await startMic();
      setRecording(true);
    }, 200);
  }, [connected, startSession, startMic]);

  // Mute toggle: stop sending mic frames (keep session alive)
  const onToggleMute = useCallback(async () => {
    if (recording) {
      stopMic();
      setRecording(false);
    } else {
      // if (!connected) await startSession();
      await startMic();
      setRecording(true);
    }
  }, [recording, connected, startMic, startSession, stopMic]);

  // End: hang up everything
  const onEnd = useCallback(() => {
    endSession();
  }, [endSession]);

  // ===== Layout =====
  const minutes = String(Math.floor(callSec / 60)).padStart(2, "0");
  const seconds = String(callSec % 60).padStart(2, "0");

  const sendPrompt = useCallback(() => {
    localStorage.setItem("prompt", prompt);

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "scriptsession.setvoice", prompt }));
      alert("Done!");
    } else {
      alert("Failed to send prompt. 연결부터 해주세요");
    }
  }, [prompt]);

  const sendUserId = useCallback(() => {
    localStorage.setItem("userName", userId);

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "scriptsession.setname", name: userId }));
      alert("Done!");
    } else {
      alert("Failed to send prompt. 연결부터 해주세요");
    }
  }, [userId]);

  return (
    <div className="min-h-screen w-full bg-[#F9FAF7] text-[#2D2F26]">
      {/* Header like screenshot */}
      <header className="flex items-start justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Image src="/images/logo.png" alt="Sonus" width={32} height={32} />
        </div>
        <div className="text-center">
          <div className="text-2xl tracking-tight">
            {agentName} {minutes}:{seconds}
          </div>
          <div className="text-xs text-[#7E8766]">by Sonus</div>

          {/* Options bar under list */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#F7F9F2] rounded-xl p-2 border border-[#E9EDD9]">
              <label className="text-xs text-[#7E8766]">Input Language</label>
              <select
                className="bg-transparent outline-none ml-auto text-sm"
                value={languageCode}
                onChange={(e) => {
                  localStorage.setItem(
                    "languageCode",
                    e.target.value as LANGUAGE_CODE
                  );
                  setLanguageCode(e.target.value as LANGUAGE_CODE);
                }}
              >
                {Object.entries(LANGUAGE_CODE).map(([k, v]) => (
                  <option
                    className="bg-neutral-900 text-white"
                    key={k}
                    value={v}
                  >
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="w-6 h-6 rounded-full border border-[#6C7F3D] flex items-center justify-center text-xs">
          <User2Icon color="#6C7F3D" />
        </div>
      </header>

      {/* Big talk circle */}
      <section className="flex items-center justify-center mt-10 py-12">
        <div className="relative flex items-center justify-center">
          <div className="md:w-[420px] md:h-[420px] w-[220px] h-[220px] rounded-full bg-[#F0F3E9aa]" />
          {/* <div className="absolute rounded-full bg-[#E8EFDC]" /> */}
          <button
            onClick={onStart}
            disabled={isSessionLoading}
            className={`absolute inset-1/2 -translate-x-1/2 transition-all duration-500 cursor-pointer hover:bg-xprimary/90 -translate-y-1/2 md:w-[260px] md:h-[260px] w-[160px] h-[160px] rounded-full ${
              recording ? "scale-105" : "scale-100"
            } ${
              connected
                ? "bg-[linear-gradient(45deg,#065f46,#10b981,#34d399,#6ee7b7,#2dd4bf)] bg-[length:300%_300%] animate-gradientx"
                : "bg-xprimary/80"
            } ${isSessionLoading ? "bg-green" : ""}`}
            style={{
              width: "75%",
              height: "75%",
              transform: `translate(-50%, -50%) scale(${1 + micLevel * 0.4})`,
              left: "50%",
              top: "50%",
              transition: "transform 80ms linear",
              boxShadow: "inset 0 0 20px rgba(108,127,61,0.15)",
            }}
          />
          {!connected ? (
            <span className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 md:text-2xl md:font-bold text-lg font-medium text-black/50 pointer-events-none">
              {isSessionLoading ? "Connecting..." : "Click to Start"}
            </span>
          ) : (
            <span className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-black/50 pointer-events-none">
              {emojis}
            </span>
          )}

          {/* 외곽 파동 링 (isSpeaking일 때만) */}
          {isSpeaking && (
            <>
              <MicPulseRings />
            </>
          )}
        </div>
      </section>

      {/* Control bar */}
      <section className="flex items-center justify-center mt-10 transition-all duration-300">
        {connected && (
          <div className="flex gap-0 items-center bg-white/70 backdrop-blurrounded-2xl border border-[#E9EDD9] shadow-sm rounded-md overflow-hidden">
            {/* Mute/Unmute toggle */}
            <button
              onClick={onToggleMute}
              disabled={!connected && !recording && isSessionLoading}
              className={`px-4 py-2 md:w-32 w-28 md:h-14 h-12 cursor-pointer border text-base flex justify-center items-center gap-3 ${
                recording ? "text-[#6C7F3D]" : "text-[#2D2F26]"
              } hover:bg-[#F5F7EE] border-[#DDE5C2]`}
            >
              {recording ? <Mic /> : <MicOff />}
              {recording ? "Mute" : "Unmute"}
            </button>

            <button
              onClick={connected ? onEnd : () => {}}
              className="px-4 py-2 md:w-32 w-28 md:h-14 h-12 cursor-pointer border text-base flex justify-center items-center gap-3 bg-[#FFF5F5] hover:bg-[#FFECEC] border-[#FFD2D2] text-[#C44141]"
            >
              {connected && (
                <>
                  <span className="w-4 h-4 rounded-sm bg-[#E24D4D] inline-block" />{" "}
                  End call
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {/* Live caption */}
      {(lastSentence || scripting) && (
        <div className="px-4 py-4 border-b border-[#EEF2E0]">
          <div className="text-[13px] text-[#7E8766] mb-1">Speaking</div>
          <div className="text-[15px] whitespace-pre-wrap break-words">
            {lastSentence} {scripting}
          </div>
          {lastTranslation && (
            <div className="mt-2 text-[13px] text-[#7E8766]">
              {lastTranslation}
            </div>
          )}
        </div>
      )}

      {/* Rolling history */}
      <br />
      <br />
      <br />
      <br />
      <br />
      <section className="max-w-3xl mx-auto mt-10 px-4">
        <div className="bg-white rounded-2xl border border-[#E9EDD9] shadow-sm overflow-hidden">
          <div className="px-4 py-3 text-xs uppercase tracking-wide text-[#7E8766] bg-[#F7F9F2]">
            Conversation
            <button
              className="px-3 py-1.5 rounded-lg bg-[#F7F9F2] hover:bg-[#EEF2E0] border border-[#E9EDD9] text-sm"
              onClick={() => {
                setScripting("");
                setLastSentence("");
                setLastTranslation("");
                setMyTranscripts([]);
                setAnswers([]);
              }}
            >
              Clear Messages
            </button>
          </div>

          {/* Past messages: newest first */}
          <div className="overflow-y-auto divide-y divide-[#F0F3E9]">
            {myTranscripts.map((orig, i) => (
              <div
                key={`row_${i}`}
                className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <div>
                  <div className="text-[12px] text-[#7E8766] mb-1">
                    Original
                  </div>
                  <div className="text-[15px] whitespace-pre-wrap break-words">
                    {orig}
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-[#7E8766] mb-1">
                    Translated
                  </div>
                  <div className="text-[15px] whitespace-pre-wrap break-words">
                    {answers[i] ?? "translating…"}
                  </div>
                </div>
              </div>
            ))}
            {myTranscripts.length === 0 && !(lastSentence || scripting) && (
              <div className="px-4 py-10 text-center text-[#9AA27E] text-sm">
                Your conversation will appear here.
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="md:w-[840px] w-[360px] flex flex-col items-center mx-auto mt-10">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full text-sm p-4 rounded-sm border border-[#E9EDD9] shadow-sm"
          rows={10}
        />
        <div
          onClick={sendPrompt}
          className="w-full text-sm text-[#7E8766] p-4 rounded-sm mt-2 bg-[#F7F9F2] border border-[#E9EDD9] shadow-sm cursor-pointer text-center hover:bg-[#EEF2E0]"
        >
          Set prompt
        </div>
      </div>
      <div className="md:w-[840px] w-[360px] flex flex-col items-center mx-auto mt-10">
        <textarea
          placeholder="이름 넣어주세요"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full text-sm p-4 rounded-sm border border-[#E9EDD9] shadow-sm"
          rows={1}
        />
        <div
          onClick={sendUserId}
          className="w-full text-sm text-[#7E8766] p-4 rounded-sm mt-2 bg-[#F7F9F2] border border-[#E9EDD9] shadow-sm cursor-pointer text-center hover:bg-[#EEF2E0]"
        >
          Set My Name
        </div>
      </div>
      <br />
      <br />
      <br />
    </div>
  );
}
