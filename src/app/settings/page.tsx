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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useApiKeys } from "@/lib/hooks/useApiKeys";
import { zodResolver } from "@hookform/resolvers/zod";
import { Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  gemini: z.string().min(1, "Gemini API key is required."),
  elevenlabs: z.string().min(1, "ElevenLabs API key is required."),
});

export default function SettingsPage() {
  const { apiKeys, saveApiKeys, isLoaded } = useApiKeys();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gemini: "",
      elevenlabs: "",
    },
  });

  const [model, setModel] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("geminiModel") || "flash";
    }
    return "flash";
  });
  const [showTick, setShowTick] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      form.reset(apiKeys);
    }
  }, [isLoaded, apiKeys, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    saveApiKeys(values);
    localStorage.setItem("geminiModel", model);
    form.reset(values);
    setShowTick(true);
    setTimeout(() => setShowTick(false), 2000);
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Enter your API keys for Gemini and ElevenLabs. Your keys are saved
            securely in your browser's local storage and never leave your
            machine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="gemini"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gemini API Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your Gemini API key"
                        {...field}
                        type="password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="elevenlabs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ElevenLabs API Key</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your ElevenLabs API key"
                        {...field}
                        type="password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <label className="block text-sm font-medium mb-1">Gemini Model</label>
                <select
                  className="border rounded p-2 w-full"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                >
                  <option value="flash">Gemini 2.5 Flash</option>
                  <option value="pro">Gemini 2.5 Pro</option>
                </select>
              </div>
              <Button type="submit">Save Keys</Button>
              {showTick && (
                <span className="ml-4 text-green-600 font-bold">&#10003; Updated</span>
              )}
            </form>
          </Form>
          <Alert className="mt-8">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Credit & Quota Warning</AlertTitle>
            <AlertDescription>
              Please ensure you have sufficient credits on your Gemini and
              ElevenLabs accounts to avoid service interruptions during practice
              sessions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
