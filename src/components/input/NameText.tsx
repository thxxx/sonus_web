import React from "react";

const NameText = ({
  userId,
  setUserId,
  sendUserId,
}: {
  userId: string;
  setUserId: (value: string) => void;
  sendUserId: () => void;
}) => {
  return (
    <div className="md:w-[840px] w-[360px] flex flex-col items-center mx-auto mt-10">
      <textarea
        placeholder="이름 넣어주세요"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        className="w-full text-sm p-4 rounded-sm border border-[#E9EDD9] shadow-sm"
        rows={1}
      />
      <div
        onClick={sendUserId}
        className="w-full text-sm text-[#7E8766] p-4 rounded-sm mt-2 bg-[#F7F9F2] border border-[#E9EDD9] shadow-sm cursor-pointer text-center hover:bg-[#EEF2E0]"
      >
        Set My Name
      </div>
    </div>
  );
};

export default NameText;
