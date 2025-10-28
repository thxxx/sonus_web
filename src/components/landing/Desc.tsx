import React from "react";

type DescProps = {
  children: React.ReactNode;
};

const Desc = ({ children }: DescProps) => {
  return (
    <div className="mt-8 text-[1.1em] sm:text-[1.3em] text-slate-900">
      {children}
    </div>
  );
};

export default Desc;
