import React from "react";
import SectionLayout from "./SectionLayout";

const OriginHero = () => {
  return (
    <SectionLayout>
      <div className="relative w-full flex flex-col items-center justify-center mt-[-26px]">
        {/* Fullscreen black overlay container for intro animation */}
        <div className="w-full flex items-center justify-center">
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

        {/* 
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
        </motion.div> */}
      </div>
    </SectionLayout>
  );
};

export default OriginHero;
