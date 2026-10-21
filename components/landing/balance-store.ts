import { useSyncExternalStore } from "react";

export const START_BALANCE = 4820;

let balance = START_BALANCE;
const listeners = new Set<() => void>();

export function setBalance(next: number) {
  balance = next;
  listeners.forEach((l) => l());
}

export function useBalance() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => balance,
    () => START_BALANCE,
  );
}
