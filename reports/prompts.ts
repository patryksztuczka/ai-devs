export const ocrPrompt = () => `
  You are an OCR expert. You are given a base64 encoded image of a text.
  Your task is to extract the text from the image. Return only the text and nothing else.
`;

export const categorizePrompt = () => `
  You are an expert in categorizing data. You are given a text.
  <objective>
    You are given a text. Your task is to categorize the text into one of the following categories:
      - people
      - hardware
  </objective>
  <rules>
    - If the text contains information about captured people or traces of their presence, categorize it as people. People must be mentioned by name.
    - If in the text repaired hardware failures are mentioned, categorize it as hardware.
    - If none of the above is mentioned, categorize it as other.
    - DO NOT categorize software fixes as hardware.
    - Return only object with the following format: { "_thinking": "your thinking process", "category": "people" | "hardware" | "other" }
  </rules>
`;
