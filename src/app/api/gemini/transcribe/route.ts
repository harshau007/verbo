import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const initializeModel = (apiKey: string, modelName: string = "flash") => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: modelName === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File;
    const apiKey = formData.get("apiKey") as string;
    const promptContext = formData.get("promptContext") as string;
    const model = formData.get("model") as string || "flash";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not provided" },
        { status: 400 }
      );
    }

    if (!audio) {
      return NextResponse.json(
        { error: "Audio file not provided" },
        { status: 400 }
      );
    }

    const modelInstance = initializeModel(apiKey, model);
    
    const audioBuffer = await audio.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    const prompt = `
      ${promptContext || "Transcribe the following audio accurately."}
      
      IMPORTANT: Provide your response in English, regardless of the language being transcribed.
      
      Please provide only the transcript of what was said, without any additional commentary or formatting.
    `;

    const result = await modelInstance.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: audio.type || "audio/webm",
          data: base64Audio,
        },
      },
    ]);

    const text = result.response.text();
    return NextResponse.json({ text: text.trim() });
  } catch (error: any) {
    console.error("Error in transcription:", error);
    return NextResponse.json(
      { error: error.message || "Failed to transcribe audio" },
      { status: 500 }
    );
  }
} 