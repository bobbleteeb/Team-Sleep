"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AccountNav, type SidebarView } from "./AccountNav";

type Props = {
  userName?: string | null;
  sidebarView: SidebarView;
  onSelectView: (view: Exclude<SidebarView, "none">) => void;
};

export function MobileAccountDrawer({ userName, sidebarView, onSelectView }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" className="md:hidden rounded-full px-4" />
        }
      >
        🔥 My Account
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-80">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>My Account</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-5rem)]">
          <AccountNav
            userName={userName}
            sidebarView={sidebarView}
            onSelectView={(v) => onSelectView(v)}
            onClosePanel={() => setOpen(false)}
          />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

