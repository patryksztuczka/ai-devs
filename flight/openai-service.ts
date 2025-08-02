import OpenAI from "openai";
import { type Position } from "./map";

export class OpenAiService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Interpretuje instrukcję ruchu w języku naturalnym i zwraca końcową pozycję
   */
  public async interpretMovement(instruction: string): Promise<Position> {
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Jesteś systemem nawigacji drona na mapie 4x4.

ZASADY RUCHU:
- Mapa to siatka 4x4 z współrzędnymi [wiersz, kolumna]
- Współrzędne: wiersz i kolumna od 0 do 3
- PUNKT STARTOWY: [0,0] (lewy górny róg)
- Ruchy: w prawo (+1 kolumna), w lewo (-1 kolumna), w dół (+1 wiersz), w górę (-1 wiersz)

INSTRUKCJE:
- Przeanalizuj całą instrukcję w języku polskim
- Uwzględnij negacje ("nie", "nie idziemy") 
- Uwzględnij komendy "od nowa", "zaczynamy od początku" (reset do [0,0])
- "Na sam dół" = maksymalnie w dół (wiersz 3)
- "Maksymalnie w prawo" = maksymalnie w prawo (kolumna 3)
- "Maksymalnie w lewo" = maksymalnie w lewo (kolumna 0)
- "Na sam góra" = maksymalnie w górę (wiersz 0)

ODPOWIEDŹ:
Zwróć TYLKO końcowe współrzędne w formacie [wiersz,kolumna], np: [2,3]
NIE dodawaj żadnych wyjaśnień ani innych słów.`,
        },
        {
          role: "user",
          content: `Instrukcja: ${instruction}

Jakie są końcowe współrzędne drona?`,
        },
      ],
      temperature: 0,
    });

    const response = completion.choices[0].message.content?.trim() || "";
    console.log(`🤖 LLM odpowiedź: "${response}"`);

    // Parsuj odpowiedź LLM
    const match = response.match(/\[(\d+),(\d+)\]/);
    if (!match) {
      throw new Error(`Nie można sparsować odpowiedzi LLM: "${response}"`);
    }

    const row = parseInt(match[1]);
    const col = parseInt(match[2]);

    // Walidacja granic
    if (row < 0 || row > 3 || col < 0 || col > 3) {
      throw new Error(`Współrzędne poza mapą: [${row}, ${col}]`);
    }

    return [row, col];
  }
}
