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
    <footer className="w-full bg-xmain text-opp/90">
      {/* subtle top glow */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 pt-14 pb-10">
        {/* top row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-row items-center gap-1">
            <Image
              src="/images/logo.png"
              alt="starlight"
              width={28}
              height={28}
              className="mt-1"
            />
            <div className="text-2xl font-medium tracking-tight">sonus</div>
          </div>

          {/* pill actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-2xl border border-xopp/15 bg-xopp/5 px-4 py-2 text-sm font-medium text-opp/90 hover:bg-xopp/10 hover:border-xopp/25 active:scale-[0.99] transition"
            >
              Join
            </button>

            <button
              onClick={async () => {
                await navigator.clipboard.writeText("khj@asksonus.com");
                setCopied(true);
              }}
              className="rounded-2xl border border-xopp/15 bg-xopp/5 px-4 py-2 text-sm font-medium text-opp/90 hover:bg-xopp/10 hover:border-xopp/25 active:scale-[0.99] transition"
            >
              Contact
            </button>
          </div>
        </div>

        {/* middle text */}
        <div className="mt-6 text-sm font-light text-opp/60">
          State-of-the-art realtime interpreter coming soon.
        </div>

        <div className="mt-3 text-xs text-opp/40">Delaware 19808</div>
      </div>

      {/* toast */}
      <div
        className={`pointer-events-none fixed left-1/2 bottom-8 -translate-x-1/2 transition-all duration-300 ${
          copied ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <div className="rounded-full bg-xopp/10 backdrop-blur px-4 py-2 text-sm text-opp/90 border border-xopp/15 shadow-lg">
          Email copied to clipboard
        </div>
      </div>

      <BottomSheetModal open={open} onClose={() => setOpen(false)} />
    </footer>
  );
};

export default Footer;
