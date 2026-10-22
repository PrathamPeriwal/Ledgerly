"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useRouteProgress } from "@/components/route-progress";
import type { ComponentType, ReactNode } from "react";
import {
  DropdownMenu as DropdownMenuRoot,
  DropdownMenuContent as DropdownMenuContentRoot,
  DropdownMenuItem as DropdownMenuItemRoot,
  DropdownMenuTrigger as DropdownMenuTriggerRoot,
} from "@/components/ui/dropdown-menu";

const DropdownMenu = DropdownMenuRoot as ComponentType<{ children: ReactNode }>;
const DropdownMenuTrigger = DropdownMenuTriggerRoot as ComponentType<{ asChild?: boolean; children: ReactNode }>;
const DropdownMenuContent = DropdownMenuContentRoot as ComponentType<{
  align?: "end" | "start";
  className?: string;
  children: ReactNode;
}>;
const DropdownMenuItem = DropdownMenuItemRoot as ComponentType<{
  className?: string;
  onSelect?: () => void;
  children: ReactNode;
}>;

function initials(user: {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
}) {
  const first = user.firstName?.[0] ?? user.fullName?.[0] ?? "?";
  const last = user.lastName?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export function UserMenu() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { start } = useRouteProgress();
  const image = user?.hasImage ? user.imageUrl : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex h-10 w-10 items-center justify-center overflow-hidden bg-[#1A1B1C] text-[11px] font-semibold text-white"
        >
          {image ? (
            // Clerk hosts the photo; the kit image config does not allow that host.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{user ? initials(user) : ""}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-[3px] border-[#1A1B1C]">
        <DropdownMenuItem className="label" onSelect={() => openUserProfile()}>
          MANAGE ACCOUNT
        </DropdownMenuItem>
        <DropdownMenuItem
          className="label"
          onSelect={() => {
            start();
            void signOut({ redirectUrl: "/" });
          }}
        >
          SIGN OUT
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
