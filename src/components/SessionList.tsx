"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionStore } from "@/lib/store/useSessionStore";
import Link from "next/link";

export function SessionList() {
  const sessions = useSessionStore((state) => state.sessions);
  const deleteSession = useSessionStore((state) => state.deleteSession);

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this session?")) {
      deleteSession(id);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Past Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        {Object.values(sessions).length === 0 ? (
          <p>No past sessions found.</p>
        ) : (
          <ul className="space-y-2">
            {Object.values(sessions).map((session) => (
              <li
                key={session.id}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2 border rounded"
              >
                <span className="mb-2 sm:mb-0">
                  {session.name} ({session.language}, {session.cefrLevel})
                </span>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Link href={`/review/${session.id}`} passHref>
                    <Button variant="outline" className="w-full sm:w-auto">Review</Button>
                  </Link>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(session.id)}
                    className="w-full sm:w-auto"
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
