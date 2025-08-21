import { supabase } from "./supabase";
import { isMobile } from "react-device-detect";
import { v4 } from "uuid";

export const log = async (typed?: "is_join" | "is_submit" | "is_skip") => {
  const logId = localStorage.getItem("logId");
  if (logId && typed) {
    const body = {
      log_id: logId,
      [typed]: true,
    };

    console.log("측정보기 : ", body);
    const res = await supabase.from("logs").update(body).eq("log_id", logId);
  } else {
    if (!logId && !typed) {
      const logId = v4();
      localStorage.setItem("logId", logId);

      const body = {
        log_id: logId,
        is_submit: false,
        is_skip: false,
        is_join: false,
        is_mobile: isMobile,
      };
      const res = await supabase.from("logs").insert(body);
    }
  }
};
