"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const formSchema = z.object({
  language: z.enum(["English", "German"]),
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .max(30, "Name must be no more than 30 characters."),
  topic: z
    .string()
    .min(3, "Topic must be at least 3 characters.")
    .max(50, "Topic must be 50 characters or less."),
});

type FormValues = z.infer<typeof formSchema>;

type SessionSetupProps = {
  onSessionStart: () => void;
};

export function SessionSetup({ onSessionStart }: SessionSetupProps) {
  const router = useRouter();
  const addSession = useSessionStore((state) => state.addSession);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      language: "English",
      cefrLevel: "B1",
      name: "",
      topic: "Daily routines",
    },
  });

  function onSubmit(values: FormValues) {
    const sessionId = uuidv4();
    addSession({
      id: sessionId,
      language: values.language,
      cefrLevel: values.cefrLevel,
      name: values.name,
      topic: values.topic,
      transcript: [],
      currentPart: "part1",
      createdAt: new Date().toISOString(),
    });
    onSessionStart();
    router.push(`/practice/${sessionId}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Language</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cefrLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEFR Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Session name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Topic</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Ordering food at a restaurant"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Start Practice
        </Button>
      </form>
    </Form>
  );
}
