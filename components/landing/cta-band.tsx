import Link from "next/link";
import { btnInk, btnWhite } from "./ui";

export function CtaBand() {
  return (
    <section className="border-y-[3px] border-[#1A1B1C] bg-[#FF5F14] px-4 py-16 md:px-8 md:py-24">
      <h2 className="display text-[13vw] md:text-[11vw]">SEE IT WITH REAL DATA.</h2>
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
