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
  const { sessions, addTranscriptEntry } = useSessionStore();
  const { apiKeys, isLoaded } = useApiKeys();

  const [session, setSession] = useState<Session | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const tRes = await fetch("/api/gemini/transcribe", {
          method: "POST",
          body: form,
        });
        if (!tRes.ok) throw new Error(await tRes.text());
        const { text: userText } = await tRes.json();
        addTranscriptEntry(sessionId, { speaker: "user", text: userText });

        const transcript = [
          ...(session?.transcript || []),
          { speaker: "user", text: userText },
        ];
        const rRes = await fetch("/api/gemini/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: apiKeys.gemini,
            transcript,
            sessionInfo: session,
          }),
        });
        if (!rRes.ok) throw new Error(await rRes.text());
        const { text: aiText } = await rRes.json();
        addTranscriptEntry(sessionId, { speaker: "ai", text: aiText });

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
    [apiKeys, session, sessionId, addTranscriptEntry]
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

  const handleEndSession = () => {
    handleStopRecording();
    router.push(`/review/${sessionId}`);
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
    <div className="container mx-auto py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
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
          <div className="flex flex-col items-center p-4 space-y-4">
            <Avatar
              audioUrl={aiAudioUrl}
              isProcessing={isProcessing}
              playbackRate={rate}
            />
            <div className="flex space-x-2">
              <Button
                onClick={handleStartRecording}
                disabled={isRecording || isProcessing}
                size="lg"
              >
                <Mic className="mr-2 h-5 w-5" />
                Start
              </Button>
              <Button
                onClick={handleStopRecording}
                disabled={!isRecording || isProcessing}
                size="lg"
                variant="secondary"
              >
                <MicOff className="mr-2 h-5 w-5" />
                Stop
              </Button>
            </div>
            <Button
              onClick={handleEndSession}
              variant="destructive"
              className="w-full"
            >
              <Square className="mr-2 h-5 w-5" />
              End Session
            </Button>
            {isRecording && (
              <p className="text-sm text-green-400 animate-pulse">
                Recording...
              </p>
            )}
          </div>
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent className="h-[60vh] overflow-y-auto space-y-4">
              {session.transcript.length === 0 && (
                <p className="text-muted-foreground">
                  Conversation appears here.
                </p>
              )}
              {session.transcript.map((entry, i) => (
                <div
                  key={i}
                  className={`flex ${
                    entry.speaker === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`rounded-lg p-3 max-w-md ${
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
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="rounded-lg p-3 max-w-md bg-muted">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}
