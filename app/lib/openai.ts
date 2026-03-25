type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type RunOpenAIChatOptions = {
  messages: OpenAIMessage[];
  modelFallback?: string;
  temperature?: number;
  maxTokens?: number;
};

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function runOpenAIChat(options: RunOpenAIChatOptions): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? options.modelFallback ?? "gpt-4.1";

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 300,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI request failed: ${errorText}`);
  }

  const result = (await response.json()) as OpenAIChatResponse;

  const content = result.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI response was empty.");
  }

  return content;
}
