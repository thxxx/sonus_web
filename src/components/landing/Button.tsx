import React from "react";

type ButtomProps = {
  children: React.ReactNode;
  onClick: () => void;
};

const Button = ({ children, onClick }: ButtomProps) => {
  return (
    <button
      className="py-3 px-8 rounded-full bg-black text-white text-[20px] cursor-pointer"
      onClick={() => onClick()}>
      {children}
    </button>
  );
};

export default Button;
