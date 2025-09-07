import { useState } from "react";
import Emails from "@/pages/Communications/Emails";
import SMS from "@/pages/Communications/SMS";
import Calls from "@/pages/Communications/Calls";

export default function CommsHub() {
  const [tab, setTab] = useState<"email"|"sms"|"calls">("email");
  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <button className={`px-3 py-2 rounded ${tab==='email'? 'bg-slate-900 text-white':'bg-slate-100'}`} onClick={()=>setTab("email")}>
          Email
        </button>
        <button className={`px-3 py-2 rounded ${tab==='sms'? 'bg-slate-900 text-white':'bg-slate-100'}`} onClick={()=>setTab("sms")}>
          SMS
        </button>
        <button className={`px-3 py-2 rounded ${tab==='calls'? 'bg-slate-900 text-white':'bg-slate-100'}`} onClick={()=>setTab("calls")}>
          Calls
        </button>
      </div>
      {tab === "email" && <Emails />}
      {tab === "sms" && <SMS />}
      {tab === "calls" && <Calls />}
    </div>
  );
}


