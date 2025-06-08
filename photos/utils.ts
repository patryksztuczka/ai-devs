export function extractJsonFromText(responseText: string): string | null {
  // Regex to find a JSON object enclosed in ```json ... ```
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = responseText.match(jsonRegex);

  // If a match is found, return the captured group (the JSON string)
  if (match && match[1]) {
    return match[1].trim();
  }

  // If no markdown block is found, assume the whole string might be the JSON object
  // and return it directly. The calling function can handle parsing errors.
  return responseText.trim();
}
