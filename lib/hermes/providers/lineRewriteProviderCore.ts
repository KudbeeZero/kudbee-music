// Shared utilities for line-rewrite providers (Lightning, SCRIBE).
// Both providers share identical response-parsing helpers for extracting
// alternatives from various response formats.

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function extractResponseText(body: unknown): string {
  if (body == null) return '';
  if (typeof body === 'string') return body;
  if (typeof body !== 'object') return String(body);
  // If the body directly has alternatives (our expected format), return it as JSON
  if (isRecord(body) && Array.isArray((body as Record<string, unknown>).alternatives)) {
    return JSON.stringify(body);
  }
  const direct = (body as Record<string, unknown>).output
    ?? (body as Record<string, unknown>).text
    ?? (body as Record<string, unknown>).generated_text
    ?? (body as Record<string, unknown>).completion
    ?? (body as Record<string, unknown>).lyrics
    ?? (body as Record<string, unknown>).response;
  if (typeof direct === 'string') return direct;
  const choices = (body as Record<string, unknown>).choices;
  if (Array.isArray(choices) && choices[0]) {
    const choice = choices[0] as Record<string, unknown>;
    if (typeof choice.text === 'string') return choice.text;
    if (isRecord(choice.message) && typeof choice.message.content === 'string') {
      return choice.message.content;
    }
  }
  if (isRecord(direct) && typeof direct.text === 'string') return direct.text;
  return '';
}

export function parseJson(raw: string): unknown {
  try {
    let text = raw.trim();
    const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fence) text = fence[1].trim();
    if (!text.startsWith('{')) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) text = text.slice(start, end + 1);
    }
    return JSON.parse(text);
  } catch {
    throw new Error(`response is not valid JSON: ${raw.slice(0, 200)}`);
  }
}
