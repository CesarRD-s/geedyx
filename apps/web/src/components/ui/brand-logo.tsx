import Image from "next/image";
import horizontalDark from "@/assets/geedyx-logo-horizontal-dark.png";
import horizontalLight from "@/assets/geedyx-logo-horizontal-light.png";
import iconDark from "@/assets/geedyx-logo-icon-dark.png";
import iconLight from "@/assets/geedyx-logo-icon-light.png";

interface BrandLogoProps {
  compact?: boolean;
  priority?: boolean;
  size?: "md" | "lg";
  className?: string;
}

export function BrandLogo({
  compact = false,
  priority = false,
  size = "md",
  className = "",
}: BrandLogoProps) {
  const lightSource = compact ? iconLight : horizontalLight;
  const darkSource = compact ? iconDark : horizontalDark;
  const sizeClass = compact
    ? "h-7 w-7"
    : size === "lg"
      ? "h-10 w-auto"
      : "h-7 w-auto";

  return (
    <span className={`inline-flex items-center ${className}`.trim()}>
      <Image
        src={lightSource}
        alt="GEEDYX"
        priority={priority}
        className={`${sizeClass} object-contain dark:hidden`}
      />
      <Image
        src={darkSource}
        alt="GEEDYX"
        priority={priority}
        className={`hidden ${sizeClass} object-contain dark:block`}
      />
    </span>
  );
}
