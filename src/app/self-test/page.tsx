"use client";

import { Avatar } from "@/components/Avatar";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Mic, MicOff } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  language: z.enum(["English", "German"]),
  topic: z.string().min(3).max(50),
});

type FormValues = z.infer<typeof formSchema>;

type Feedback = {
  feedback: string;
  cefrConfirmation: string;
};

export default function SelfTestPage() {
  const { apiKeys, isLoaded } = useApiKeys();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: "English",
      topic: "Daily life",
    },
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const handleStartRecording = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setIsRecording(true);
      setAudioUrl(null);
      setTranscript(null);
      setFeedback(null);

      mediaRecorderRef.current = new MediaRecorder(streamRef.current);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) =>
        audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        processRecording(audioBlob);
      };
      mediaRecorderRef.current.start();
    } catch (err) {
      setError(
        "Microphone access denied. Please enable it in your browser settings."
      );
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    }
  };

  const processRecording = async (audioBlob: Blob) => {
    if (!apiKeys.gemini) {
      setError("Please configure your Gemini API key in Settings.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("apiKey", apiKeys.gemini);
      formData.append(
        "promptContext",
        `Transcribe the user's answer. Language: ${form.getValues(
          "language"
        )}, Topic: ${form.getValues("topic")}`
      );

      const transcribeRes = await fetch("/api/gemini/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error("Failed to transcribe audio");

      const { text } = await transcribeRes.json();
      setTranscript(text);

      const feedbackRes = await fetch("/api/gemini/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeys.gemini,
          transcript: [{ speaker: "user", text }],
          sessionInfo: {
            language: form.getValues("language"),
            cefrLevel: "A1",
            topic: form.getValues("topic"),
          },
        }),
      });

      if (!feedbackRes.ok) throw new Error("Failed to get feedback");
      const result: Feedback = await feedbackRes.json();
      setFeedback(result);

      const audioURL = URL.createObjectURL(audioBlob);
      setAudioUrl(audioURL);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Self-Test (AI Evaluation)</CardTitle>
          <CardDescription>
            Speak on a topic and get AI feedback with CEFR level estimation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={form.handleSubmit(() => {})} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Language</label>
              <select
                {...form.register("language")}
                className="mt-1 block w-full border rounded p-2"
              >
                <option>English</option>
                <option>German</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Topic</label>
              <input
                type="text"
                {...form.register("topic")}
                className="mt-1 block w-full border rounded p-2"
                placeholder="e.g., Describe your weekend"
              />
            </div>
          </form>

          <div className="flex flex-col items-center gap-4">
            <Avatar
              audioUrl={audioUrl}
              isProcessing={isProcessing}
              playbackRate={
                form.getValues("language") === "English" &&
                form.getValues("topic").startsWith("A")
                  ? 0.75
                  : 1
              }
            />
            <div className="flex gap-4">
              <Button
                onClick={handleStartRecording}
                disabled={isRecording || isProcessing}
              >
                <Mic className="mr-2 h-5 w-5" /> Start
              </Button>
              <Button
                onClick={handleStopRecording}
                disabled={!isRecording || isProcessing}
                variant="secondary"
              >
                <MicOff className="mr-2 h-5 w-5" /> Stop
              </Button>
            </div>
            {isRecording && (
              <p className="text-sm text-green-400 animate-pulse">
                Recording...
              </p>
            )}
          </div>

          {isProcessing && (
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p>Processing your response...</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {feedback && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{feedback.feedback}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>CEFR Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">
                    {feedback.cefrConfirmation}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
