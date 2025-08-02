import { readFileSync } from "fs";
import { join } from "path";
import { OpenAiService } from "./openai-service";
import { sendAnswerToAPI } from "../helpers";

async function verifyData() {
  const verifyFilePath = join(__dirname, "data", "verify.txt");
  const lines = readFileSync(verifyFilePath, "utf-8")
    .split("\n")
    .filter((line) => line.trim() !== "");

  const openaiService = new OpenAiService();
  const correctIds: string[] = [];

  console.log(`Rozpoczynam weryfikację ${lines.length} wierszy...`);

  for (const line of lines) {
    const [id, data] = line.split("=");
    if (!id || !data) {
      console.warn(`Pominięto nieprawidłową linię: ${line}`);
      continue;
    }

    console.log(`Weryfikuję ID: ${id}`);
    const result = await openaiService.verify(data);

    if (result === "1") {
      console.log(`ID: ${id} - Poprawne`);
      correctIds.push(id);
    } else {
      console.log(`ID: ${id} - Niepoprawne (wynik: ${result})`);
    }
  }

  console.log("Weryfikacja zakończona.");
  console.log("Poprawne identyfikatory:", correctIds);

  const apiResult = await sendAnswerToAPI("research", correctIds);
  console.log("Wynik wysłania do API:", apiResult);
}

verifyData().catch(console.error);
