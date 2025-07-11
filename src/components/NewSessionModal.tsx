"use client";

import { SessionSetup } from "@/components/SessionSetup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

export function NewSessionModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>New Session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a New Practice Session</DialogTitle>
        </DialogHeader>
        <SessionSetup onSessionStart={() => setIsOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
