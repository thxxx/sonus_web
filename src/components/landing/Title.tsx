import React from "react";

type TitleProps = {
  children: React.ReactNode;
};

const Title = ({ children }: TitleProps) => {
  return (
    <div className="font-semibold text-[1.6em] sm:text-[2.4em] sm:leading-[3.0rem]">
      {children}
    </div>
  );
};

export default Title;
