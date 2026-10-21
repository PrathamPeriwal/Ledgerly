"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTransaction, updateTransaction } from "@/actions/transaction";
import { transactionSchema } from "@/app/lib/schema";
import { ReceiptPanel } from "@/components/receipt-panel";
import { TiltedTag } from "@/components/fx/TiltedTag";
import { Button as ButtonRoot } from "@/components/ui/button";
import { Calendar as CalendarRoot } from "@/components/ui/calendar";
import { Input as InputRoot } from "@/components/ui/input";
import {
  Popover,
  PopoverContent as PopoverContentRoot,
  PopoverTrigger as PopoverTriggerRoot,
} from "@/components/ui/popover";
import {
  Select as SelectRoot,
  SelectContent as SelectContentRoot,
  SelectItem as SelectItemRoot,
  SelectTrigger as SelectTriggerRoot,
  SelectValue as SelectValueRoot,
} from "@/components/ui/select";
import { Switch as SwitchRoot } from "@/components/ui/switch";

type Kit = ComponentType<any>;
const Button = ButtonRoot as Kit;
const Calendar = CalendarRoot as Kit;
const Input = InputRoot as Kit;
const PopoverContent = PopoverContentRoot as Kit;
const PopoverTrigger = PopoverTriggerRoot as Kit;
const Select = SelectRoot as Kit;
const SelectContent = SelectContentRoot as Kit;
const SelectItem = SelectItemRoot as Kit;
const SelectTrigger = SelectTriggerRoot as Kit;
const SelectValue = SelectValueRoot as Kit;
const Switch = SwitchRoot as Kit;
import { defaultCategories } from "@/data/categories";
import useFetch from "@/hooks/use-fetch";
import { formatCurrency } from "@/lib/format";
import type { MappedScan } from "@/lib/scan-mapping";
import { cn } from "@/lib/utils";

type TxType = "EXPENSE" | "INCOME";
type Interval = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
type AiField = "amount" | "date" | "type" | "category" | "description";

type FormValues = {
  type: TxType;
  amount: string;
  description?: string;
  date: Date;
  accountId: string;
  category: string;
  isRecurring: boolean;
  recurringInterval?: Interval;
};

export type TransactionAccount = {
  id: string;
  name: string;
  type: string;
  balance: number;
  isDefault: boolean;
};

export type TransactionInitial = {
  type: TxType;
  amount: number;
  description: string;
  accountId: string;
  category: string;
  date: string;
  isRecurring: boolean;
  recurringInterval?: Interval | null;
};

function endOfToday() {
  const date = new Date();
  date.setHours(23, 59, 0, 0);
  return date;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="label border-l-[3px] border-[#FF5F14] pl-2">{message}</p>;
}

function FieldLabel({ htmlFor, ai, children }: { htmlFor?: string; ai?: boolean; children: string }) {
  return (
    <span className="mb-2 flex items-center gap-2">
      <label htmlFor={htmlFor} className="label">
        {children}
      </label>
      {ai ? <TiltedTag>AI FILLED</TiltedTag> : null}
    </span>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="flex max-w-full flex-wrap border-[3px] border-[#1A1B1C] bg-white">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          disabled={disabled}
          className={`label px-3 py-2 disabled:opacity-50 ${value === option ? "bg-[#1A1B1C] text-white" : ""}`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function TransactionForm({
  accounts,
  editId,
  initial,
  defaultAccountId,
}: {
  accounts: TransactionAccount[];
  editId?: string;
  initial?: TransactionInitial | null;
  defaultAccountId: string;
}) {
  const router = useRouter();
  const editMode = Boolean(editId && initial);
  const [scanning, setScanning] = useState(false);
  const [ready, setReady] = useState(false);
  const [filled, setFilled] = useState<Set<AiField>>(new Set());
  const snapshot = useRef<Pick<FormValues, AiField> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: editMode && initial
      ? {
          type: initial.type,
          amount: Number(initial.amount).toFixed(2),
          description: initial.description,
          accountId: initial.accountId,
          category: initial.category,
          date: new Date(initial.date),
          isRecurring: initial.isRecurring,
          ...(initial.recurringInterval ? { recurringInterval: initial.recurringInterval } : {}),
        }
      : {
          type: "EXPENSE",
          amount: "",
          description: "",
          accountId: defaultAccountId,
          category: "",
          date: endOfToday(),
          isRecurring: false,
        },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    reset,
  } = form;

  const fetched = useFetch(editMode ? updateTransaction : createTransaction);
  const saving = Boolean(fetched.loading);
  const result = fetched.data as { success?: boolean; data?: { accountId?: string } } | undefined;
  const type = watch("type");
  const category = watch("category");
  const accountId = watch("accountId");
  const date = watch("date");
  const isRecurring = watch("isRecurring");
  const interval = watch("recurringInterval");
  const busy = saving || scanning;
  const categories = defaultCategories.filter((item) => item.type === type);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (result?.success && result.data?.accountId && !saving) {
      toast.success("TRANSACTION SAVED");
      reset();
      router.push(`/account/${result.data.accountId}`);
    }
  }, [result, saving, reset, router]);

  function drop(field: AiField) {
    setFilled((current) => {
      if (!current.has(field)) return current;
      const next = new Set(current);
      next.delete(field);
      return next;
    });
  }

  function onSubmit(data: FormValues) {
    if (busy) return;
    const payload = {
      type: data.type,
      amount: parseFloat(data.amount),
      description: data.description ?? "",
      date: data.date,
      accountId: data.accountId,
      category: data.category,
      isRecurring: data.isRecurring,
      ...(data.isRecurring && data.recurringInterval ? { recurringInterval: data.recurringInterval } : {}),
    };
    if (editMode && editId) fetched.fn(editId, payload);
    else fetched.fn(payload);
  }

  function applyScan(values: MappedScan) {
    if (!snapshot.current) {
      snapshot.current = {
        amount: getValues("amount"),
        date: getValues("date"),
        type: getValues("type"),
        category: getValues("category") ?? "",
        description: getValues("description") ?? "",
      };
    }
    setValue("amount", values.amount, { shouldValidate: true });
    setValue("date", values.date, { shouldValidate: true });
    setValue("type", values.type, { shouldValidate: true });
    setValue("category", values.category, { shouldValidate: true });
    setValue("description", values.description, { shouldValidate: true });
    setFilled(new Set(["amount", "date", "type", "category", "description"]));
  }

  function discardScan() {
    const saved = snapshot.current;
    if (saved) {
      setValue("amount", saved.amount);
      setValue("date", saved.date);
      setValue("type", saved.type);
      setValue("category", saved.category);
      setValue("description", saved.description);
    }
    snapshot.current = null;
    setFilled(new Set());
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          void handleSubmit(onSubmit)();
        }
      }}
      className="grid items-start gap-4 pt-6 lg:grid-cols-2"
      data-ready={ready ? "true" : undefined}
    >
      <div className="order-2 space-y-4 border-[3px] border-[#1A1B1C] bg-white p-4 lg:order-1 md:p-6">
        <div>
          <FieldLabel ai={filled.has("type")}>TYPE</FieldLabel>
          <Segmented
            label="Type"
            value={type}
            options={["EXPENSE", "INCOME"]}
            disabled={scanning}
            onChange={(value) => {
              const next = value as TxType;
              setValue("type", next, { shouldValidate: true });
              const current = getValues("category");
              if (!defaultCategories.some((item) => item.id === current && item.type === next)) {
                setValue("category", "");
              }
              drop("type");
            }}
          />
          <FieldError message={errors.type?.message} />
        </div>

        <div>
          <FieldLabel htmlFor="amount" ai={filled.has("amount")}>
            AMOUNT
          </FieldLabel>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="0.00"
            disabled={scanning}
            className="font-num h-16 text-4xl"
            {...register("amount", { onChange: () => drop("amount") })}
          />
          <FieldError message={errors.amount?.message} />
        </div>

        <div>
          <FieldLabel htmlFor="account">ACCOUNT</FieldLabel>
          <Select value={accountId} onValueChange={(value: string) => setValue("accountId", value, { shouldValidate: true })} disabled={scanning}>
            <SelectTrigger id="account">
              <SelectValue placeholder="SELECT ACCOUNT" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <span className="flex w-full items-center justify-between gap-3">
                    <span>{account.name}</span>
                    <span className="font-num">{formatCurrency(account.balance)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.accountId?.message} />
        </div>

        <div>
          <FieldLabel htmlFor="category" ai={filled.has("category")}>
            CATEGORY
          </FieldLabel>
          <Select
            value={category || undefined}
            onValueChange={(value: string) => {
              setValue("category", value, { shouldValidate: true });
              drop("category");
            }}
            disabled={scanning}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="SELECT CATEGORY" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.category?.message} />
        </div>

        <div>
          <FieldLabel ai={filled.has("date")}>DATE</FieldLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={scanning}
                className={cn("w-full justify-start font-num", !date && "text-muted-foreground")}
              >
                {date ? format(date, "PPP") : "PICK A DATE"}
                <CalendarIcon className="ml-auto h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(next: Date | undefined) => {
                  if (!next) return;
                  setValue("date", next, { shouldValidate: true });
                  drop("date");
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FieldError message={errors.date?.message} />
        </div>

        <div>
          <FieldLabel htmlFor="description" ai={filled.has("description")}>
            DESCRIPTION
          </FieldLabel>
          <Input
            id="description"
            placeholder="WHAT WAS THIS FOR"
            disabled={scanning}
            {...register("description", { onChange: () => drop("description") })}
          />
          <FieldError message={errors.description?.message} />
        </div>

        <div className="flex items-center justify-between gap-3 border-[3px] border-[#1A1B1C] p-3">
          <label htmlFor="recurring" className="label">
            RECURRING
          </label>
          <Switch
            id="recurring"
            checked={isRecurring}
            disabled={scanning}
            onCheckedChange={(checked: boolean) => setValue("isRecurring", checked === true, { shouldValidate: true })}
          />
        </div>

        {isRecurring ? (
          <div>
            <FieldLabel>INTERVAL</FieldLabel>
            <Segmented
              label="Interval"
              value={interval}
              options={["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]}
              disabled={scanning}
              onChange={(value) => setValue("recurringInterval", value as Interval, { shouldValidate: true })}
            />
            <FieldError message={errors.recurringInterval?.message} />
          </div>
        ) : null}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            CANCEL
          </Button>
          <Button type="submit" className="flex-1" disabled={busy}>
            {saving ? "SAVING..." : "SAVE TRANSACTION"}
          </Button>
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <ReceiptPanel onApply={applyScan} onDiscard={discardScan} onScanningChange={setScanning} />
      </div>
    </form>
  );
}
