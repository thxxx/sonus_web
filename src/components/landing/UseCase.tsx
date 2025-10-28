import React from "react";
import { MessageCircle, Globe, Bot } from "lucide-react";

type UseCase = {
  icon: React.ReactNode;
  iconBg: string; // tailwind bg class for icon tile
  title: string;
  desc: string;
};

const items: UseCase[] = [
  {
    icon: <MessageCircle className="h-7 w-7 text-white" />,
    iconBg: "bg-[#4F7CFB]",
    title: "Business Meetings",
    desc: "Lead international conferences, close deals with global clients, and collaborate seamlessly with remote teams across different languages.",
  },
  {
    icon: <Globe className="h-7 w-7 text-white" />,
    iconBg: "bg-[#8B5CF6]",
    title: "Travel & Tourism",
    desc: "Navigate foreign countries, connect with locals, and experience authentic cultural exchanges while maintaining your personal communication style.",
  },
  {
    icon: <Bot className="h-7 w-7 text-white" />,
    iconBg: "bg-[#255E4F]",
    title: "Education & Training",
    desc: "Deliver presentations to international audiences, conduct remote training sessions, and share knowledge across language boundaries.",
  },
];

export default function UseCasesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24">
      <header className="text-center">
        <div
          style={{ fontWeight: 500 }}
          className="text-3xl tracking-[-0.02em] text-[#0F172A] md:text-3xl"
        >
          Unlock global communication
        </div>
        <p className="mx-auto mt-3 max-w-3xl leading-relaxed text-gray-500">
          From international business meetings to personal travel, Sonus breaks
          down language barriers while preserving your authentic voice and
          personality
        </p>
      </header>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {items.map((item, i) => (
          <article
            key={i}
            className="
              group rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm
              transition hover:-translate-y-0.5 hover:shadow-md
              hover:border-zinc-300
            "
          >
            <div
              className={[
                "mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl",
                item.iconBg,
                "shadow-sm",
              ].join(" ")}
            >
              {item.icon}
            </div>
            <h3 className="text-center text-xl font-semibold text-[#0F172A]">
              {item.title}
            </h3>
            <p className="mt-3 text-center text-[15px] leading-7 text-[#6B7280]">
              {item.desc}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
