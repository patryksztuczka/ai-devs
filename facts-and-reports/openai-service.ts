import OpenAI from "openai";

interface AnalysisResult {
  keywords: string[];
  connectedFacts: string[];
}

export class OpenAiService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public async analyzeReport(
    reportContent: string,
    factsContent: string,
    fileName: string
  ): Promise<AnalysisResult> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `

        <facts_content>
          ${factsContent}
        </facts_content>
        
        Jesteś asystentem, który analizuje raporty i łączy je z faktami.
        <objective>
        1. Znajdź powiązane fakty z podanej bazy faktów dla raportu.
        2. Na podstawie powiązanych faktów i raportu wygeneruj:
         - słowa opisujące raport
         - słowa opisujące powiązane fakty z raportem fakty
        3. Słowa kluczowe opisujące raport oraz powiązane fakty:
        - co się stało
        - gdzie
        - kto był zaangażowany
        - jakie przedmioty
        - jakie technologie (np. Java)
        3. Lista powinna precyzyjnie opisywać raport, uwzględniając treść raportu, powiązane fakty oraz informacje z nazwy pliku.
        4. Zwróć minimum 50 słów kluczowych.
        </objective>

        <rules>
        - Słowa kluczowe muszą być w języku polskim
        - Słowa kluczowe muszą być w mianowniku (np. "nauczyciel", "programista", nie "nauczyciela", "programistów")
        - Zwróć tylko nazwy plików faktów (np. "f01.txt"), które są powiązane z raportem
        - Nazwa pliku raportu zawiera ważną informację o lokalizacji (np. sektor_C4) - użyj jej w analizie
        </rules>

        <example>
        Raport: Godzina 10:00 - 11:00 Strażnicy zatrzymali Jana Kowalskiego.
        Fakt: Jan Kowalski to polski działacz opozycjny.
        Słowa kluczowe: strażnicy, zatrzymanie, działacz, opozycja, polska, działacz opozycji
        </example>

        <thinking>
          Wypisz swoje myśli i zastanowienia. Odpowiedz sobie, czy znasz fakty o raporcie. Jeśli tak, to pamiętaj, że musisz wygenerować słowa kluczowe opisujące raport oraz powiązane fakty.
        </thinking>
        
        Odpowiedz w formacie JSON:
        {
          "keywords": ["słowo1", "słowo2", ...],
          "connectedFacts": ["f01.txt", "f02.txt", ...]
        }`,
      },
      {
        role: "user",
        content: `
<report_content>
Nazwa pliku: ${fileName}
Treść:
${reportContent}
</report_content>`,
      },
    ];

    console.log(reportContent);

    try {
      const completion = await this.openai.chat.completions.create({
        messages,
        model: "gpt-4.1-nano",
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content;

      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const result = JSON.parse(content) as AnalysisResult;
      return {
        keywords: result.keywords || [],
        connectedFacts: result.connectedFacts || [],
      };
    } catch (error) {
      console.error("Failed to parse OpenAI response:", error);
      return { keywords: [], connectedFacts: [] };
    }
  }
}
