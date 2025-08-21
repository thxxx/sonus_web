import React, { useState, useEffect } from "react";
import Image from "next/image";
import { BottomSheetModal } from "./\bModal";

const Footer = () => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const scrollToPosition = () => {
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const targetPosition = documentHeight - windowHeight - 250;

    window.scrollTo({
      top: targetPosition > 0 ? targetPosition : 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <footer className="w-full bg-black text-white/90">
      {/* subtle top glow */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 pt-14 pb-10">
        {/* top row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-medium tracking-tight">sonus</div>
          </div>

          {/* pill actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:border-white/25 active:scale-[0.99] transition"
            >
              Join
            </button>

            <button
              onClick={async () => {
                await navigator.clipboard.writeText("khj605123@gmail.com");
                setCopied(true);
              }}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:border-white/25 active:scale-[0.99] transition"
            >
              Contact
            </button>
          </div>
        </div>

        {/* middle text */}
        <div className="mt-6 text-sm font-light text-white/60">
          State-of-the-art realtime interpreter coming soon.
        </div>

        <div className="mt-3 text-xs text-white/40">Delaware 19808</div>
      </div>

      {/* toast */}
      <div
        className={`pointer-events-none fixed left-1/2 bottom-8 -translate-x-1/2 transition-all duration-300 ${
          copied ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <div className="rounded-full bg-white/10 backdrop-blur px-4 py-2 text-sm text-white/90 border border-white/15 shadow-lg">
          Email copied to clipboard
        </div>
      </div>

      <BottomSheetModal open={open} onClose={() => setOpen(false)} />
    </footer>
  );
};

export default Footer;
