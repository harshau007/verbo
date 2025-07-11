"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useApiKeys } from "@/lib/hooks/useApiKeys";
import { Session, useSessionStore } from "@/lib/store/useSessionStore";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function FeedbackDisplay({ session }: { session: Session }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Feedback</CardTitle>
          <CardDescription>
            An analysis of your performance in this session.
          </CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert">
          {session.feedback ? (
            <p>{session.feedback}</p>
          ) : (
            <p>No feedback was generated for this session.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CEFR Level Confirmation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold">
            {session.cefrConfirmation || "Level could not be confirmed."}
          </p>
          {session.ieltsBand && (
            <p className="text-lg font-semibold mt-4 text-blue-600">
              IELTS Band: {session.ieltsBand}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ReviewPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const { sessions, updateSession } = useSessionStore();
  const session = sessions[sessionId];
  const { apiKeys } = useApiKeys();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFeedback = useCallback(async () => {
    if (session && !session.feedback && apiKeys.gemini) {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/gemini/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKeys.gemini,
            sessionInfo: {
              language: session.language,
              cefrLevel: session.cefrLevel,
              topic: session.topic,
            },
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to get feedback from the server."
          );
        }
        const data = await response.json();
        updateSession(sessionId, {
          feedback: data.feedback,
          cefrConfirmation: data.cefrConfirmation,
        });
      } catch (err: any) {
        console.error("Failed to get feedback", err);
        setError(
          err.message || "An unknown error occurred while generating feedback."
        );
      } finally {
        setIsLoading(false);
      }
    }
  }, [session, apiKeys.gemini, updateSession, sessionId]);

  useEffect(() => {
    getFeedback();
  }, [getFeedback]);

  if (!session) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full">
      <div className="w-full max-w-xl space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>AI-Generated Feedback</CardTitle>
            <CardDescription>
              An analysis of your performance in this session.
            </CardDescription>
          </CardHeader>
          <CardContent className="prose dark:prose-invert">
            {session.feedback ? (
              <p>{session.feedback}</p>
            ) : (
              <p>No feedback was generated for this session.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CEFR Level Confirmation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {session.cefrConfirmation || "Level could not be confirmed."}
            </p>
            {session.ieltsBand && (
              <p className="text-lg font-semibold mt-4 text-blue-600">
                IELTS Band: {session.ieltsBand}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
