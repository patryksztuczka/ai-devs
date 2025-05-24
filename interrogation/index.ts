import path from "path";
import fs from "node:fs/promises";
import type OpenAI from "openai";
import { OpenAiService } from "./openai-service";

const INPUT_DIR = path.join(import.meta.dirname, "interrogations");
const OUTPUT_DIR = path.join(import.meta.dirname, "interrogations-transcripts");

// Step 1: Transcribe audio files
// const files = await fs.readdir(INPUT_DIR);

// for (const file of files) {
//   if (path.extname(file) !== ".wav") {
//     continue;
//   }

//   const audioFile = path.join(INPUT_DIR, file);

//   const fileName = path.basename(audioFile, path.extname(audioFile));

//   Bun.spawn([
//     "ffmpeg",
//     "-i",
//     audioFile,
//     "-ar",
//     "16000",
//     "-ac",
//     "1",
//     path.join(INPUT_DIR, `${fileName}.wav`),
//   ]);

//   Bun.spawn([
//     "whisper",
//     "--model",
//     "base",
//     "--output_format",
//     "txt",
//     "--output_dir",
//     OUTPUT_DIR,
//     "--language",
//     "pl",
//     path.join(INPUT_DIR, `${fileName}.wav`),
//   ]);
// }

// Step 2: Summarize transcripts

// const transcriptFiles = await fs.readdir(OUTPUT_DIR);

// const summaryPath = path.join(OUTPUT_DIR, "summary.txt");
// let summaryContent = "";

// for (const file of transcriptFiles) {
//   if (!file.endsWith(".txt") || file === "summary.txt") continue;

//   const fileName = path.basename(file, ".txt");
//   const transcriptPath = path.join(OUTPUT_DIR, file);
//   const transcript = await fs.readFile(transcriptPath, "utf-8");

//   summaryContent += `${fileName}:\n${transcript}\n\n`;
// }

// await fs.writeFile(summaryPath, summaryContent, "utf-8");

// Step 3: Find street name

const systemPrompt: OpenAI.Chat.ChatCompletionMessageParam = {
  role: "system",
  content: `
  Twoim zadaniem jest ustalenie nazwy ulicy, na której znajduje się instytut uczelni, gdzie pracuje profesor Andrzej Maj.

  <objective>
  - Przeanalizuj dokładnie transkrypcje nagrań i znajdź wszelkie wskazówki dotyczące miejsca pracy profesora Andrzeja Maja.
  - Skup się na znalezieniu konkretnego instytutu uczelni, NIE głównej siedziby uczelni.
  - Użyj swojej wiedzy o strukturze i lokalizacjach instytutów tej uczelni.
  - Zwróć szczególną uwagę na pośrednie wskazówki dotyczące lokalizacji instytutu.
  </objective>

  <process>
  1. Przeanalizuj każdą transkrypcję pod kątem:
     - Wzmianek o profesorze Maju
     - Nazw instytutów i wydziałów
     - Wskazówek geograficznych
     - Powiązań między osobami a miejscami
  2. Połącz znalezione informacje ze swoją wiedzą o lokalizacjach instytutów uczelnianych
  3. Ustal konkretną ulicę, gdzie znajduje się właściwy instytut
  </process>

  <rules>
  - Odpowiadaj po polsku
  - Zwróć obiekt w formacie: { 
    "_thinking": "szczegółowy proces wnioskowania",
    "workPlace": "nazwa instytutu",
    "street": "nazwa ulicy"
  }
  - W polu "_thinking" opisz dokładnie proces dedukcji i wszystkie poszlaki
  </rules>
  `,
};

const openAiService = new OpenAiService();

const summaryContent = await fs.readFile(
  path.join(OUTPUT_DIR, "summary.txt"),
  "utf-8"
);

const response = await openAiService.completion(
  [
    systemPrompt,
    {
      role: "user",
      content: summaryContent,
    },
  ],
  "gpt-4o"
);

const result = JSON.parse(response.choices[0].message.content as string) as {
  _thinking: string;
  workPlace: string;
  street: string;
};

const reportResponse = await fetch(`${process.env.HQ_URL}/report`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json; charset=utf-8",
  },
  body: JSON.stringify({
    task: "mp3",
    apikey: process.env.PERSONAL_API_KEY,
    answer: result.street,
  }),
});

const responseText = await reportResponse.json();

console.log(responseText);
