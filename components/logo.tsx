import React from "react";

export default function UniCycleLogo({
  className = "h-10 w-auto",
}: {
  className?: string;
}) {
  return (
    <img
      src="/logo.jpg"
      alt="UniCycle Logo"
      className={`rounded-[10%] object-contain inline-block select-none ${className}`}
    />
  );
}
