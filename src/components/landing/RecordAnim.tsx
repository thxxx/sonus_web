import React, { useEffect, useState } from "react";
import { Settings, Trash2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// Visual-only replica of the toolbar UI. No behavior.

type Option = { label: string; value: string };

const languageOptions: Option[] = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Arabic", value: "ar" },
  { label: "Danish", value: "da" },
  { label: "Greek", value: "el" },
  { label: "English", value: "en" },
  { label: "Italian", value: "it" },
  { label: "Japanese", value: "ja" },
  { label: "Korean", value: "ko" },
  { label: "Swedish", value: "sv" },
  { label: "Spanish", value: "es" },
  { label: "Finnish", value: "fi" },
  { label: "Hebrew", value: "he" },
  { label: "Hindi", value: "hi" },
  { label: "Malay", value: "ms" },
  { label: "Dutch", value: "nl" },
  { label: "Norwegian", value: "no" },
  { label: "Polish", value: "pl" },
  { label: "Portuguese", value: "pt" },
  { label: "Russian", value: "ru" },
  { label: "Swahili", value: "sw" },
  { label: "Turkish", value: "tr" },
  { label: "Chinese", value: "zh" },
];

function LabeledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <label className="min-w-[130px] relative inline-flex items-center gap-1.5 rounded-md border border-zinc-100 bg-gray-100/50 px-2 py-2 text-zinc-700 shadow-sm">
      <span className="text-sm text-zinc-500 select-none">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="peer w-[140px] appearance-none bg-transparent text-sm font-medium outline-none text-black"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-zinc-400 peer-focus:text-zinc-600" />
    </label>
  );
}

/** Start/Stop가 일정 간격으로 번갈아가며 나타나는 버튼 */
function SwapButtons({ intervalMs = 1600 }: { intervalMs?: number }) {
  const [showStart, setShowStart] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setShowStart((s) => !s), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  const commonMotion = {
    initial: { opacity: 0.5, y: 4 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0.5, y: -4 },
    transition: { duration: 0.2, ease: "easeInOut" as const },
  };

  return (
    // 고정 크기 래퍼로 레이아웃 흔들림 방지
    <div className="relative w-[100px] h-10">
      <AnimatePresence mode="wait">
        {showStart ? (
          <motion.div
            key="start"
            {...commonMotion}
            className="absolute inset-0 flex items-center justify-center transition-all duration-150 hover:scale-95 rounded-full bg-black px-4 text-[15px] text-white select-none"
          >
            <span>Start</span>
            <span className="ml-2 h-2 w-2 rounded-full bg-red-500" />
          </motion.div>
        ) : (
          <motion.div
            key="stop"
            {...commonMotion}
            className="absolute inset-0 flex items-center justify-center transition-all duration-150 hover:scale-95 rounded-full bg-red-500 outline outline-red-500 px-4 text-[15px] text-white select-none border-2 border-white"
          >
            <span>Stop</span>
            <span className="ml-2 h-2 w-2 rounded-full bg-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TranslationToolbarMock() {
  const [from, setFrom] = useState("zh");
  const [to, setTo] = useState("en");

  return (
    <div className="w-full flex items-center justify-center p-4 gap-2 relative">
      {/* Start/Stop 교대 애니메이션 */}
      <SwapButtons intervalMs={3600} />

      {/* From select */}
      <LabeledSelect
        label="From:"
        value={from}
        options={languageOptions}
        onChange={(e) => setFrom(e.target.value)}
      />

      {/* To select */}
      <LabeledSelect
        label="To:"
        value={to}
        options={languageOptions}
        onChange={(e) => setTo(e.target.value)}
      />
      <div className="absolute left-1 top-20 hidden md:flex">
        <Image src="/images/select.svg" alt="mic" width={180} height={64} />
      </div>

      {/* Spacer */}
      <div className="hidden md:flex items-center justify-center gap-1">
        <div className="mx-1 h-6 w-px bg-zinc-200" />

        {/* Settings button */}
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-gray-100 text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100 shadow-sm"
          aria-label="Settings"
        >
          <Settings className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
