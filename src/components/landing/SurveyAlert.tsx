import React, { Dispatch, SetStateAction, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import "../../styles/radix.css";
import { supabase } from "@/utils/supabase";
import { log } from "@/utils/log";

type AlertDialogDemoProps = {
  children: React.ReactNode;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
};

const AlertDialogDemo = ({
  children,
  email,
  setEmail,
}: AlertDialogDemoProps) => {
  const [bio, setBio] = useState<string>("");
  const [reason, setReason] = useState<string[]>([]);
  const [allowInterview, setAllowInterview] = useState<boolean>(false);

  const onSubmit = async () => {
    if (!email) return;

    try {
      await log("is_join");
      const body = {
        email: email,
      };
      const res = await supabase.from("waitlist").insert(body);
    } catch {
      console.log("Error : ", email);
    }
  };

  const onSubmitSurvey = async () => {
    if (!email) return;

    if (bio || reason || allowInterview) {
      await log("is_submit");

      const body = {
        email: email,
        allow_interview: allowInterview,
        reason: reason,
        bio: bio,
      };
      const res = await supabase.from("waitlist").upsert(body);
    } else {
      await log("is_skip");
    }

    setEmail("");
    alert("You are joined in the waitlist! Thank you");
  };

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <div
          onClick={() => {
            onSubmit();
          }}>
          {children}
        </div>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="AlertDialogOverlay" />
        <AlertDialog.Content className="AlertDialogContent overflow-y-auto">
          <AlertDialog.Title className="AlertDialogTitle">
            <p className="text-[1.6em] sm:text-[2em] font-semibold text-blue-400">
              Thanks for joining us.
            </p>
          </AlertDialog.Title>
          <AlertDialog.Description className="AlertDialogDescription m-0 p-0"></AlertDialog.Description>
          <div className="mt-2">
            Here are some additional questions. You can skip them
          </div>
          <div className="flex flex-col">
            <div className="mt-8 text-[20px] font-semibold">
              Could you please tell us a bit about yourself?
            </div>
            <input
              placeholder="ex. engineer, sales, student, etc"
              className="p-2 mt-2 border focused:outline-black"
              value={bio}
              onChange={(e) => setBio(e.currentTarget.value)}
            />
            <div className="mt-8 text-[20px] font-semibold">
              What makes you to join?
            </div>
            <div className="mt-3 flex flex-row flex-wrap">
              <div
                onClick={() => {
                  if (!reason.includes("solution"))
                    setReason([...reason, "solution"]);
                  else setReason(reason.filter((doc) => doc != "solution"));
                }}
                className={`hover:bg-slate-100 py-1 px-4 rounded-full border cursor-pointer mr-2 mt-2 ${
                  reason.includes("solution") ? "border-blue-800" : ""
                }`}>
                To try out the solution in the video call
              </div>
              <div
                onClick={() => {
                  if (!reason.includes("interest"))
                    setReason([...reason, "interest"]);
                  else setReason(reason.filter((doc) => doc != "interest"));
                }}
                className={`hover:bg-slate-100 py-1 px-4 rounded-full border cursor-pointer mr-2 mt-2 ${
                  reason.includes("interest") ? "border-blue-800" : ""
                }`}>
                Curiosity
              </div>
              <div
                onClick={() => {
                  if (!reason.includes("other"))
                    setReason([...reason, "other"]);
                  else setReason(reason.filter((doc) => doc != "other"));
                }}
                className={`hover:bg-slate-100 py-1 px-4 rounded-full border cursor-pointer mr-2 mt-2 ${
                  reason.includes("other") ? "border-blue-800" : ""
                }`}>
                other reason
              </div>
            </div>
            <div className="mt-8">
              <div className="text-[20px] font-semibold text-slate-700">
                Can we request an 30min interview with you?
              </div>
              There will be a compensation for participating in the interview.
              You can reject it after you get an email from us.
              <div className="mt-4 flex flex-row">
                <div
                  onClick={() => setAllowInterview(true)}
                  className={`border rounded-full px-4 py-1 mr-2 cursor-pointer hover:bg-slate-100 ${
                    allowInterview ? "border-blue-800" : ""
                  }`}>
                  Yes
                </div>
                <div
                  onClick={() => setAllowInterview(false)}
                  className={`border rounded-full px-4 py-1 mr-2 cursor-pointer hover:bg-slate-100 ${
                    !allowInterview ? "border-blue-800" : ""
                  }`}>
                  No
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 25,
              justifyContent: "flex-end",
              marginTop: "12px",
            }}>
            <AlertDialog.Cancel asChild>
              <button
                className="bg-slate-200 text-slate-400 px-6 py-2 rounded-md cursor-pointer"
                onClick={() => onSubmitSurvey()}>
                Skip
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                className="bg-blue-700 text-slate-100 px-6 py-2 rounded-md cursor-pointer"
                onClick={() => onSubmitSurvey()}>
                Submit
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

export default AlertDialogDemo;
