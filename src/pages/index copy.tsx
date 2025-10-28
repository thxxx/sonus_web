import React, { useEffect, useState } from "react";
import Head from "next/head";
// import { Analytics } from "@vercel/analytics/react";
import { Analytics } from "@vercel/analytics/next";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import { isMobile } from "react-device-detect";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import "../globals.css";
import "../styles/radix.css";
import { BottomSheetModal } from "@/components/landing/\bModal";
import MicSelectorMock from "@/components/landing/Micanim";
import TranslationToolbarMock from "@/components/landing/RecordAnim";
import MicContent from "@/components/landing/MicContent";
import { Speaker, Volume2 } from "lucide-react";
import { WordFill } from "@/components/landing/Wordfill";
import TranslationCompareDemo from "@/components/landing/AudioComparison";
import CtaBand from "@/components/landing/LastSection";
import FAQ from "@/components/landing/Faq";
import UseCasesSection from "@/components/landing/UseCase";
import Platform from "@/components/landing/Platform";
import Image from "next/image";
import NumberAnimation from "@/components/landing/NumberAnimation";

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
    <div className="bg-xmain text-xopp min-h-screen">
      <Analytics />

      <Head>
        <title>Sonus</title>
        <meta
          name="description"
          content="Make everyone communicate beyond language."
        />
        <link rel="icon" href="/favicon-new.ico" />
      </Head>
      <Header />
      <div className="flex flex-col md:flex-row items-center justify-center bg-xprimary py-[14vh] min-h-[100vh]">
        <div className="w-full md:pl-32 md:w-[46%] md:text-left text-center">
          <div className="text-white text-3xl md:text-5xl font-bold">
            <span className="animate-shine">Speak Like a Native</span> in Any
            Language, <br />
            Without Language Classes
          </div>
          <div className="text-white/80 text-lg md:text-xl font-light mt-4">
            Talk naturally and let our real-time voice interpreter do the work.
            Keep your voice and tone while chatting across any language
          </div>
          <div>
            <button
              className="bg-white text-xprimary px-8 py-3 rounded-md mt-8 font-semibold cursor-pointer hover:bg-white/90"
              onClick={() => setOpen(true)}
            >
              Join the Waitlist
            </button>
          </div>
        </div>
        <div className="relative w-full md:w-[54%] md:pl-12 overflow-hidden py-1">
          <div className="w-[96vw] md:w-[68vw] mt-12 md:mt-0 ml-2 md:ml-0">
            <video
              src="/images/with_image.mp4"
              className="rounded-xl border-[6px] border-white/0 outline outline-1 outline-white"
              width={1400}
              height={900}
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-16 py-24 text-sm md:text-base">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="text-3xl font-semibold">How it works</div>
          <div className="text-[20px] text-center font-light text-gray-700">
            It{"'"}s like having a personal translator that sounds exactly like
            you
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-start justify-between w-full max-w-[1080px]">
          <div className="flex flex-col items-center justify-start w-full max-w-[480px] px-4">
            <div className="w-full min-h-[390px] md:min-h-[440px]">
              <div className="w-full">
                <MicSelectorMock />
              </div>
              <div className="w-full mt-4">
                <div className="w-full rounded-xl shadow-lg">
                  <div className="min-h-[40px] bg-[#F5F5F5] w-full rounded-t-2xl flex gap-[7px] items-center justify-start px-5">
                    <div className="h-3.5 w-3.5 bg-[#EF4444] rounded-full"></div>
                    <div className="h-3.5 w-3.5 bg-[#EBB305] rounded-full"></div>
                    <div className="h-3.5 w-3.5 bg-[#22C55D] rounded-full"></div>
                  </div>
                  <div className="min-h-[80px] bg-white rounded-b-xl">
                    <TranslationToolbarMock />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full flex flex-col items-center justify-start mt-0 md:mt-8">
              <div className="text-gray-900 text-xl w-full text-center">
                Just turn on your mic whenever you want
              </div>
              <div className="text-[16px] text-gray-500 mt-4 w-full text-center leading-5">
                Your audience will hear you speaking smoothly in their own
                language, using your exact voice to create real, natural
                connections no matter the language
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-start w-full max-w-[480px] mt-20 md:mt-0 px-4">
            <div className="w-full min-h-[440px] max-h-[440px]">
              <div className="w-full rounded-xl shadow-lg">
                <div className="min-h-[40px] bg-[#F5F5F5] w-full rounded-t-2xl flex gap-[7px] items-center justify-start px-5">
                  <div className="h-3.5 w-3.5 bg-[#EF4444] rounded-full"></div>
                  <div className="h-3.5 w-3.5 bg-[#EBB305] rounded-full"></div>
                  <div className="h-3.5 w-3.5 bg-[#22C55D] rounded-full"></div>
                </div>
                <div className="min-h-[80px] bg-white rounded-b-xl p-4">
                  {/* <MicContent /> */}
                  <div className="text-sm font-semibold">
                    You speaking in English
                  </div>
                  <WordFill
                    text="Good morning everyone, let's discuss our Q4 strategy and the new product roadmap we've been developing."
                    groupSize={1} // 1단어씩
                    intervalMs={200}
                    pauseMsAtEnd={5400} // 끝나고 5초 쉬고 반복
                    startDelayMs={0} // 바로 시작
                    className="text-[16px] font-medium mt-2 text-gray-500 min-h-[80px]"
                  />
                  <div className="text-sm font-semibold">
                    Your voice in Spanish
                  </div>
                  <WordFill
                    text="Buenos días a todos, discutamos nuestra estrategia del Q4 y la nueva hoja de ruta del producto que hemos estado desarrollando."
                    groupSize={4} // 4단어씩
                    intervalMs={800}
                    pauseMsAtEnd={2400} // 끝나고 5초 쉬고 반복
                    startDelayMs={1340} // 바로 시작
                    className="text-[16px] font-medium mt-2 min-h-[80px]"
                  />
                  <div className="text-xprimary mt-4 text-sm flex flex-row items-center gap-1">
                    <Volume2 size={16} />
                    Real-time translation with your voice
                  </div>

                  <div className="flex flex-row items-center justify-between mt-12 gap-2">
                    <div className="rounded-lg bg-[#FAFBFA] py-2 w-full flex flex-col gap-0 items-center justify-center">
                      <div className="text-gray-500">Translation starts</div>
                      <div className="font-bold text-xl text-xprimary flex flex-row">
                        {"<"} <NumberAnimation />
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#FAFBFA] py-2 w-full flex flex-col gap-0 items-center justify-center">
                      <div className="text-gray-500">Supports</div>
                      <div className="font-bold text-xl text-xprimary flex flex-row gap-2 items-end">
                        23+{" "}
                        <span className="text-gray-500 text-base font-normal mb-0.5">
                          languages
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full flex flex-col items-center justify-start mt-8">
              <div className="text-gray-900 text-xl w-full text-center">
                Contextual Translation
              </div>
              <div className="text-[16px] text-gray-500 mt-4 w-full text-center leading-5">
                Real-time interpretation is fundamentally different from
                document translation. We focus on capturing the subtle nuances
                often left unspoken in conversation and{" "}
                <span className="bg-yellow-200 text-black/90">
                  start translating before a sentence is finished.
                </span>
                {/* Your audience hears you speaking fluently
                in their language with your exact voice, creating authentic
                connections across language barriers. */}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-[24px]" />

      <div className="flex flex-col items-center justify-center gap-8 bg-gray-50 py-24">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="text-3xl font-semibold">Hear the difference</div>
          <div className="text-[20px] font-light text-gray-700">
            Compare Sonus&apos; voice preservation and speed with industry
            leaders
          </div>
        </div>
        <div className="flex flex-row items-start justify-between w-full max-w-[1240px]">
          <TranslationCompareDemo />
        </div>
      </div>
      <UseCasesSection />
      <Platform />
      <FAQ />
      <CtaBand onClick={() => setOpen(true)} />
      <BottomSheetModal open={open} onClose={() => setOpen(false)} />

      <div className="py-16" />
      <Footer />
    </div>
  );
}
