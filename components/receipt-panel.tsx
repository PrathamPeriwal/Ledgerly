"use client";

import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { isReceiptImage, uploadReceipt } from "@/components/receipt-scanner";
import { mapScanReceipt, type MappedScan } from "@/lib/scan-mapping";

type Status = "idle" | "scanning" | "review" | "error";

const READ_FAILED = "COULDN'T READ THAT RECEIPT. ENTER IT BY HAND.";

export function ReceiptPanel({
  onApply,
  onDiscard,
  onScanningChange,
}: {
  onApply: (values: MappedScan) => void;
  onDiscard: () => void;
  onScanningChange: (scanning: boolean) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  function setPreviewUrl(next: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
    setPreview(next);
  }

  async function take(file: File) {
    if (!isReceiptImage(file)) {
      toast.error("ONLY JPEG, PNG, OR WEBP");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setStatus("scanning");
    onScanningChange(true);
    try {
      const json = await uploadReceipt(file);
      const mapped = mapScanReceipt(json);
      setStatus("review");
      onApply(mapped);
    } catch {
      setStatus("error");
      toast.error(READ_FAILED);
    } finally {
      onScanningChange(false);
    }
  }

  function discard() {
    setPreviewUrl(null);
    setStatus("idle");
    setOpen(false);
    if (inputRef.current) inputRef.current.value = "";
    onDiscard();
  }

  const input = (
    <input
      id={inputId}
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="sr-only"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void take(file);
      }}
    />
  );

  return (
    <div className="border-[3px] border-[#1A1B1C] bg-white p-4">
      <style>{`
        @keyframes receipt-scan { from { top: 0; } to { top: calc(100% - 2px); } }
        .receipt-scan { animation: receipt-scan 1.6s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .receipt-scan { animation: none; top: 45%; }
        }
      `}</style>
      {input}
      {status === "scanning" || status === "review" ? (
        <div>
          <button type="button" className="block w-full" onClick={() => setOpen(true)}>
            <span className="relative flex h-56 items-center justify-center overflow-hidden border-[2px] border-[#1A1B1C] bg-[#E3E7EB]">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Receipt preview" className="max-h-full max-w-full object-contain" />
              ) : null}
              {status === "scanning" ? <span className="receipt-scan absolute inset-x-0 h-0.5 bg-[#FF5F14]" /> : null}
            </span>
          </button>
          {status === "scanning" ? (
            <p className="label mt-3" aria-live="polite">
              READING RECEIPT...
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="label border-l-[3px] border-[#FF5F14] pl-2">REVIEW BEFORE SAVING</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="label h-10 border-[2px] border-[#1A1B1C] bg-white px-3"
                  onClick={() => inputRef.current?.click()}
                >
                  SCAN AGAIN
                </button>
                <button
                  type="button"
                  className="label h-10 border-[2px] border-[#1A1B1C] bg-white px-3"
                  onClick={discard}
                >
                  DISCARD SCAN
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {status === "error" ? (
            <p className="label mb-3 border-l-[3px] border-[#FF5F14] pl-2">{READ_FAILED}</p>
          ) : null}
          <label
            htmlFor={inputId}
            data-cursor="SCAN"
            className="label flex h-12 cursor-pointer items-center justify-center border-[3px] border-dashed border-[#1A1B1C] bg-white lg:hidden"
          >
            SCAN A RECEIPT
          </label>
          <label
            htmlFor={inputId}
            data-cursor="SCAN"
            onDragOver={(event) => {
              event.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setOver(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void take(file);
            }}
            className={`label hidden min-h-64 cursor-pointer items-center justify-center border-[3px] border-dashed px-4 text-center lg:flex ${over ? "border-[#FF5F14] text-[#FF5F14]" : "border-[#1A1B1C]"}`}
          >
            DROP A RECEIPT OR CLICK TO UPLOAD
          </label>
          <p className="label mt-3 text-muted-foreground">
            JPEG, PNG, WEBP. UP TO 5 MB. NOTHING IS SAVED UNTIL YOU CONFIRM.
          </p>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="label">RECEIPT</DialogTitle>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Receipt enlarged" className="max-h-[70vh] w-full object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
