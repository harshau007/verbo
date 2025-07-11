import { ElevenLabsClient } from "elevenlabs";
import { NextResponse } from "next/server";

const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";

export async function POST(request: Request) {
  try {
    const { text, apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key is missing" },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const elevenlabs = new ElevenLabsClient({ apiKey });

    const audioStream = await elevenlabs.generate({
      voice: ELEVENLABS_VOICE_ID,
      text,
      model_id: ELEVENLABS_MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    });

    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Error generating speech:", error);
    const errorMessage = error.message || "Failed to generate speech";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
