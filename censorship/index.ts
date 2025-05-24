import { fetch } from "bun";
import type OpenAI from "openai";
import { OpenAiService } from "./openai-service";

const systemPrompt: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
  role: "system",
  content: `You are a censorship system. You will need to censor every personal informations in it.
  <objective>
  - You will need to censor every personal informations in it with word "CENZURA".
  - If there is a chain of personal informations, you will need to censor them all with only one "CENZURA".
  - Keep the original text structure.
  - Return only the censored text.
  </objective>
  <example>
  Input: Osoba podejrzana to Jan Nowak. Adres: Wrocław, ul. Szeroka 18. Wiek: 32 lata.
  Output: Osoba podejrzana to CENZURA. Adres: CENZURA, ul. CENZURA. Wiek: CENZURA lata.
  </example>
  `,
};

const textResponse = await fetch(
  `${process.env.HQ_URL}/data/${process.env.PERSONAL_API_KEY}/cenzura.txt`
);

const text = await textResponse.text();

const openAiService = new OpenAiService();

const completion = await openAiService.completion([
  systemPrompt,
  {
    role: "user",
    content: text,
  },
]);

const censoredText = completion.choices[0].message.content;

console.log(censoredText);

const reportResponse = await fetch(`${process.env.HQ_URL}/report`, {
  method: "POST",
  body: JSON.stringify({
    task: "CENZURA",
    apikey: process.env.PERSONAL_API_KEY,
    answer: censoredText,
  }),
});

console.log(await reportResponse.text());
