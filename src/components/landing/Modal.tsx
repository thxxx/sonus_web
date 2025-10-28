"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { log } from "@/utils/log";
import { supabase } from "@/utils/supabase";

export function BottomSheetModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // 이메일 수집 시 처리 (API 연결 지점)
  const onSubmit = async (email: string) => {
    if (!email) return;

    try {
      // await log("is_join");
      const body = {
        email: email,
      };
      const res = await supabase.from("waitlist").insert(body);
    } catch {
      console.log("Error : ", email);
    }
  };

  // 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Escape로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const validateEmail = (s: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

  const handleSubmit = async () => {
    if (!validateEmail(email)) {
      alert("Please enter a valid email.");
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit(email.trim());
      setEmail("");
      onClose();
      alert("Thanks! We’ll keep you posted.");
    } catch (e) {
      console.error(e);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const content = (
    <div
      className="fixed inset-0 z-50"
      aria-modal="true"
      role="dialog"
      aria-label="Join waitlist"
    >
      {/* dimmed backdrop */}
      <button
        className="absolute inset-0 bg-xopp/20"
        onClick={onClose}
        aria-label="Close"
      />
      {/* bottom sheet */}
      <div
        ref={sheetRef}
        className="absolute left-0 right-0 bottom-0 mx-auto w-full max-w-lg rounded-lg bg-xmain shadow-2xl
                  translate-y-0 animate-[slideUp_420ms_ease-out] overflow-hidden"
      >
        <div className="p-5">
          <div className="mb-2 font-semibold"></div>
          {/* 입력 */}
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-xopp/10 bg-xmain px-4 py-3 text-xopp placeholder-black/40
                       focus:outline-none focus:ring-black/20"
            autoFocus
          />

          {/* 버튼들 */}
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-xopp/60 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-xopp text-xmain disabled:opacity-90 cursor-pointer"
            >
              {submitting ? "Submitting" : "Submit"}
            </button>
          </div>
        </div>
      </div>

      {/* keyframes (Tailwind arbitrary) */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(16px);
            opacity: 0.8;
          }
          to {
            transform: translateY(0px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );

  // Portal로 body에 렌더 (레이어 이슈 방지)
  return typeof window !== "undefined"
    ? createPortal(content, document.body)
    : null;
}
