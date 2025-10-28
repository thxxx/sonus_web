import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeftRight, Play, Square, Volume2 } from "lucide-react";
import Image from "next/image";

/** 간단한 오디오 플레이 버튼: audioSrc 없으면 WebAudio로 톤 합성 */
function AudioButton({
  audioSrc,
  label = "Play Audio",
  className = "",
  toneHz = 880,
  toneDurationMs = 700,
}: {
  audioSrc?: string;
  label?: string;
  className?: string;
  toneHz?: number;
  toneDurationMs?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopTone = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
      } catch {}
      oscRef.current.disconnect();
      oscRef.current = null;
    }
    if (gainRef.current) {
      gainRef.current.disconnect();
      gainRef.current = null;
    }
    if (ctxRef.current) {
      // context는 유지 (사용자 연속 클릭 대비)
    }
    setPlaying(false);
  }, []);

  const playTone = useCallback(async () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    const ctx = ctxRef.current!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = toneHz;
    gain.gain.value = 0.0001;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    // Attack -> Hold -> Release
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(
      0.18,
      now + toneDurationMs / 1000 - 0.08
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + toneDurationMs / 1000);

    osc.start();
    oscRef.current = osc;
    gainRef.current = gain;

    setPlaying(true);

    timerRef.current = window.setTimeout(() => {
      stopTone();
    }, toneDurationMs);
  }, [toneDurationMs, toneHz, stopTone]);

  const stopAll = useCallback(() => {
    // HTMLAudio 정지
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // Tone 정지
    stopTone();
    setPlaying(false);
  }, [stopTone]);

  const onClick = useCallback(async () => {
    if (playing) {
      stopAll();
      return;
    }
    if (audioSrc) {
      // HTML5 <audio>
      if (!audioRef.current) {
        const a = new Audio(audioSrc);
        a.addEventListener("ended", () => setPlaying(false));
        a.addEventListener("pause", () => setPlaying(false));
        audioRef.current = a;
      }
      setPlaying(true);
      try {
        await audioRef.current!.play();
      } catch {
        setPlaying(false);
      }
    } else {
      // 합성 톤
      await playTone();
    }
  }, [audioSrc, playTone, playing, stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
        "bg-white text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100",
        "shadow-sm transition-colors",
        className,
      ].join(" ")}
      aria-pressed={playing}
    >
      {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {label}
    </button>
  );
}

/** 작은 점선 웨이브 스켈레톤 */
function WaveSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "h-10 w-full rounded-md border border-zinc-200 bg-gradient-to-b from-white to-zinc-50",
        "flex items-center justify-center",
        className,
      ].join(" ")}
    >
      <div className="flex gap-1 px-2">
        {Array.from({ length: 16 }).map((_, i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-zinc-300"
            style={{
              opacity: 0.5 + 0.5 * Math.sin(i),
              transform: `scale(${0.9 + 0.1 * Math.cos(i)})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Voice Similarity 막대 */
function SimilarityBar({ value }: { value: number }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs text-zinc-500">Voice Similarity</div>
      <div className="h-2 w-full rounded-full bg-zinc-200">
        <div
          className="h-2 rounded-full bg-zinc-400"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

/** 카드 공통 */
function Card({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={[
        "rounded-xl border border-zinc-200 bg-white shadow-sm p-6",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default function TranslationCompareDemo() {
  // const originalText = `\"Can we schedule the meeting for next Tuesday at 3 PM? I think it would work better for everyone.\"`;
  const originalText = `\"Hay un autobús cerca, pero te recomendaría alquilar un coche para que puedas visitar la naturaleza y disfrutarla.\"`;

  // const koText = `\"다음 주 화요일 오후 3시에 회의 일정을 잡을 수 있을까요? 모든 분들께 더 좋을 것 같아요.\"`;
  const koText = `\"There's a bus nearby, but I would recommend renting a car so you can visit the nature and enjoy it.\"`;

  const audioRef = useRef<HTMLAudioElement | null>(null);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-4">
      {/* Original Header */}
      <Card className="bg-blue-100/50">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-blue-100">
            <Volume2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-col justify-center items-start">
              <span className="font-semibold">Original (Spanish)</span>
              <span className="text-xs text-zinc-500">
                Business professional · Natural speaking voice
              </span>
            </div>
          </div>
          {/* 요구사항: Original에 Play Audio 버튼 */}
          <AudioButton
            audioSrc="/audios/spain.mp3" // 실제 파일 있으면 여기에 경로 입력
            label="Play Audio"
          />
        </div>
        <div className="mt-4 text-lg italic text-gray-900">{originalText}</div>
      </Card>

      {/* Two columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Sonus */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-white shadow-sm flex items-center justify-center">
                  <Image
                    src="/images/logo.png"
                    alt="Google"
                    width={40}
                    height={40}
                  />
                </div>
                <div>
                  <div className="font-semibold text-lg">Sonus</div>
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-zinc-500">
              <div className="font-semibold text-zinc-900">23+</div>
              <div className="flex flex-row items-center gap-1">Languages</div>
            </div>
          </div>

          {/* <WaveSkeleton className="mt-3" /> */}

          <div className="mt-6 rounded-lg bg-zinc-50 p-4">
            <div className="text-gray-600 text-[14px]">{koText}</div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-xs text-emerald-600">
                ● <span>Your own voice</span>
              </span>
              <AudioButton label="Play Audio" audioSrc="/audios/eng.mp3" />
            </div>
          </div>
          {/* <SimilarityBar value={0} /> */}
        </Card>

        {/* Google Translate */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg flex items-center justify-center bg-blue-50">
                  <Image
                    src="/images/google.svg"
                    alt="Google"
                    width={28}
                    height={28}
                  />
                </div>
                <div>
                  <div className="font-semibold text-lg">Google Translate</div>
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-zinc-500">
              <div className="font-semibold text-zinc-900">Only</div>
              <div className="flex flex-row items-center gap-1">
                <span>English</span> <ArrowLeftRight size={14} />{" "}
                <span>Spanish</span>
              </div>
            </div>
          </div>

          {/* <WaveSkeleton className="mt-3" /> */}

          <div className="mt-6 rounded-lg bg-zinc-50 p-4">
            <div className="text-gray-600 text-[14px]">{koText}</div>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-xs text-orange-600">
                ● <span>Synthetic voice · No personality</span>
              </span>
              <AudioButton
                label="Play Audio"
                toneHz={520}
                audioSrc="/audios/google_cut.wav"
              />
            </div>
          </div>

          {/* <SimilarityBar value={12} /> */}
        </Card>
      </div>
    </div>
  );
}
