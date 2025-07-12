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
    const formData = await request.formData();
    const audio = formData.get("audio") as File;
    const apiKey = formData.get("apiKey") as string;
    const sessionInfo = JSON.parse(formData.get("sessionInfo") as string);
    const currentPart = formData.get("currentPart") as string || "part1";
    const model = formData.get("model") as string || "flash";

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
    if (!audio)
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );

    const geminiModel = model || "flash";
    const modelInstance = initializeModel(apiKey, geminiModel);
    
    const audioBuffer = await audio.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    const transcribePrompt = `
      Transcribe the following audio accurately. The user is practicing ${sessionInfo.language} at ${sessionInfo.cefrLevel} level on the topic "${sessionInfo.topic}".
      
      Please provide only the transcript of what was said, without any additional commentary or formatting.
    `;

    const transcribeResult = await modelInstance.generateContent([
      transcribePrompt,
      {
        inlineData: {
          mimeType: audio.type || "audio/webm",
          data: base64Audio,
        },
      },
    ]);

    const userTranscript = transcribeResult.response.text().trim();

    let responsePrompt = "";
    
    if (currentPart === "part1") {
      responsePrompt = `
        You are an IELTS Speaking examiner conducting Part 1: Introduction and Interview.
        The student is practicing ${sessionInfo.language} at a ${sessionInfo.cefrLevel} level.
        
        The student just said: "${userTranscript}"
        
        IMPORTANT: Always respond in ${sessionInfo.language}. This helps with clarity and consistency.
        
        In Part 1, ask general questions about familiar topics like:
        - Personal information (name, where they live, work/study)
        - Family and friends
        - Hobbies and interests
        - Daily routines
        - Home and accommodation
        
        Ask ONE natural follow-up question based on their response. Keep it conversational and appropriate for their level.
        Make the student feel comfortable while assessing their basic communication skills.
      `;
    } else if (currentPart === "part2") {
      responsePrompt = `
        You are an IELTS Speaking examiner conducting Part 2: Individual Long Turn.
        The student is practicing ${sessionInfo.language} at a ${sessionInfo.cefrLevel} level.
        
        The student just said: "${userTranscript}"
        
        IMPORTANT: Always respond in ${sessionInfo.language}. This helps with clarity and consistency.
        
        In Part 2, the student should speak for 1-2 minutes on a given topic. If they haven't finished their long turn, 
        encourage them to continue with prompts like "Can you tell me more about..." or "What else can you say about..."
        
        If they have completed their long turn, acknowledge their response and prepare to move to Part 3.
        Keep your response brief and encouraging.
      `;
    } else if (currentPart === "part3") {
      responsePrompt = `
        You are an IELTS Speaking examiner conducting Part 3: Two-Way Discussion.
        The student is practicing ${sessionInfo.language} at a ${sessionInfo.cefrLevel} level.
        
        The student just said: "${userTranscript}"
        
        IMPORTANT: Always respond in ${sessionInfo.language}. This helps with clarity and consistency.
        
        In Part 3, ask more abstract and in-depth questions related to the topic from Part 2.
        Focus on:
        - Opinions and attitudes
        - Abstract ideas and concepts
        - Hypothetical situations
        - Future implications
        - Broader societal issues
        
        Ask ONE thought-provoking question that encourages deeper discussion and opinion expression.
        Make it challenging but appropriate for their level.
      `;
    }

    const responseResult = await modelInstance.generateContent(responsePrompt);
    const aiResponse = responseResult.response.text().trim();

    return NextResponse.json({
      transcript: userTranscript,
      response: aiResponse,
      part: currentPart
    });
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
    const { apiKey, sessionInfo, model, transcript } = await request.json();

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
    
    const transcriptText = transcript && transcript.length > 0 
      ? transcript.map((t: any) => `${t.speaker}: ${t.text}`).join("\n")
      : "No conversation transcript available.";

    const prompt = `
      You are an expert IELTS Speaking examiner providing comprehensive feedback on a complete IELTS Speaking test.
      
      Student Information:
      - Language: ${sessionInfo.language}
      - Stated CEFR Level: ${sessionInfo.cefrLevel}
      - General Topic Area: ${sessionInfo.topic}

      Complete Test Transcript:
      ${transcriptText}

      IMPORTANT: Always provide your feedback and assessment in English, regardless of the student's language. This ensures clarity and consistency.

      Provide detailed feedback covering all four IELTS Speaking criteria:

      1. **Fluency and Coherence (25%)**: How well the student speaks at length, organizes ideas, and connects thoughts
      2. **Lexical Resource (25%)**: Vocabulary range, accuracy, and appropriateness
      3. **Grammatical Range and Accuracy (25%)**: Grammar usage, sentence structures, and error frequency
      4. **Pronunciation (25%)**: Clarity, intonation, and accent features

      For each part of the test:
      - **Part 1**: Basic communication, personal topics, comfort level
      - **Part 2**: Extended speaking, topic development, organization
      - **Part 3**: Abstract thinking, opinion expression, complex discussion

      Return the data in this exact JSON structure, with no additional text, markdown, or explanations:
      {
        "feedback": "Your detailed, constructive feedback here covering all four criteria and three parts.",
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
