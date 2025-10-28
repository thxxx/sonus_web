import React, { useEffect, useMemo, useState } from "react";

export function WordFill({
  text,
  groupSize = 1,
  intervalMs = 220,
  pauseMsAtEnd = 5000,
  startDelayMs = 0,
  className,
}: {
  text: string;
  groupSize?: number;
  intervalMs?: number;
  pauseMsAtEnd?: number; // 완료 후 쉬는 시간
  startDelayMs?: number; // 첫 단어 등장 전 지연
  className?: string;
}) {
  const words = useMemo(() => text.trim().split(/\s+/), [text]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimer: any;
    let tickTimer: any;
    let pauseTimer: any;

    // 한 사이클 시작
    const startCycle = () => {
      startTimer = setTimeout(() => {
        tickTimer = setInterval(() => {
          setCount((c) => {
            const next = Math.min(words.length, c + groupSize);
            if (next >= words.length) {
              clearInterval(tickTimer);
              // 완료 후 휴식
              pauseTimer = setTimeout(() => {
                setCount(0); // 리셋
                startCycle(); // 다음 사이클
              }, pauseMsAtEnd);
            }
            return next;
          });
        }, intervalMs);
      }, startDelayMs);
    };

    setCount(0);
    startCycle();

    return () => {
      clearTimeout(startTimer);
      clearInterval(tickTimer);
      clearTimeout(pauseTimer);
    };
  }, [text, groupSize, intervalMs, pauseMsAtEnd, startDelayMs, words.length]);

  const n = Math.min(count, words.length);
  const lastStart = Math.max(0, n - groupSize);
  const firstPart = words.slice(0, lastStart).join(" ");
  const lastPart = words.slice(lastStart, n).join(" ");
  const remaining = words.slice(n).join(" ");

  return (
    <div className={className}>
      {firstPart && <span>{firstPart} </span>}
      {lastPart && (
        <span className="inline-block animate-[wordIn_180ms_ease-out]">
          {lastPart}
        </span>
      )}
      {/* 레이아웃 유지용 (원치 않으면 제거) */}
      {remaining && <span className="opacity-0"> {remaining}</span>}

      {/* 전역 키프레임 (원하면 globals.css나 tailwind.config로 이동) */}
      <style jsx global>{`
        @keyframes wordIn {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
