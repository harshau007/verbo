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
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  gemini: z.string().min(1, "Gemini API key is required."),
  elevenlabs: z.string().min(1, "ElevenLabs API key is required."),
});

export function ApiKeysForm() {
  const { apiKeys, saveApiKeys } = useApiKeys();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: apiKeys,
  });

  useEffect(() => {
    form.reset(apiKeys);
  }, [apiKeys, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    saveApiKeys(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>
          Enter your API keys for Gemini and ElevenLabs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="gemini"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gemini API Key</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your Gemini API key"
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
                      placeholder="Your ElevenLabs API key"
                      {...field}
                      type="password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Save Keys</Button>
          </form>
        </Form>
        <Alert className="mt-6">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Quota Warning</AlertTitle>
          <AlertDescription>
            Ensure you have sufficient credits on your Gemini and ElevenLabs
            accounts to avoid service interruptions.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
