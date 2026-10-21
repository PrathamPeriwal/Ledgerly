import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      borderWidth: ["bw", "strong"],
    },
  },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
