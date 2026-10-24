import { GoogleGenAI, type Part } from "@google/genai";
import { GEMINI_MODEL } from "@/lib/ai/config";

export type GeminiRequest = {
  contents: string | Part[];
  timeoutMs: number;
  /** JSON schema for structured output; the response is then application/json. */
  jsonSchema?: Record<string, unknown>;
};

/** The one place a Gemini client is built. Throws when the API key is missing. */
export function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  return new GoogleGenAI({ apiKey });
}

/** One generateContent call with a hard timeout. Returns the response text. */
export async function generateGeminiText({ contents, timeoutMs, jsonSchema }: GeminiRequest): Promise<string> {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      abortSignal: AbortSignal.timeout(timeoutMs),
      httpOptions: { timeout: timeoutMs },
      ...(jsonSchema ? { responseMimeType: "application/json", responseJsonSchema: jsonSchema } : {}),
    },
  });
  return response.text ?? "";
}
