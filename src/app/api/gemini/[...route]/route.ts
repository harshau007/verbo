import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";

const initializeModel = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  });
};

async function handleTranscribe(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as Blob | null;
    const apiKey = formData.get("apiKey") as string | null;
    const promptContext = formData.get("promptContext") as string | null;

    if (!apiKey)
      return NextResponse.json(
        { error: "Gemini API key not provided" },
        { status: 400 }
      );
    if (!audioBlob)
      return NextResponse.json({ error: "No audio provided" }, { status: 400 });

    const model = initializeModel(apiKey);
    const audioBuffer = await audioBlob.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    const result = await model.generateContent([
      {
        text: `${
          promptContext || "Please transcribe the following audio."
        } The user's speech is in the audio file. Return only the transcribed text.`,
      },
      { inlineData: { mimeType: audioBlob.type, data: audioBase64 } },
    ]);

    const text = result.response.text();
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Error in Gemini transcription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process with Gemini" },
      { status: 500 }
    );
  }
}

async function handleRespond(request: NextRequest) {
  try {
    const { apiKey, transcript, sessionInfo } = await request.json();

    if (!apiKey)
      return NextResponse.json(
        { error: "Gemini API key not provided" },
        { status: 400 }
      );
    if (!transcript || !sessionInfo)
      return NextResponse.json(
        { error: "Transcript and session info are required" },
        { status: 400 }
      );

    const model = initializeModel(apiKey);
    const prompt = `
            You are an AI language tutor. A student is practicing ${
              sessionInfo.language
            } at a ${sessionInfo.cefrLevel} level.
            The topic of conversation is "${sessionInfo.topic}".
            Here is the conversation so far:
            ${transcript.map((t: any) => `${t.speaker}: ${t.text}`).join("\n")}

            Your task is to provide a natural, engaging, and contextually relevant response to the user's last message.
            Keep your response concise and appropriate for their CEFR level.
            Return ONLY your response text, with no additional text, markdown, or explanations.
        `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Error in Gemini response generation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}

async function handleFeedback(request: NextRequest) {
  try {
    const { apiKey, transcript, sessionInfo } = await request.json();

    if (!apiKey)
      return NextResponse.json(
        { error: "Gemini API key not provided" },
        { status: 400 }
      );
    if (!transcript || !sessionInfo)
      return NextResponse.json(
        { error: "Transcript and session info are required" },
        { status: 400 }
      );

    const model = initializeModel(apiKey);
    const prompt = `
            You are an expert CEFR language examiner. A student has just completed a practice session.
            - Language: ${sessionInfo.language}
            - Stated CEFR Level: ${sessionInfo.cefrLevel}
            - Topic: ${sessionInfo.topic}

            Here is the full transcript of their conversation:
            ${transcript.map((t: any) => `${t.speaker}: ${t.text}`).join("\n")}

            Your tasks are:
            1.  Provide constructive feedback on the user's performance, focusing on grammar, vocabulary, pronunciation (based on the text), and fluency. Keep it encouraging.
            2.  Confirm if their performance aligns with the stated ${
              sessionInfo.cefrLevel
            } level. You can suggest a higher or lower level if appropriate.

            Return the data in this exact JSON structure, with no additional text, markdown, or explanations:
            {
              "feedback": "Your detailed, constructive feedback here.",
              "cefrConfirmation": "Your assessment of their CEFR level here (e.g., 'Your performance aligns well with B2 level.' or 'This performance is closer to an A2 level.')."
            }
        `;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleanedText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const jsonResponse = JSON.parse(cleanedText);

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error("Error in Gemini feedback generation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate feedback" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  const route = (await params).route[0];

  switch (route) {
    case "transcribe":
      return handleTranscribe(request);
    case "respond":
      return handleRespond(request);
    case "feedback":
      return handleFeedback(request);
    default:
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
}
