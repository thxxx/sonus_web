import React, { useCallback, useEffect, useRef, useState } from "react";
import "../globals.css";
import "../styles/radix.css";
import { LANGUAGE_CODE, StreamingAudioPlayer, TARGET_SR } from "@/utils/audio";
import { Mic, MicOff, User2Icon } from "lucide-react";
import Image from "next/image";
import { MicPulseRings } from "@/components/audio/MicPulseRing";
import ConversationHistory from "@/components/ConversationHistory";
import Footer from "@/components/landing/Footer";
import { BottomSheetModal } from "@/components/landing/\bModal";

const AGENT_NAME = "Maya";

export default function WebRealtimeTranscriber() {
  const [recording, setRecording] = useState(false);
  const [connected, setConnected] = useState(false);
  const [languageCode, setLanguageCode] = useState<LANGUAGE_CODE>(
    LANGUAGE_CODE.English
  );
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [scripting, setScripting] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [responses, setResponses] = useState<
    {
      type: "user" | "maya";
      text: string;
    }[]
  >([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const [minutes, setMinutes] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);

  useEffect(() => {
    // tick every 1000ms
    const id = setInterval(() => {
      setSeconds((prevSec) => {
        // if seconds < 59, just +1
        if (prevSec < 59) {
          return prevSec + 1;
        }

        // if seconds was 59 -> roll over to 0 and bump minutes
        setMinutes((prevMin) => prevMin + 1);
        return 0;
      });
    }, 1000);

    // cleanup on unmount
    return () => clearInterval(id);
  }, []);

  // optional: format like 02:07
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return (
    <div className="min-h-screen w-full bg-[#F9FAF7] text-[#2D2F26]">
      <header className="flex items-start justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <Image src="/images/logo.png" alt="Sonus" width={32} height={32} />
        </div>
        <div className="text-center">
          <div className="text-2xl tracking-tight">
            {AGENT_NAME} {mm}:{ss}
          </div>
          <div className="text-xs text-[#7E8766]">by Sonus</div>

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
            onClick={() => setOpen(true)}
            className={`absolute inset-1/2 -translate-x-1/2 transition-all cursor-pointer hover:bg-xprimary/90 -translate-y-1/2 md:w-[260px] md:h-[260px] w-[160px] h-[160px] rounded-full ${
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
              {isSessionLoading ? "Connecting..." : "Click to join"}
            </span>
          ) : (
            <span className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-black/50 pointer-events-none"></span>
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
              disabled={!connected && !recording && isSessionLoading}
              className={`px-4 py-2 md:w-32 w-28 md:h-14 h-12 cursor-pointer border text-base flex justify-center items-center gap-3 ${
                recording ? "text-[#6C7F3D]" : "text-[#2D2F26]"
              } hover:bg-[#F5F7EE] border-[#DDE5C2]`}
            >
              {recording ? <Mic /> : <MicOff />}
              {recording ? "Mute" : "Unmute"}
            </button>

            <button className="px-4 py-2 md:w-32 w-28 md:h-14 h-12 cursor-pointer border text-base flex justify-center items-center gap-3 bg-[#FFF5F5] hover:bg-[#FFECEC] border-[#FFD2D2] text-[#C44141]">
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

      {scripting && (
        <div className="px-4 py-4 border-b border-[#EEF2E0]">
          <div className="text-[13px] text-[#7E8766] mb-1">Speaking</div>
          <div className="text-[15px] whitespace-pre-wrap break-words">
            {scripting}
          </div>
        </div>
      )}

      {/* Rolling history */}
      <br />
      <br />
      <br />
      <br />
      <br />
      <ConversationHistory responses={[]} scripting={scripting} />
      <div className="w-full max-w-xl justify-center items-center mx-auto mt-10"></div>

      <div className="w-full max-w-xl justify-center items-center mx-auto mt-10 rounded-2xl bg-white shadow-md border border-zinc-100 p-6">
        <label className="mt-4 block cursor-pointer border-2 border-dashed border-zinc-300 hover:border-zinc-400 transition rounded-xl p-6 text-center">
          <input
            type="file"
            accept="audio/*,.wav,.mp3,.m4a,.flac,.ogg"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="text-zinc-600">
            {file ? (
              <>
                <div className="text-sm font-medium">{file.name}</div>
                <div className="text-xs text-zinc-500">
                  {Math.round((file.size / 1024 / 1024) * 100) / 100} MB
                </div>
              </>
            ) : (
              <>
                <div className="text-sm">Click to choose an audio file</div>
                <div className="text-xs text-zinc-500">
                  WAV/MP3/M4A/FLAC/OGG…
                </div>
              </>
            )}
          </div>
        </label>

        <button
          disabled={!file || loading}
          className="mt-4 w-full rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 font-medium text-center"
        >
          {loading ? "Uploading…" : "Upload"}
        </button>
      </div>
      <br />
      <br />
      <br />
      <div className="py-16" />
      <BottomSheetModal open={open} onClose={() => setOpen(false)} />

      <div className="text-center w-full flex flex-col py-20 justify-center items-center px-4 text-black/90">
        <div>I will let you know when the code is open.</div>
        <div>
          If you have any feedback, please contact at khj605123@gmail.com
        </div>

        <div className="mt-4 md:w-[70%] w-full">
          <div>Question : What are you going to do with the waitlist?</div>
          <div>
            Answer : Nothing, I just need time to refine codes. The reason I’m
            opensourcing the code is that my friend and I originally planned to
            build a product together, but after deciding to pivot, we thought
            we’d at least share what we’ve done so far with the community.
          </div>
        </div>
      </div>
    </div>
  );
}
