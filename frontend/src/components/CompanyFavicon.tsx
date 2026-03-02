import { useState } from "react";
import { faviconUrl } from "@/lib/utils";

interface CompanyFaviconProps {
  url: string;
  name: string;
  size?: number;
  className?: string;
}

export function CompanyFavicon({ url, name, size = 32, className = "" }: CompanyFaviconProps) {
  const [failed, setFailed] = useState(false);
  const src = faviconUrl(url, size);

  if (!src || failed) {
    const initial = name.charAt(0).toUpperCase();
    return (
      <div
        className={`rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 select-none ${className}`}
        style={{ width: size, height: size }}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`rounded shrink-0 ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
