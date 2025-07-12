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
    const { apiKey, sessionInfo, model } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not provided" },
        { status: 400 }
      );
    }

    if (!sessionInfo) {
      return NextResponse.json(
        { error: "Session info is required" },
        { status: 400 }
      );
    }

    const geminiModel = model || "flash";
    const modelInstance = initializeModel(apiKey, geminiModel);

    const prompt = `
      You are an IELTS Speaking examiner generating a Part 2 topic for a student.
      
      Student Information:
      - Language: ${sessionInfo.language}
      - CEFR Level: ${sessionInfo.cefrLevel}
      - General Topic: ${sessionInfo.topic}
      
      Generate a Part 2 topic that is:
      1. Appropriate for the student's level (${sessionInfo.cefrLevel})
      2. Related to the general topic area: ${sessionInfo.topic}
      3. Suitable for a 1-2 minute speaking task
      4. Engaging and personal (e.g., "Describe a place you visited", "Talk about a person who influenced you")
      
      Return ONLY the topic in a simple, clear format. For example:
      "Describe a memorable journey you took"
      "Talk about a book that had a significant impact on you"
      "Describe a place where you like to spend your free time"
      
      Keep it concise and appropriate for IELTS Part 2 format.
    `;

    const result = await modelInstance.generateContent(prompt);
    const topic = result.response.text().trim();

    return NextResponse.json({ topic });
  } catch (error: any) {
    console.error("Error generating Part 2 topic:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate topic" },
      { status: 500 }
    );
  }
} 