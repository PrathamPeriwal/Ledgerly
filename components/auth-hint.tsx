"use client";

import { useEffect, useState } from "react";

/** Clerk's session cookie (readable by JS). A hint only; the server still enforces auth. */
export function useSessionHint() {
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    setHasSession(/(?:^|;\s*)__session(?:_[^=;]+)?=/.test(document.cookie));
  }, []);
  return hasSession;
}
