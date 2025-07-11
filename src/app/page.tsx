"use client";

import { NewSessionModal } from "@/components/NewSessionModal";
import { SessionList } from "@/components/SessionList";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <NewSessionModal />
      </div>
      <SessionList />
    </div>
  );
}
