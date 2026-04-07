'use server'

const OPENROUTER_URL = "https://openrouter.ai/api/v1";

export async function transcribeDocument(imageBase64: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Missing OpenRouter API Key');

  // Removendo prefixo data:image/jpeg;base64, se existir
  const pureBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "model": "google/gemini-2.0-flash-001",
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": "Transcreva TODO o texto deste documento jurídico/administrativo de forma literal. Não adicione comentários, apenas o texto extraído."
            },
            {
              "type": "image_url",
              "image_url": {
                "url": `data:image/jpeg;base64,${pureBase64}`
              }
            }
          ]
        }
      ],
      "temperature": 0.0
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'Error transcribing image');

  return data.choices[0]?.message?.content || "";
}
