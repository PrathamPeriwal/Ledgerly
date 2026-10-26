import { RevealHeading } from "@/components/fx/RevealHeading";
import { GITHUB_REPO_URL } from "@/lib/site";

const ITEMS: [string, string][] = [
  [
    "What is Ledgerly?",
    "A personal finance app. You record income and expenses across accounts, set one monthly budget and see how much is left. It is a portfolio project, not a bank product.",
  ],
  [
    "How does receipt scanning work?",
    "You upload a photo of a receipt. Google Gemini reads the amount, date, merchant and category and fills in the form. Nothing is saved until you review it and confirm.",
  ],
  [
    "Is my data private?",
    "Sign-in is handled by Clerk. Accounts, transactions and budgets are stored in a Supabase Postgres database. Receipt photos are sent to Google Gemini to be read, and the app does not store them. Monthly report emails go through Resend. Read the privacy page for details.",
  ],
  [
    "Is it free?",
    "Yes. It is a portfolio project, so there is nothing to buy.",
  ],
  [
    "Which currency does it use?",
    "Indian rupees only. Amounts are formatted the Indian way, for example ?1,20,500.00. There is no currency conversion.",
  ],
  [
    "Can I try it without signing up?",
    "Yes. The demo opens a sample account filled with made-up data. The sample data is reset every night.",
  ],
  ["Where is the code?", ""],
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 px-4 pb-16 md:px-8 md:pb-24">
      <RevealHeading className="display text-5xl md:text-8xl">QUESTIONS.</RevealHeading>
      <div className="mt-10 grid gap-[3px] border-[3px] border-[#1A1B1C] bg-[#1A1B1C]">
        {ITEMS.map(([question, answer]) => (
          <details key={question} className="group bg-white">
            <summary className="label flex cursor-pointer list-none items-center justify-between gap-4 p-6 hover:bg-[#FF5F14] focus-visible:bg-[#FF5F14] focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <h3 className="label">{question}</h3>
              <span aria-hidden className="text-2xl leading-none group-open:hidden">+</span>
              <span aria-hidden className="hidden text-2xl leading-none group-open:inline">&minus;</span>
            </summary>
            <p className="max-w-2xl px-6 pb-6 text-base">
              {answer || (
                <>
                  It is open source on{" "}
                  <a href={GITHUB_REPO_URL} rel="noopener noreferrer" className="underline underline-offset-2">
                    GitHub
                  </a>
                  .
                </>
              )}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
