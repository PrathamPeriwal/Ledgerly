export function sectionHeightVh(count: number) {
  return 100 + count * 75;
}

export function cardWindow(index: number, count: number) {
  const slot = count > 0 ? 1 / count : 0;
  const enterStart = index * slot;
  return {
    enterStart,
    enterEnd: enterStart + slot * 0.45,
    slotEnd: enterStart + slot,
  };
}

function ease(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

export function enterAmount(progress: number, index: number, count: number) {
  if (index <= 0) return 1;
  const window = cardWindow(index, count);
  const span = window.enterEnd - window.enterStart;
  if (span <= 0) return progress >= window.enterStart ? 1 : 0;
  return ease((progress - window.enterStart) / span);
}

export function dimAmount(progress: number, index: number, count: number) {
  if (index >= count - 1) return 0;
  return enterAmount(progress, index + 1, count);
}

export function gridAmount(progress: number, count: number) {
  if (count <= 0) return 0;
  let sum = 0;
  for (let index = 0; index < count; index += 1) sum += enterAmount(progress, index, count);
  return sum / count;
}
