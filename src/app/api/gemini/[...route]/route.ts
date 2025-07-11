import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";

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

async function handleRespond(request: NextRequest) {
  try {
    const { apiKey, sessionInfo, model } = await request.json();

    if (!apiKey)
      return NextResponse.json(
        { error: "Gemini API key not provided" },
        { status: 400 }
      );
    if (!sessionInfo)
      return NextResponse.json(
        { error: "Session info is required" },
        { status: 400 }
      );

    const geminiModel = model || "flash";
    const modelInstance = initializeModel(apiKey, geminiModel);
    const prompt = `
            You are an AI language tutor. A student is practicing ${
              sessionInfo.language
            } at a ${sessionInfo.cefrLevel} level.
            The topic of conversation is "${sessionInfo.topic}".
            The user has just sent an audio message. Reply with a natural, engaging, and contextually relevant response for their CEFR level. Do not reference any transcript or previous conversation.
            Return ONLY your response text, with no additional text, markdown, or explanations.
        `;

    const result = await modelInstance.generateContent(prompt);
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
    const { apiKey, sessionInfo, model } = await request.json();

    if (!apiKey)
      return NextResponse.json(
        { error: "Gemini API key not provided" },
        { status: 400 }
      );
    if (!sessionInfo)
      return NextResponse.json(
        { error: "Session info is required" },
        { status: 400 }
      );

    const geminiModel = model || "flash";
    const modelInstance = initializeModel(apiKey, geminiModel);
    const prompt = `
            You are an expert CEFR language examiner and IELTS examiner. A student has just completed a practice session.
            - Language: ${sessionInfo.language}
            - Stated CEFR Level: ${sessionInfo.cefrLevel}
            - Topic: ${sessionInfo.topic}

            Provide constructive feedback on the user's performance, focusing on grammar, vocabulary, and fluency. Keep it encouraging. Since no transcript is available, base your feedback on the session info only.
            Confirm if their performance aligns with the stated ${sessionInfo.cefrLevel} level. You can suggest a higher or lower level if appropriate.
            Also, estimate the user's IELTS speaking band (e.g., 'Band 5', 'Band 6.5', etc.) based on the session info and your best judgment.

            Return the data in this exact JSON structure, with no additional text, markdown, or explanations:
            {
              "feedback": "Your detailed, constructive feedback here.",
              "cefrConfirmation": "Your assessment of their CEFR level here (e.g., 'Your performance aligns well with B2 level.' or 'This performance is closer to an A2 level.').",
              "ieltsBand": "Your estimated IELTS speaking band here (e.g., 'Band 6.5')."
            }
        `;

    const result = await modelInstance.generateContent(prompt);
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
    case "respond":
      return handleRespond(request);
    case "feedback":
      return handleFeedback(request);
    default:
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
}
