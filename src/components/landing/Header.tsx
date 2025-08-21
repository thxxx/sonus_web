import React from "react";
import Image from "next/image";
import { isMobile } from "react-device-detect";

const Header = () => {
  const scrollToPosition = () => {
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const targetPosition = isMobile
      ? documentHeight - windowHeight - 550
      : documentHeight - windowHeight - 250;

    window.scrollTo({
      top: targetPosition > 0 ? targetPosition : 0, // Ensure we don't scroll to a negative position
      behavior: "smooth", // Smooth scrolling
    });
  };

  return (
    <div className="flex flex-col justify-start items-start fixed top-32 left-24 px-2 sm:px-6 w-[320px] opacity-0 sm:opacity-100">
      <div className="font-light text-xl sm:ml-6 flex flex-row items-center gap-2">
        <div className="h-[24px] bg-white rounded-sm">
          <img src="/images/logo.png" className="w-[24px] rounded-sm" />
        </div>
        <div>Sonus</div>
      </div>
      <div></div>
      {/* <div className="cursor-pointer py-2 px-4 sm:py-4 sm:px-6 text-[1em] sm:text-[1.2em] h-full rounded-full font-medium text-white">
        For you
      </div> */}
    </div>
  );
};

export default React.memo(Header);
