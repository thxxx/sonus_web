import React, { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 800); // 200px 이상 스크롤되면 true
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToPosition = () => {
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const targetPosition = isMobile
      ? documentHeight - windowHeight - 550
      : documentHeight - windowHeight - 250;

    window.scrollTo({
      top: targetPosition > 0 ? targetPosition : 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={`flex flex-col font-poppins justify-start items-start fixed top-0 px-2 sm:px-20 w-full py-3 z-50 transition-colors duration-500 ${
        isScrolled ? "bg-white/10 text-xprimary" : "bg-xprimary text-xmain"
      }`}
    >
      <div className="font-light text-xl sm:ml-6 flex flex-row items-center gap-1">
        <div className="h-[24px] rounded-sm">
          <img
            src={isScrolled ? "/images/logo.png" : "/images/sonuslogowhite.svg"}
            className="w-[24px] rounded-sm"
          />
        </div>
        <div className="font-medium text-2xl">Sonus</div>
      </div>
    </div>
  );
};

export default React.memo(Header);
