import React, { useEffect, useMemo } from "react";
import { motion, useAnimation } from "framer-motion";
import Image from "next/image";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function StarlightDriftBackground({
  children,
  className = "",
  starCount = 120,
  seed = 7,
  drift = 48, // px travel distance per loop
  minDuration = 6,
  maxDuration = 14,
}: {
  children?: React.ReactNode;
  className?: string;
  starCount?: number;
  seed?: number;
  drift?: number;
  minDuration?: number;
  maxDuration?: number;
}) {
  const rnd = useMemo(() => mulberry32(seed), [seed]);

  const stars = useMemo(() => {
    const arr: {
      x: number;
      y: number;
      size: number;
      delay: number;
      duration: number;
      opacity: number;
    }[] = [];
    for (let i = 0; i < starCount; i++) {
      const x = rnd() * 100; // vw%
      const y = rnd() * 100; // vh%
      const size = 1 + Math.floor(rnd() * 2); // 1~2 px
      const delay = rnd() * 4; // s
      const duration = minDuration + rnd() * (maxDuration - minDuration);
      const opacity = 0.5 + rnd() * 0.5; // 0.5~1.0
      arr.push({ x, y, size, delay, duration, opacity });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starCount, seed, minDuration, maxDuration]);

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      {/* Content layer */}
      <div className="relative z-10">{children}</div>

      {/* Night-sky gradient for contrast */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,6,23,1)_0%,rgba(3,7,18,1)_60%,rgba(2,6,23,1)_100%)]" />

      {/* Stars */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {stars.map((s, i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute rounded-full"
            style={{
              top: `${s.y}vh`,
              left: `${s.x}vw`,
              width: s.size,
              height: s.size,
              background:
                "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 40%, rgba(255,255,255,0.1) 100%)",
              opacity: s.opacity,
              filter: "drop-shadow(0 0 6px rgba(255,255,255,0.35))",
            }}
            initial={{ y: 0 }}
            animate={{ y: [0, -drift, 0] }}
            transition={{
              delay: s.delay,
              duration: s.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Slow parallax haze */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60%_40%_at_50%_70%, rgba(255,255,255,0.05), transparent 60%)",
        }}
        initial={{ opacity: 0.25 }}
        animate={{ opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/** CTA 섹션 배경: 오로라 + 그리드 쉐이더 + 중앙 글로우 */
export default function CtaBand({
  title = "Ready to put AI to work?",
  subtitle = "Request a demo and see how Sonus' secure and private voice platform can unlock productivity for your business.",
  cta = "Join the Waitlist",
  onClick,
}: {
  title?: string;
  subtitle?: string;
  cta?: string;
  onClick?: () => void;
}) {
  return (
    <section
      className={`relative isolate overflow-hidden text-white mt-[20vh] min-h-[25vh]`}
    >
      <div className="pointer-events-none absolute inset-0" />

      {/* Content */}
      <div className="relative mx-auto max-w-6xl p-4 text-center rounded-lg bg-[url('/images/green7.png')] bg-cover">
        <div className="py-16 md:py-32">
          <h2 className="text-xl font-bold tracking-[-0.02em] md:text-3xl">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed md:text-xl">
            {subtitle}
          </p>
          <button
            onClick={onClick}
            className="cursor-pointer mx-auto mt-8 inline-flex items-center rounded-xl bg-white/95 px-6 py-3 text-base font-semibold text-[#1f5d4e] shadow-lg ring-1 ring-black/5 transition
          active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {cta}
          </button>
        </div>
      </div>
    </section>
  );
}
