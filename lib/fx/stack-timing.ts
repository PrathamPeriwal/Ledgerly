export function sectionHeightVh(count: number) {
  return 100 + count * 75;
}

export type StackCardFrame = { enter: number; dim: number; local: number };
export type StackFrame = { gridOffset: number; cards: StackCardFrame[] };

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function ease(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

/** Enter window of card `index`: the first half of its equal slot. */
export function enterWindow(index: number, count: number) {
  const slot = 1 / count;
  return { start: index * slot, end: index * slot + slot / 2 };
}

function enterOf(p: number, index: number, count: number) {
  const { start, end } = enterWindow(index, count);
  return ease((p - start) / (end - start));
}

export function stackFrame(p: number, count: number): StackFrame {
  const slot = 1 / count;
  const cards = Array.from({ length: count }, (_, i) => ({
    enter: enterOf(p, i, count),
    dim: i < count - 1 ? enterOf(p, i + 1, count) : 0,
    local: clamp((p - i * slot - slot / 2) / (slot / 2)),
  }));
  return { gridOffset: p, cards };
}
