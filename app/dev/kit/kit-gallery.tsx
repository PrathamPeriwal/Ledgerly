// @ts-nocheck
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDate } from "@/lib/format";

const swatches = [
  ["background", "#E3E7EB"],
  ["ink", "#1A1B1C"],
  ["orange", "#FF5F14"],
  ["white", "#FFFFFF"],
  ["muted", "#D5DAE0"],
  ["muted text", "#5B6068"],
  ["grid", "#CBD1D8"],
  ["destructive", "#D92D20"],
];

const rows = [
  ["Rent", formatDate("2026-10-01"), formatCurrency(-1800)],
  ["Paycheck", formatDate("2026-10-15"), formatCurrency(4200, { sign: true })],
  ["Groceries", formatDate("2026-10-18"), formatCurrency(-86.4)],
];

export function KitGallery() {
  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 9, 21));

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-5xl space-y-12 px-6 py-16">
        <header>
          <p className="label text-muted-foreground">Dev / kit</p>
          <h1 className="display mt-3 text-6xl">Ledgerly</h1>
        </header>

        <section className="space-y-3">
          <h2 className="label">Type</h2>
          <p className="display text-5xl">Display 700</p>
          <p className="label">Label 12 / 0.06em</p>
          <p>Body copy in Hanken Grotesk. Numbers use Geist Mono.</p>
          <p className="font-num text-2xl">{formatCurrency(12840.5, { sign: true })}</p>
        </section>

        <section className="space-y-3">
          <h2 className="label">Color</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {swatches.map(([name, hex]) => (
              <div key={name} className="border-bw border-border bg-card">
                <div className="h-16 border-b-bw border-border" style={{ background: hex }} />
                <div className="p-2">
                  <p className="label">{name}</p>
                  <p className="font-num text-xs">{hex}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="label">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Icon">
              +
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="label">Fields</h2>
            <Input placeholder="Account name" />
            <Textarea placeholder="Note" />
            <Select defaultValue="checking">
              <SelectTrigger>
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Checking</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox
                id="default-account"
                checked={checked}
                onCheckedChange={(value) => setChecked(value === true)}
              />
              <label htmlFor="default-account" className="label">
                Default account
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="alerts" checked={on} onCheckedChange={setOn} />
              <label htmlFor="alerts" className="label">
                Alerts
              </label>
            </div>
          </div>
          <Calendar mode="single" selected={date} onSelect={setDate} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Card</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Badge>Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </CardContent>
        </Card>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row[0]}>
                {row.map((cell) => (
                  <TableCell key={cell}>{cell}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Tabs defaultValue="month">
          <TabsList>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
          <TabsContent value="month">October activity</TabsContent>
          <TabsContent value="year">Year to date</TabsContent>
        </Tabs>

        <div className="space-y-3">
          <h2 className="label">Progress</h2>
          <Progress value={42} />
          <Progress value={128} />
        </div>

        <div className="space-y-3">
          <h2 className="label">Skeleton</h2>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>

        <Command>
          <CommandInput placeholder="Search accounts" />
          <CommandList>
            <CommandEmpty>No account</CommandEmpty>
            <CommandGroup heading="Accounts">
              <CommandItem>Everyday Checking</CommandItem>
              <CommandItem>High-Yield Savings</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => toast("Budget saved")}>Show toast</Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create account</DialogTitle>
                <DialogDescription>Ink border, white surface, inner padding.</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sheet</SheetTitle>
                <SheetDescription>Same border weight as cards.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Popover</Button>
            </PopoverTrigger>
            <PopoverContent>Square popover, ink border.</PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost">Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Ink border</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
