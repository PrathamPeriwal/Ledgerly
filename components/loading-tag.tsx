export function LoadingTag() {
  return (
    <p className="label pointer-events-none fixed bottom-3 right-3 z-[70] inline-flex items-center gap-2 border-[3px] border-[#1A1B1C] bg-white px-2 py-1 text-[#1A1B1C]">
      <span aria-hidden className="loading-blink inline-block h-2.5 w-2.5 bg-[#1A1B1C]" />
      LOADING
    </p>
  );
}
