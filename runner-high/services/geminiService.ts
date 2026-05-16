const GEMINI_MODEL = 'gemini-2.0-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiResponse {
  text: string;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_KEY' | 'QUOTA_EXCEEDED' | 'NETWORK' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

export async function generateContent(
  apiKey: string,
  messages: GeminiMessage[],
  systemPrompt: string
): Promise<GeminiResponse> {
  const requestBody = {
    contents: messages,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch {
    throw new GeminiError('네트워크 연결을 확인해주세요.', 'NETWORK');
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GeminiError('API Key가 유효하지 않습니다.', 'INVALID_KEY');
    }
    if (response.status === 429) {
      throw new GeminiError('API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.', 'QUOTA_EXCEEDED');
    }
    throw new GeminiError(`서버 오류 (${response.status})`, 'UNKNOWN');
  }

  const data = await response.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  return { text };
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    await generateContent(apiKey, [{ role: 'user', parts: [{ text: 'Hello' }] }], 'Respond with OK');
    return true;
  } catch {
    return false;
  }
}
