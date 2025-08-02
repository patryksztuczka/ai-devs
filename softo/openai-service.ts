import OpenAI from "openai";
import {
  FIND_ANSWER_SYSTEM_PROMPT,
  CHOOSE_LINK_SYSTEM_PROMPT,
  createFindAnswerPrompt,
  createChooseLinkPrompt,
} from "./prompts";

export class OpenAiService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Sprawdza, czy w podanym tekście znajduje się odpowiedź na pytanie
   * Zwraca odpowiedź jeśli znaleziono, lub "NO_ANSWER" jeśli nie
   */
  public async findAnswerInText(
    text: string,
    question: string
  ): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: FIND_ANSWER_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: createFindAnswerPrompt(question, text),
        },
      ],
      temperature: 0,
    });

    return completion.choices[0].message.content?.trim() || "NO_ANSWER";
  }

  /**
   * Wybiera najbardziej obiecujący link z listy dostępnych linków
   * na podstawie pytania i kontekstu strony
   */
  public async chooseNextLink(
    pageText: string,
    question: string,
    availableLinks: string[]
  ): Promise<string | null> {
    if (availableLinks.length === 0) {
      return null;
    }

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: CHOOSE_LINK_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: createChooseLinkPrompt(question, pageText, availableLinks),
        },
      ],
      temperature: 0,
    });

    const result = completion.choices[0].message.content?.trim();
    return result === "NO_LINK" ? null : result || null;
  }
}
