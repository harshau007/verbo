"use client";

import { Avatar } from "@/components/Avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiKeys } from "@/lib/hooks/useApiKeys";
import { Session, useSessionStore } from "@/lib/store/useSessionStore";
import { AlertCircle, Loader2, Mic, MicOff, Square } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function PracticePage() {
  const router = useRouter();
  const { sessionId } = useParams() as { sessionId: string };
  const { sessions, updateSession } = useSessionStore();
  const { apiKeys, isLoaded } = useApiKeys();

  const [session, setSession] = useState<Session | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const current = sessions[sessionId];
    if (current) setSession(current);
  }, [sessions, sessionId]);

  const processAudio = useCallback(
    async (blob: Blob) => {
      if (!apiKeys.gemini || !apiKeys.elevenlabs) {
        setError("API keys are not set. Please configure them in Settings.");
        return;
      }
      setIsProcessing(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("audio", blob);
        form.append("apiKey", apiKeys.gemini);
        form.append(
          "promptContext",
          `The user is practicing ${session?.language} at ${session?.cefrLevel} on "${session?.topic}".`
        );
        const rRes = await fetch("/api/gemini/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKeys.gemini,
            transcript: [{ speaker: "user", text: "User text not available" }],
            sessionInfo: session,
          }),
        });
        if (!rRes.ok) throw new Error(await rRes.text());
        const { text: aiText } = await rRes.json();

        const ttsRes = await fetch("/api/elevenlabs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: aiText, apiKey: apiKeys.elevenlabs }),
        });
        if (!ttsRes.ok) throw new Error(await ttsRes.text());
        const blobResp = await ttsRes.blob();
        setAiAudioUrl(URL.createObjectURL(blobResp));
      } catch (e: any) {
        setError(e.message || "Unknown error");
      } finally {
        setIsProcessing(false);
      }
    },
    [apiKeys, session, sessionId]
  );

  const handleStartRecording = async () => {
    if (!isLoaded || !apiKeys.gemini || !apiKeys.elevenlabs) {
      return setError("Please set API keys in Settings.");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsRecording(true);
      setAiAudioUrl(null);
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) =>
        audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () =>
        processAudio(new Blob(audioChunksRef.current, { type: "audio/webm" }));
      mediaRecorderRef.current.start();
    } catch (e) {
      setError("Could not access microphone.");
      setIsRecording(false);
    }
  };

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleEndSession = async () => {
    setIsLoadingFeedback(true);
    try {
      const response = await fetch("/api/gemini/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeys.gemini,
          sessionInfo: session,
        }),
      });
      if (!response.ok) {
        setIsLoadingFeedback(false);
        throw new Error("Failed to get feedback from AI");
      }
      const data = await response.json();
      updateSession(sessionId, {
        feedback: data.feedback,
        cefrConfirmation: data.cefrConfirmation,
        ieltsBand: data.ieltsBand, // Will add this to Session type next
      });
      setIsLoadingFeedback(false);
      router.push(`/review/${sessionId}`);
    } catch (err: any) {
      setIsLoadingFeedback(false);
      setError(err.message || "An unknown error occurred while generating feedback.");
    }
  };

  if (!session)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );

  const rate =
    session.cefrLevel === "A1" || session.cefrLevel === "A2" ? 0.75 : 1;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full">
      <Card className="mb-8 w-full max-w-md">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            <strong>Name:</strong> {session.name}
          </p>
          <p>
            <strong>Language:</strong> {session.language}
          </p>
          <p>
            <strong>Level:</strong> {session.cefrLevel}
          </p>
          <p>
            <strong>Topic:</strong> {session.topic}
          </p>
        </CardContent>
      </Card>
      <div className="flex flex-col items-center space-y-4 w-full max-w-md">
        <Avatar
          audioUrl={aiAudioUrl}
          isProcessing={isProcessing}
          playbackRate={rate}
        />
        <div className="flex space-x-2 w-full">
          <Button
            onClick={handleStartRecording}
            disabled={isRecording || isProcessing}
            size="lg"
            className="flex-1"
          >
            <Mic className="mr-2 h-5 w-5" />
            Start
          </Button>
          <Button
            onClick={handleStopRecording}
            disabled={!isRecording || isProcessing}
            size="lg"
            variant="secondary"
            className="flex-1"
          >
            <MicOff className="mr-2 h-5 w-5" />
            Stop
          </Button>
        </div>
        <Button
          onClick={handleEndSession}
          variant="destructive"
          className="w-full"
          disabled={isLoadingFeedback}
        >
          <Square className="mr-2 h-5 w-5" />
          End Session
        </Button>
        {isRecording && (
          <p className="text-sm text-green-400 animate-pulse">
            Recording...
          </p>
        )}
        {isLoadingFeedback && (
          <div className="flex flex-col items-center justify-center w-full mt-4">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Generating feedback and assessment...</p>
          </div>
        )}
        <p className="text-sm text-gray-500">
          Your audio will be sent directly to the AI for a response.
        </p>
        {error && (
          <Alert variant="destructive" className="mt-4 w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="text-wrap">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
