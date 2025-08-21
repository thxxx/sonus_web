import React from "react";

type SectionLayoutProps = {
  children: React.ReactNode;
};

const SectionLayout = ({ children }: SectionLayoutProps) => {
  return (
    <div className="px-[5vw] py-12 sm:py-20 sm:px-[15vw] flex justify-center items-center">
      <div className="max-w-[400px]">{children}</div>
    </div>
  );
};

export default React.memo(SectionLayout);
