import Image from "next/image";
import React from "react";

export default function Integrations() {
  const items = [
    {
      label: "Teams",
      sub: "Microsoft Teams",
      bg: "bg-[#2563EB]", // blue-600
      text: "text-white",
      src: "/images/teams.svg",
      width: 40,
    },
    {
      label: "#",
      sub: "Slack",
      bg: "bg-[#8B5CF6]", // purple-500
      text: "text-white",
      src: "/images/slack.svg",
      width: 36,
    },
    {
      label: "Meet",
      sub: "Google Meet",
      bg: "bg-[#22C55E]", // green-500
      text: "text-white",
      src: "/images/google-meet.svg",
    },
    {
      label: "Zoom",
      sub: "Zoom",
      bg: "bg-[#2563EB]", // blue-600
      text: "text-white",
      src: "/images/zoomtext.png",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl rounded-3xl bg-gradient-to-b from-[#f9f9f9] to-white px-6 py-16 text-center shadow-sm">
      <h2 className="text-2xl text-gray-900 md:text-3xl">
        Works with your favorite platforms
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-gray-500">
        Seamlessly integrate with the communication tools you already use for
        meetings, collaboration, and more
      </p>

      <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
        {items.map((item, i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-xl font-semibold ${item.text} shadow-md`}
            >
              <Image
                src={item.src}
                alt={item.label}
                width={item.width || 48}
                height={48}
              />
            </div>
            <p className="mt-3 text-sm font-medium text-gray-700">{item.sub}</p>
          </div>
        ))}
      </div>

      <p className="mt-12 text-gray-400">
        And many more platforms coming soon...
      </p>
    </section>
  );
}
