import { GoogleGenAI } from "@google/genai";
import { readFile } from "fs/promises";
import chalk from "chalk";
import type { AIService } from "./ai-service.interface";

export class GeminiService implements AIService {
  private genAI: GoogleGenAI;

  constructor() {
    this.genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  }

  // OCR - odczytanie tekstu z obrazu
  async extractTextFromImage(imagePath: string): Promise<string> {
    try {
      const imageData = await readFile(imagePath);
      const base64Image = imageData.toString("base64");

      const response = await this.genAI.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Przeanalizuj ten obraz i wyekstrahuj z niego cały tekst. Jeśli to są notatki ręczne, przepisz je dokładnie zachowując strukturę i formatowanie. Zwróć tylko czysty tekst bez dodatkowych komentarzy.",
              },
              {
                inlineData: {
                  mimeType: "image/png",
                  data: base64Image,
                },
              },
            ],
          },
        ],
      });

      const text = response.text || "";
      console.log(
        chalk.green(`✓ Odczytano tekst z obrazu (${text.length} znaków)`)
      );
      return text;
    } catch (error) {
      console.error(chalk.red(`✗ Błąd podczas OCR: ${error}`));
      throw error;
    }
  }

  // Odpowiadanie na pytania
  async answerQuestion(context: string, question: string): Promise<string> {
    try {
      // Debug: pokaż część kontekstu
      const contextPreview = context.substring(0, 500) + "...";
      console.log(chalk.gray(`🔍 Kontekst dla pytania: "${question}"`));
      console.log(chalk.gray(`📝 Preview kontekstu: ${contextPreview}`));

      const response = await this.genAI.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Na podstawie poniższego kontekstu z notatnika Rafała, odpowiedz na pytanie.

INSTRUKCJA:
1. Przeanalizuj CAŁY kontekst bardzo dokładnie
2. Znajdź wszystkie informacje związane z pytaniem
3. Zwróć odpowiedź w formacie JSON z dwoma polami:
   - "thinking": szczegółowy proces myślowy, analiza wszystkich faktów
   - "answer": zwięzła, konkretna odpowiedź

KONTEKST:
${context}

PYTANIE: ${question}

Zwróć TYLKO valid JSON w formacie:
{"thinking": "tutaj szczegółowa analiza...", "answer": "tutaj odpowiedź"}`,
              },
            ],
          },
        ],
      });

      const responseText = response.text?.trim() || "{}";

      try {
        // Wyciągnij JSON z odpowiedzi (może być w bloku kodu)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : responseText;

        const parsed = JSON.parse(jsonText);

        if (parsed.thinking) {
          console.log(
            chalk.cyan(`💭 Gemini - Proces myślowy: ${parsed.thinking}`)
          );
        }

        return parsed.answer || "Brak odpowiedzi";
      } catch (error) {
        console.log(chalk.red(`❌ Gemini - Błąd parsowania JSON: ${error}`));
        console.log(chalk.gray(`Raw response: ${responseText}`));
        return responseText; // Fallback do surowej odpowiedzi
      }
    } catch (error) {
      console.error(
        chalk.red(`✗ Błąd podczas odpowiadania na pytanie: ${error}`)
      );
      return "Błąd podczas przetwarzania";
    }
  }
}
