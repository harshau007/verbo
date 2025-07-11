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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Full Transcript</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {session.transcript.map((entry, index) => (
            <div
              key={index}
              className={`flex ${
                entry.speaker === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`rounded-lg p-3 max-w-xl ${
                  entry.speaker === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="font-bold capitalize">{entry.speaker}</p>
                <p>{entry.text}</p>
              </div>
            </div>
          ))}
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
            transcript: session.transcript,
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
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Session Review</h1>
        <Link href="/" passHref>
          <Button>Back to Dashboard</Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center text-center p-8 border rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-lg">
            Our AI is analyzing your session and generating feedback...
          </p>
          <p className="text-muted-foreground">This may take a moment.</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Feedback Generation Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && <FeedbackDisplay session={session} />}
    </div>
  );
}
