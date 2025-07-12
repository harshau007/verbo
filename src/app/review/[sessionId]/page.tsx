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
import { AlertCircle, ChevronDown, ChevronUp, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MarkdownPreview from '@uiw/react-markdown-preview';

function ConversationMarkdown({ source, isUser }: { source: string; isUser: boolean }) {
  return (
    <div className={`conversation-markdown ${isUser ? 'user-message' : 'ai-message'}`}>
      <MarkdownPreview 
        source={source} 
        className="conversation-markdown-content"
        style={{
          backgroundColor: 'transparent',
          color: isUser ? 'white' : 'inherit',
          fontSize: '0.875rem',
          lineHeight: '1.25rem',
          borderRadius: '0.5rem',
        }}
      />
    </div>
  );
}

export default function ReviewPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const { sessions, updateSession, ensureTranscript } = useSessionStore();
  const session = sessions[sessionId];
  const { apiKeys } = useApiKeys();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (session && !session.transcript) {
      ensureTranscript(sessionId);
    }
  }, [session, sessionId, ensureTranscript]);

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
            transcript: session.transcript || [],
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
          ieltsBand: data.ieltsBand,
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
        <div className="flex pt-5 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
        
        {(session.transcript && session.transcript.length > 0) && (
          <Card>
            <CardHeader 
              className="cursor-pointer transition-colors"
              onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Conversation Transcript
                  </CardTitle>
                  <CardDescription>
                    Your conversation with the AI tutor during this session.
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="p-1">
                  {isTranscriptOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {isTranscriptOpen && (
              <CardContent>
                <div className="space-y-6 max-h-96 overflow-y-auto">
                  {session.transcript.filter(entry => entry.part === "part1").length > 0 && (
                    <div>
                      <h4 className="font-semibold text-blue-600 mb-3">Part 1: Introduction and Interview</h4>
                      <div className="space-y-4">
                        {session.transcript
                          .filter(entry => entry.part === "part1")
                          .map((entry, index) => (
                            <div
                              key={`part1-${index}`}
                              className={`flex ${entry.speaker === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] p-3 rounded-tl-2xl rounded-tr-2xl ${
                                  entry.speaker === "user"
                                    ? "bg-blue-500 text-white rounded-bl-2xl"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-br-2xl"
                                }`}
                              >
                                <div className="text-xs font-medium mb-1 opacity-75">
                                  {entry.speaker === "user" ? "You" : "AI Tutor"}
                                </div>
                                <div className="text-sm">
                                  <ConversationMarkdown 
                                    source={entry.text} 
                                    isUser={entry.speaker === "user"}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {session.transcript.filter(entry => entry.part === "part2").length > 0 && (
                    <div>
                      <h4 className="font-semibold text-green-600 mb-3">Part 2: Individual Long Turn</h4>
                      {session.part2Topic && (
                        <div className="mb-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p className="font-semibold text-sm">Topic:</p>
                          <p className="text-sm">{session.part2Topic}</p>
                        </div>
                      )}
                      <div className="space-y-4">
                        {session.transcript
                          .filter(entry => entry.part === "part2")
                          .map((entry, index) => (
                            <div
                              key={`part2-${index}`}
                              className={`flex ${entry.speaker === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] p-3 rounded-tl-2xl rounded-tr-2xl ${
                                  entry.speaker === "user"
                                    ? "bg-green-500 text-white rounded-bl-2xl"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-br-2xl"
                                }`}
                              >
                                <div className="text-xs font-medium mb-1 opacity-75">
                                  {entry.speaker === "user" ? "You" : "AI Tutor"}
                                </div>
                                <div className="text-sm">
                                  <ConversationMarkdown 
                                    source={entry.text} 
                                    isUser={entry.speaker === "user"}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {session.transcript.filter(entry => entry.part === "part3").length > 0 && (
                    <div>
                      <h4 className="font-semibold text-purple-600 mb-3">Part 3: Two-Way Discussion</h4>
                      <div className="space-y-4">
                        {session.transcript
                          .filter(entry => entry.part === "part3")
                          .map((entry, index) => (
                            <div
                              key={`part3-${index}`}
                              className={`flex ${entry.speaker === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] p-3 rounded-tl-2xl rounded-tr-2xl ${
                                  entry.speaker === "user"
                                    ? "bg-purple-500 text-white rounded-bl-2xl"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-br-2xl"
                                }`}
                              >
                                <div className="text-xs font-medium mb-1 opacity-75">
                                  {entry.speaker === "user" ? "You" : "AI Tutor"}
                                </div>
                                <div className="text-sm">
                                  <ConversationMarkdown 
                                    source={entry.text} 
                                    isUser={entry.speaker === "user"}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        )}
        
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
          >
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  AI-Generated Feedback
                </CardTitle>
                <CardDescription>
                  Comprehensive analysis of your IELTS Speaking performance across all parts.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="p-1">
                {isFeedbackOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {isFeedbackOpen && (
            <CardContent>
              {session.feedback ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="max-w-none">
                      <MarkdownPreview source={session.feedback} style={{
                        backgroundColor: 'transparent',
                      }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No feedback was generated for this session.</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Assessment Results
            </CardTitle>
            <CardDescription>
              Your CEFR level confirmation and IELTS band estimation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">CEFR Level Assessment</h4>
                <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                  {session.cefrConfirmation || "Level could not be confirmed."}
                </p>
              </div>
              
              {session.ieltsBand && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">IELTS Speaking Band</h4>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {session.ieltsBand}
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Estimated based on your performance across all three parts
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
