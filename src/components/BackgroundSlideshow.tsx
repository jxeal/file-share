"use client";

import { useEffect, useState } from "react";

const images = [
  "/bg1.jpeg",
  "/bg2.jpeg",
  "/bg3.jpeg",
  "/bg4.jpeg",
  "/bg5.jpeg",
];

export default function BackgroundSlideshow({
  children,
}: {
  children: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setIndex((prev) => (prev + 1) % images.length),
      5000
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="">
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-2000 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
