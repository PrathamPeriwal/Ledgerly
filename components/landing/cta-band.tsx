import Link from "next/link";
import { btnInk, btnWhite } from "./ui";

export function CtaBand() {
  return (
    <section className="border-y-[3px] border-[#1A1B1C] bg-[#FF5F14] px-5 py-14 md:px-10 md:py-20">
      <h2 className="display max-w-[14ch] text-[clamp(2.75rem,9vw,7rem)] text-[#1A1B1C]">
        SEE IT WITH REAL DATA.
      </h2>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Link href="/sign-in" data-cursor="GO" className={btnInk}>
          TRY THE DEMO
        </Link>
        <Link href="/sign-in" className={btnWhite}>
          LOGIN
        </Link>
      </div>
    </section>
  );
}
