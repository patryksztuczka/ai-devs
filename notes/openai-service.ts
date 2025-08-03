import OpenAI from "openai";
import { readFile } from "fs/promises";
import chalk from "chalk";
import type { AIService } from "./ai-service.interface";

export class OpenAIService implements AIService {
  private openai: OpenAI;
  private model: string = "gpt-4.1-mini";

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // OCR - odczytanie tekstu z obrazu
  async extractTextFromImage(imagePath: string): Promise<string> {
    try {
      const imageData = await readFile(imagePath);
      const base64Image = imageData.toString("base64");

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Przeanalizuj ten obraz i wyekstrahuj z niego cały tekst. Jeśli to są notatki ręczne, przepisz je dokładnie zachowując strukturę i formatowanie. Zwróć tylko czysty tekst bez dodatkowych komentarzy.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
      });

      const text = response.choices[0]?.message?.content || "";
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
      console.log(
        chalk.gray(`🔍 OpenAI - Kontekst dla pytania: "${question}"`)
      );
      console.log(
        chalk.gray(`📝 OpenAI - Preview kontekstu: ${contextPreview}`)
      );

      // Sprawdź czy kontekst zawiera feedback
      if (context.includes("WAŻNE UWAGI DLA PYTANIA")) {
        console.log(chalk.yellow(`⚠️ OpenAI - Wykryto feedback w kontekście!`));
        const feedbackMatch = context.match(
          /WAŻNE UWAGI DLA PYTANIA.*?poprzednia odpowiedź.*?"([^"]+)"/s
        );
        if (feedbackMatch) {
          console.log(
            chalk.yellow(
              `🔄 OpenAI - Poprzednia błędna odpowiedź: "${feedbackMatch[1]}"`
            )
          );
        }
      }

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "user",
            content: `Na podstawie poniższego kontekstu z notatnika Rafała, odpowiedz na pytanie. 

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
        max_tokens: 2000,
        temperature: 0,
      });

      const responseText =
        response.choices[0]?.message?.content?.trim() || "{}";

      try {
        // Wyciągnij JSON z odpowiedzi (może być w bloku kodu)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[0] : responseText;

        const parsed = JSON.parse(jsonText);

        if (parsed.thinking) {
          console.log(chalk.cyan(`💭 Proces myślowy: ${parsed.thinking}`));
        }

        return parsed.answer || "Brak odpowiedzi";
      } catch (error) {
        console.log(chalk.red(`❌ Błąd parsowania JSON: ${error}`));
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
