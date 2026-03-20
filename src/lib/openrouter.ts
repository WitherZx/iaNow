/**
 * Utility for OpenRouter AI Integration
 * OpenRouter is OpenAI-compatible, so we use their base URL and model strings.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1";

export interface AIResponse {
  content: string;
  usage?: {
    total_tokens: number;
  };
}

export async function askAI(prompt: string, systemPrompt?: string): Promise<AIResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const appName = "iaNow Execution Intelligence";

  try {
    const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": appUrl,
        "X-Title": appName,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.0-flash-001", // Gemini 2.0 Flash (Premium Key)
        "messages": [
          ...(systemPrompt ? [{ "role": "system", "content": systemPrompt }] : []),
          { "role": "user", "content": prompt }
        ],
        "temperature": 0.7,
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Unknown error from OpenRouter");
    }

    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
}
