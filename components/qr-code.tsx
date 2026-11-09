"use client";

import React, { useMemo } from "react";
import { generateQrMatrix } from "@/lib/qr";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
  color?: string;
  bgColor?: string;
}

export function QrCode({
  value,
  size = 180,
  className = "",
  color = "#001B48",
  bgColor = "#FFFFFF",
}: QrCodeProps) {
  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(value);
    } catch (e) {
      console.error("QR Code generation error:", e);
      return [];
    }
  }, [value]);

  if (!matrix || matrix.length === 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-gray-100 rounded-xl text-xs text-gray-500"
      >
        QR Error
      </div>
    );
  }

  const moduleCount = matrix.length;
  const padding = 2; // quiet zone in module units
  const totalUnits = moduleCount + padding * 2;

  // Build SVG path string for all dark modules
  let path = "";
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (matrix[r][c]) {
        const x = c + padding;
        const y = r + padding;
        path += `M${x},${y}h1v1h-1z `;
      }
    }
  }

  return (
    <div
      className={`inline-block p-2 rounded-2xl bg-white shadow-xs border border-[#D6E8EE] ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${totalUnits} ${totalUnits}`}
        className="w-full h-full rounded-xl"
        shapeRendering="crispEdges"
        aria-label={`Mã QR cho: ${value}`}
        role="img"
      >
        <rect width={totalUnits} height={totalUnits} fill={bgColor} />
        <path d={path} fill={color} />
      </svg>
    </div>
  );
}

