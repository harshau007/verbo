"use client";

import { Avatar } from "@/components/Avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useApiKeys } from "@/lib/hooks/useApiKeys";
import { Session, useSessionStore } from "@/lib/store/useSessionStore";
import { AlertCircle, Loader2, Mic, MicOff, Square } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function PracticePage() {
  const router = useRouter();
  const { sessionId } = useParams() as { sessionId: string };
  const { sessions, updateSession, addTranscriptEntry, ensureTranscript } = useSessionStore();
  const { apiKeys, isLoaded } = useApiKeys();

  const [session, setSession] = useState<Session | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);
  const [part2Topic, setPart2Topic] = useState<string>("");
  const [isPart2Preparation, setIsPart2Preparation] = useState(false);
  const [preparationTime, setPreparationTime] = useState<number>(60);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const current = sessions[sessionId];
    if (current) {
      if (!current.transcript) {
        ensureTranscript(sessionId);
      }
      setSession(current);
    }
  }, [sessions, sessionId, ensureTranscript]);

  useEffect(() => {
    if (session?.currentPart === "part2" && !session.part2Topic) {
      generatePart2Topic();
    }
  }, [session?.currentPart, session?.part2Topic]);

  const generatePart2Topic = async () => {
    if (!apiKeys.gemini) return;
    
    try {
      const response = await fetch("/api/gemini/generate-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeys.gemini,
          sessionInfo: session,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPart2Topic(data.topic);
        updateSession(sessionId, { part2Topic: data.topic });
      }
    } catch (error) {
      console.error("Failed to generate Part 2 topic:", error);
    }
  };

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
        form.append("sessionInfo", JSON.stringify(session));
        form.append("currentPart", session?.currentPart || "part1");
        form.append("model", "flash");
        
        const rRes = await fetch("/api/gemini/respond", {
          method: "POST",
          body: form,
        });
        if (!rRes.ok) throw new Error(await rRes.text());
        const data = await rRes.json();
        console.log(data);
        const { response, transcript, part } = data;
        console.log(response, transcript);
        addTranscriptEntry(sessionId, { speaker: "user", text: transcript, part: part });
        addTranscriptEntry(sessionId, { speaker: "ai", text: response, part: part });

        const ttsRes = await fetch("/api/elevenlabs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: response, apiKey: apiKeys.elevenlabs }),
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

  const moveToNextPart = () => {
    if (!session) return;
    
    const nextPart = session.currentPart === "part1" ? "part2" : 
                    session.currentPart === "part2" ? "part3" : null;
    
    if (nextPart) {
      updateSession(sessionId, { currentPart: nextPart });
      setAiAudioUrl(null);
      
      if (nextPart === "part2") {
        setIsPart2Preparation(true);
        setPreparationTime(60);
        const timer = setInterval(() => {
          setPreparationTime((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setIsPart2Preparation(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  };

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
          transcript: session?.transcript || [],
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
        ieltsBand: data.ieltsBand,
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

  const getPartTitle = (part: string) => {
    switch (part) {
      case "part1": return "Part 1: Introduction and Interview";
      case "part2": return "Part 2: Individual Long Turn";
      case "part3": return "Part 3: Two-Way Discussion";
      default: return "IELTS Speaking Test";
    }
  };

  const getPartDescription = (part: string) => {
    switch (part) {
      case "part1": return "General questions about familiar topics (4-5 minutes)";
      case "part2": return "Speak for 1-2 minutes on a given topic";
      case "part3": return "In-depth discussion on abstract topics (4-5 minutes)";
      default: return "";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full">
      <Card className="mb-8 w-full max-w-md">
        <CardHeader>
          <CardTitle>{getPartTitle(session.currentPart || "part1")}</CardTitle>
          <CardDescription>{getPartDescription(session.currentPart || "part1")}</CardDescription>
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
          {session.currentPart === "part2" && session.part2Topic && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="font-semibold">Topic:</p>
              <p>{session.part2Topic}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {session.currentPart === "part2" && isPart2Preparation && (
        <Card className="mb-8 w-full max-w-md">
          <CardHeader>
            <CardTitle>Preparation Time</CardTitle>
            <CardDescription>You have 1 minute to prepare your response</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold text-blue-600">{preparationTime}s</div>
            <p className="mt-2 text-sm text-gray-600">Think about what you want to say</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col items-center space-y-4 w-full max-w-md">
        <Avatar
          audioUrl={aiAudioUrl}
          isProcessing={isProcessing}
          playbackRate={rate}
        />
        
        {session.currentPart !== "part2" || !isPart2Preparation ? (
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
        ) : null}

        {session.currentPart === "part1" && (
          <Button
            onClick={moveToNextPart}
            variant="outline"
            className="w-full"
            disabled={isProcessing}
          >
            Move to Part 2
          </Button>
        )}

        {session.currentPart === "part2" && !isPart2Preparation && (
          <Button
            onClick={moveToNextPart}
            variant="outline"
            className="w-full"
            disabled={isProcessing}
          >
            Move to Part 3
          </Button>
        )}

        {session.currentPart === "part3" && (
          <Button
            onClick={handleEndSession}
            variant="destructive"
            className="w-full"
            disabled={isLoadingFeedback}
          >
            <Square className="mr-2 h-5 w-5" />
            End Session
          </Button>
        )}

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
