import React from "react";
import { Mic, MicOff } from "lucide-react";

export type MicState = "disconnected" | "idle" | "recording" | "loading";

export default function MicCaptureButton({
  state = "recording",
  label = "Push to Speak",
  sublabel = "Translate your voice",
}: {
  state?: MicState;
  label?: string;
  sublabel?: string;
}) {
  const isRecording = state === "recording";
  const isLoading = state === "loading";
  const isDisconnected = state === "disconnected";

  return (
    <>
      <button
        disabled={isLoading}
        aria-pressed={isRecording}
        aria-busy={isLoading}
        className={[
          "relative inline-flex items-center gap-3 px-4 py-3 rounded-2xl",
          "border border-[rgba(24,24,27,0.12)]",
          "bg-[rgba(255,255,255,0.7)] backdrop-saturate-[180%] backdrop-blur-[6px]",
          "shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
          "text-[#0a0a0a] text-left",
          "transition-[border-color,transform,box-shadow] duration-160 ease-linear",
          "hover:border-[rgba(24,24,27,0.18)]",
          "active:scale-[0.99]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          isRecording ? "border-[rgba(125,211,252,0.6)]" : "",
        ].join(" ")}
      >
        {/* recording일 때 배경 펄스 */}
        {isRecording && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl bg-[rgba(191,219,254,0.35)] animate-[pulseSoft_1.8s_ease-in-out_infinite]"
          />
        )}

        {/* 아이콘 랩 */}
        <span
          aria-hidden
          className={[
            "inline-flex items-center justify-center w-9 h-9 rounded-full border",
            isRecording
              ? "border-[rgba(125,211,252,0.8)] bg-[rgba(224,242,254,0.9)]"
              : "border-[rgba(24,24,27,0.12)] bg-[rgba(244,244,245,0.9)]",
          ].join(" ")}
        >
          {isDisconnected ? <MicOff size={20} /> : <Mic size={20} />}
        </span>

        {/* 텍스트 */}
        <span className="flex flex-col min-w-0">
          <span className="text-[0.95rem] font-semibold leading-none">
            {isDisconnected
              ? "Not Ready"
              : isLoading
              ? "Preparing…"
              : isRecording
              ? "Listening"
              : label}
          </span>
          <span className="mt-1 text-[0.76rem] text-[rgba(113,113,122,0.95)] whitespace-nowrap overflow-hidden text-ellipsis">
            {isRecording ? "Your voice is being translated" : sublabel}
          </span>
        </span>

        {/* 레벨 바(녹음 중일 때만) */}
        {isRecording && (
          <span
            className="inline-flex items-end gap-[3px] ml-1 w-6 h-5"
            aria-hidden
          >
            {[0, 1, 2, 3].map((i) => (
              <i
                key={i}
                className="block w-[3px] rounded-[2px] bg-[rgba(99,102,241,0.45)] animate-[barUpDown_900ms_ease-in-out_infinite]"
                style={{ height: "20%", animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
        )}
      </button>

      {/* 커스텀 키프레임 (원하면 globals.css로 이동) */}
      <style jsx global>{`
        @keyframes pulseSoft {
          0% {
            opacity: 0.55;
            transform: scale(1);
          }
          70% {
            opacity: 0.25;
            transform: scale(1.01);
          }
          100% {
            opacity: 0.55;
            transform: scale(1);
          }
        }
        @keyframes barUpDown {
          0% {
            height: 20%;
          }
          50% {
            height: 90%;
          }
          100% {
            height: 20%;
          }
        }
      `}</style>
    </>
  );
}
