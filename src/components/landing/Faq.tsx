import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

type FAQItem = {
  q: string;
  a: string;
};

const faqs: FAQItem[] = [
  {
    q: "How is Sonus different from existing real-time voice translation products?",
    a: "Sonus analyzes your unique voice characteristics, tone, and speaking patterns during a brief training session. It then uses this voice profile to generate translations that maintain your authentic sound across any language.",
  },
  {
    q: "What languages are supported?",
    a: "Sonus currently supports over 23+ widely spoken languages with real-time voice translation. We are actively expanding our language offerings and plan to add many more languages soon, enabling seamless communication across an even broader range of cultures and regions.",
  },
  {
    q: "Is my voice data secure?",
    a: "Yes, we use enterprise-grade security with end-to-end encryption. Your voice data is protected with bank-level security and we offer private cloud deployment options for additional privacy.",
  },
  {
    q: "Can I use Sonus for business meetings?",
    a: "Yes! Sonus is designed to be versatile and effective for any occasion—from professional business meetings to casual conversations. Whether you're negotiating deals, collaborating with international teams, or simply connecting socially, Sonus provides seamless, real-time translation in your own voice, making communication effortless and natural.",
  },
  {
    q: "Can Sonus translate idioms, slang, or cultural expressions correctly?",
    a: "Yes, Sonus is designed to accurately interpret and translate idioms, slang, and cultural expressions, ensuring your message carries the same meaning and tone across languages. Our AI understands nuanced language to help you communicate naturally and effectively in any context.",
  },
  {
    q: "When will Sonus be available for the public?",
    a: "We're planning a private beta with select users and enterprises in October 2025, with early access available for sign-ups starting within Q4 2025.",
  },
  {
    q: "Will there be multi-user or team plans?",
    a: "Yes! Sonus offers team workspaces, shared voice profiles, meeting transcriptions, and administrative controls.",
  },
  {
    q: "What kind of customer support will be offered?",
    a: "Our founders will provide 24/7 email support for all users as well as phone and video support for users with early access.",
  },
  {
    q: "Can I use it for translating recorded audio as well as live speech?",
    a: "Absolutely! Sonus supports both real-time voice translation during live conversations and translation of recorded audio. Users can upload recorded meetings or sessions and receive accurate transcripts and translations in their own voice. Meeting transcripts can be downloaded in the user's chosen language for easy reference and sharing.",
  },
  {
    q: "What kind of devices and platforms does it work on?",
    a: "Sonus will launch first as a native app for macOS, optimized for seamless real-time voice translation during business meetings.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mx-auto max-w-3xl py-24 pt-28 px-4">
      <h2 className="text-center text-3xl">Frequently asked questions</h2>
      <p className="mt-2 text-center text-gray-500">
        Everything you need to know about Sonus and how it works
      </p>

      <div className="mt-20 divide-y divide-gray-200 border-t border-b px-1">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx}>
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="flex w-full items-center justify-between py-4 text-left"
              >
                <span className="font-medium text-gray-900">{faq.q}</span>
                <ChevronDown
                  className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="pb-4 text-gray-600 animate-fadeIn">{faq.a}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* 간단한 애니메이션 */}
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}
