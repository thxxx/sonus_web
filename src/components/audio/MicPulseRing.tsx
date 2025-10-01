import React, { useMemo } from "react";

/**
 * 자연스러운 리플: 서로 다른 지속시간/지연/스케일을 가진 링을 겹쳐서 사용
 * size: 링의 기본 지름(px), count: 링 개수
 */
export function MicPulseRings({ size = 180, count = 4 }) {
  // 첫 마운트 시 랜덤 파라미터 고정
  const rings = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const dur = 900 + Math.random() * 800; // 0.9s ~ 1.7s
      const delay = -Math.random() * dur; // 음수 지연으로 중첩 시작
      const scaleEnd = 1.25 + Math.random() * 0.7; // 1.25 ~ 1.95
      const opacity = 0.38 + Math.random() * 0.22; // 0.38 ~ 0.6
      const blur = Math.random() < 0.5 ? 0 : 1 + Math.random() * 1.5; // 가끔만 흐림
      const soft = Math.random() < 0.5; // 절반은 soft 텍스처

      return {
        key: `ring-${i}`,
        className: `ring-center ${
          soft ? "animate-ripple-soft" : "animate-ripple"
        }`,
        style: {
          // CSS 변수로 주입
          ["--dur" as any]: `${dur}ms`,
          ["--delay" as any]: `${delay}ms`,
          ["--scale-start" as any]: 1,
          ["--scale-end" as any]: scaleEnd,
          ["--opacity" as any]: opacity,
          ["--blur" as any]: `${blur}px`,
        },
      };
    });
  }, [count]);

  return (
    <div
      className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ width: size, height: size }}
    >
      {/* 랜덤 파라미터 링 */}
      {rings.map(({ key, className, style }) => (
        <div
          key={key}
          className={className}
          style={{
            ...style,
            width: size,
            height: size,
          }}
        />
      ))}
    </div>
  );
}
