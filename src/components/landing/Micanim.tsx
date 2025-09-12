/* eslint-disable react/jsx-no-undef */
import React, { useEffect, useState } from "react";
import { Check, ChevronUp } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function MicSelectorMock() {
  // --- Animation timeline config (ms) ---
  const OPEN_DELAY = 900; // 처음 닫힌 채로 있다가 열리는 시간
  const HOVER_DELAY = 1150; // 열리고 나서 2번째 항목 강조까지 딜레이
  const HOVER_DURATION = 4200; // 2번째 항목 강조 유지 시간
  const RESTART_DELAY = 1000; // 닫힌 뒤 다음 사이클까지 대기

  const [open, setOpen] = useState(false); // 처음엔 닫힘
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [showSecondCheck, setShowSecondCheck] = useState(false);
  const [cycle, setCycle] = useState(0); // 반복 트리거용 카운터

  // 사이클: closed -> open -> highlight(2nd & check-in) -> close -> repeat
  useEffect(() => {
    const t1 = setTimeout(() => setOpen(true), OPEN_DELAY);
    const t2 = setTimeout(() => {
      setHighlightIndex(1);
      setShowSecondCheck(true); // 체크 애니메이션 시작
    }, OPEN_DELAY + HOVER_DELAY);
    const t3 = setTimeout(() => {
      setOpen(false);
      setHighlightIndex(null);
      setShowSecondCheck(false); // 다음 사이클을 위해 초기화
    }, OPEN_DELAY + HOVER_DELAY + HOVER_DURATION);
    const t4 = setTimeout(
      () => setCycle((c) => c + 1),
      OPEN_DELAY + HOVER_DELAY + HOVER_DURATION + RESTART_DELAY
    );

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [cycle]);

  const items = [
    {
      label: "Same as system (MacBook Pro Microphone)",
      selected: true,
    },
    { label: "Sonus Virtual Microphone", selected: false },
  ];

  // 체크 표시 로직: 기본은 1번 항목(0번 인덱스), 강조 시에는 2번 항목(1번 인덱스)
  const isChecked = (idx: number) => (showSecondCheck ? idx === 1 : idx === 0);

  return (
    <div className="bg-black h-[220px] rounded-xl pb-4 pl-12 overflow-hidden">
      {/* Bottom control bar */}
      <div className="w-full flex justify-end items-end h-full ring-1 ring-[#242424] bg-[#242424] rounded-bl-xl backdrop-blur-md">
        <div className="w-full flex items-center gap-3 px-1 pb-1 pt-4 rounded-bl-xl bg-[#141619]">
          {/* Audio button */}
          <div className="relative">
            <IconWrap
              text="Audio"
              active={open} // 드롭다운 열렸을 때 hover 컬러 고정
              icon={
                <Image src="/images/mic.svg" alt="mic" width={24} height={32} />
              }
            />

            {/* Dropdown / Popover */}
            <AnimatePresence>
              {open && (
                <motion.div
                  key="dropdown"
                  initial={{ opacity: 0, scale: 0.98, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 4 }}
                  transition={{ duration: 0.16, ease: "easeInOut" }}
                  className="bg-[#161616] text-gray-300/90 absolute bottom-[64px] left-[72px] w-[380px] rounded-[8px] shadow-2xl ring-1 ring-gray-500/10 overflow-hidden"
                >
                  <div className="px-2 pt-3 pb-1 font-medium text-[#F5F5F5] text-[14px]">
                    Select a microphone
                  </div>
                  <ul className="py-1">
                    {items.map((it, i) => {
                      const forcedHover = i === highlightIndex;
                      return (
                        <li key={i}>
                          <button
                            className={[
                              "flex w-full items-center justify-center gap-0 px-1 py-1.5 text-left focus:outline-none transition-colors duration-200",
                              "hover:bg-[#0F71EB] hover:text-[#F5F5F5]",
                              forcedHover ? "bg-[#0F71EB] text-[#F5F5F5]" : "",
                            ].join(" ")}
                          >
                            <span className="h-6 w-6 inline-flex items-center justify-start pl-1">
                              <AnimatePresence mode="wait" initial={false}>
                                {isChecked(i) ? (
                                  <motion.span
                                    key={`check-${i}`}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 500,
                                      damping: 30,
                                      mass: 0.5,
                                    }}
                                    className="inline-flex"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </motion.span>
                                ) : (
                                  <motion.span
                                    key={`empty-${i}`}
                                    className="inline-block h-3.5 w-3.5"
                                  />
                                )}
                              </AnimatePresence>
                            </span>
                            <span className="flex-1">
                              <span className="block text-[14px] font-medium">
                                {it.label}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <IconWrap
            text="Video"
            icon={
              <Image src="/images/cam.png" alt="cam" width={36} height={36} />
            }
          />
          <div />
          <IconWrap
            text="Participants"
            icon={
              <Image src="/images/part.png" alt="cam" width={36} height={36} />
            }
          />
          <IconWrap
            text="Chat"
            icon={
              <Image
                src="/images/message.png"
                alt="message"
                width={36}
                height={36}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}

const IconWrap = ({
  text,
  icon,
  active = false,
}: {
  text: string;
  icon: React.ReactNode;
  active?: boolean;
}) => {
  return (
    <span
      className={[
        "flex h-[58px] relative w-[94px] flex-col items-center justify-end pt-1 py-0.5 rounded-lg gap-[3px]",
        active ? "bg-[#5B5C5E]" : "", // 드롭다운 열리면 hover 색상 고정
      ].join(" ")}
    >
      {icon}
      <span className="text-[13px] font-medium text-[#CCCCCD] pb-0.5">
        {text}
      </span>
      <ChevronUp className="h-4 w-4 absolute right-2 top-2.5" color="white" />
    </span>
  );
};
