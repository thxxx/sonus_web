import React, { useEffect, useState } from "react";
import Head from "next/head";
import { Analytics } from "@vercel/analytics/react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { isMobile } from "react-device-detect";
import Header from "@/components/landing/Header";
import SectionLayout from "@/components/landing/SectionLayout";
import Title from "@/components/landing/Title";
import Footer from "@/components/landing/Footer";
import "../globals.css";
import "../styles/radix.css";
import { BottomSheetModal } from "@/components/landing/\bModal";

// ————————————————————————————————————————————————————————
// Animated hero that:
// 1) Starts as a black screen
// 2) Shows the video as a thin horizontal line at center
// 3) Expands vertically into a square
// 4) Slides the square slightly upward and reveals the rest of the content
// ————————————————————————————————————————————————————————

export default function Home() {
  const heroControls = useAnimation();
  const pageControls = useAnimation();
  const headerControls = useAnimation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      // Sequence the intro animation
      // Phase 0: black screen is visible, hero is a thin horizontal line
      await heroControls.start({
        opacity: 1,
        transition: { duration: 0.2 },
      });

      // Phase 1: grow vertically from a line to a square
      await heroControls.start({
        height: isMobile ? "70vw" : "320px", // keep width fixed, grow height
        transition: { duration: 1.6, ease: [0.22, 1, 0.36, 1] },
      });

      // Phase 2: move the square upward, shrink slightly, round corners more
      await heroControls.start({
        y: isMobile ? -40 : -80,
        width: isMobile ? "70vw" : "400px",
        height: isMobile ? "70vw" : "320px",
        borderRadius: 24,
        transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
      });

      // Reveal header + hero text & CTA with a soft fade + up
      headerControls.start({ opacity: 1, y: 0, transition: { duration: 0.5 } });
      pageControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, delay: 0.05 },
      });
    })();
  }, [heroControls, pageControls, headerControls]);

  const initialLineWidth = isMobile ? "70vw" : "320px";

  return (
    <div className="font-poppins bg-xmain text-xopp min-h-screen">
      <Analytics />
      <Head>
        <title>Sonus</title>
        <meta
          name="description"
          content="Make everyone communicate beyond language."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header appears after the hero expands */}
      {/* <motion.div initial={{ opacity: 0, y: -8 }} animate={headerControls}> */}
      <Header />
      {/* </motion.div> */}

      {/* Spacer to keep header off the hero area slightly */}
      {/* <div className="h-[30px] sm:h-[50px]" /> */}

      {/* ——— Hero Section ——— */}
      <SectionLayout>
        <div className="relative w-full flex flex-col items-center justify-center mt-[-26px]">
          {/* Fullscreen black overlay container for intro animation */}
          <div className="w-full flex items-center justify-center">
            {/* <motion.div
              className="relative overflow-hidden bg-xmain/0 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              initial={{
                opacity: 0,
                width: initialLineWidth,
                height: 2,
                y: 0,
                borderRadius: 12,
              }}
              animate={heroControls}
              style={{ willChange: "height, transform, width, borderRadius" }}
            >
              <video
                className="w-full h-full object-cover opacity-70"
                autoPlay
                loop
                muted
                playsInline
              >
                <source src="/sunset.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </motion.div> */}
            <div className="h-[200px] w-full">
              <video
                className="w-full h-full object-cover opacity-70 rounded-md"
                autoPlay
                loop
                muted
                playsInline
              >
                <source src="/sunset_sm.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
          <div className="h-[30px] sm:h-[50px]" />

          {/* Text + CTA reveal */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={pageControls}
            className="w-full flex flex-col h-[50vh] justify-end items-center sm:justify-start sm:h-full"
          >
            <Title>
              <div className="text-center font-light pt-8 sm:pt-0 text-[0.9em] sm:text-[0.85em] sm:leading-[1.2em] sm:pb-6">
                Sonus helps everyone
                <br />
                flow effortlessly beyond language barriers.
              </div>
            </Title>

            <div className="w-full flex justify-center flex-col items-center gap-3 mt-12 sm:mt-8">
              <button
                onClick={() => setOpen(true)}
                className="bg-xopp text-xmain rounded-3xl py-3 px-6 cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
              >
                Join waitlist
              </button>
              <div className="font-light text-xopp/60 italic text-[0.9em]">
                Launching in 2025 — stay tuned.
              </div>
            </div>
          </motion.div>
        </div>
      </SectionLayout>

      {/* ——— Secondary section (copy) ——— */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={pageControls}>
        <SectionLayout>
          <div className="my-2 w-full font-extralight flex justify-center flex-col text-center sm:text-left">
            Our goal is to empower a world without language barriers through
            real-time voice translation that preserves your unique voice,
            connecting humanity across cultures in authentic conversation.
            <br />
            <br />
            {/* We are creating a realtime interpreter that makes conversations
            across languages feel effortless, natural, and human.
            <br />
            <br />
            <span className="text-gray-400">
              We’re a small, driven team with a clear mission:{" "}
            </span>
            to remove barriers so everyone can connect, collaborate, and share
            ideas freely.
            <br />
            <br />
            Language divides us more than we realize.
            <br />
            We believe voices should bridge people, not build barriers. */}
          </div>
        </SectionLayout>
      </motion.div>
      <BottomSheetModal open={open} onClose={() => setOpen(false)} />

      <div className="py-16" />
      <Footer />
    </div>
  );
}
