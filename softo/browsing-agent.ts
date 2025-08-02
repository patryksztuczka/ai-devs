import { parse } from "node-html-parser";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { OpenAiService } from "./openai-service";

export class BrowsingAgent {
  private readonly openaiService: OpenAiService;
  private readonly startUrl = "https://softo.ag3nts.org";
  private readonly maxSteps = 5;

  constructor() {
    this.openaiService = new OpenAiService();
  }

  /**
   * Znajduje odpowiedź na pytanie, nawigując po stronie
   */
  public async findAnswer(question: string): Promise<string> {
    const visitedUrls = new Set<string>();
    let currentUrl = this.startUrl;
    let steps = 0;

    console.log(`🔍 Szukam odpowiedzi na pytanie: "${question}"`);
    console.log(`📍 Rozpoczynam od: ${currentUrl}`);

    while (steps < this.maxSteps && !visitedUrls.has(currentUrl)) {
      steps++;
      console.log(`\n--- Krok ${steps} ---`);
      console.log(`🌐 Sprawdzam stronę: ${currentUrl}`);

      // Dodaj do odwiedzonych
      visitedUrls.add(currentUrl);

      try {
        // Pobierz i przeanalizuj stronę
        const { markdown, links } = await this.fetchAndParsePage(currentUrl);

        // Sprawdź czy jest odpowiedź na tej stronie
        console.log(`💭 Pytam LLM czy jest odpowiedź...`);
        const answer = await this.openaiService.findAnswerInText(
          markdown,
          question
        );

        if (answer !== "NO_ANSWER") {
          console.log(`✅ Znaleziono odpowiedź: "${answer}"`);
          return answer;
        }

        console.log(`❌ Brak odpowiedzi na tej stronie`);

        // Jeśli nie ma odpowiedzi, wybierz następny link
        if (links.length === 0) {
          console.log(`🚫 Brak dostępnych linków`);
          break;
        }

        console.log(`🔗 Znaleziono ${links.length} linków`);
        console.log(`💭 Pytam LLM który link wybrać...`);

        const nextUrl = await this.openaiService.chooseNextLink(
          markdown,
          question,
          links
        );

        if (!nextUrl || visitedUrls.has(nextUrl)) {
          console.log(`🚫 Brak dostępnych nowych linków`);
          break;
        }

        console.log(`➡️ Wybrany link: ${nextUrl}`);
        currentUrl = nextUrl;
      } catch (error) {
        console.error(`❌ Błąd podczas przetwarzania ${currentUrl}:`, error);
        break;
      }
    }

    if (steps >= this.maxSteps) {
      console.log(`⏰ Osiągnięto limit kroków (${this.maxSteps})`);
    }

    console.log(`😞 Nie znaleziono odpowiedzi na pytanie`);
    return "ANSWER_NOT_FOUND";
  }

  /**
   * Pobiera stronę, konwertuje na markdown i wyciąga linki
   */
  private async fetchAndParsePage(
    url: string
  ): Promise<{ markdown: string; links: string[] }> {
    const response = await fetch(url);
    const html = await response.text();

    // Parsuj HTML
    const root = parse(html);

    // Konwertuj na markdown (body strony)
    const bodyHtml = root.querySelector("body")?.innerHTML || html;
    const markdown = NodeHtmlMarkdown.translate(bodyHtml);

    // Wyciągnij wszystkie linki
    const linkElements = root.querySelectorAll("a[href]");
    const links = linkElements
      .map((link) => {
        const href = link.getAttribute("href");
        if (!href) return null;

        // Zamień względne URL na bezwzględne
        try {
          return new URL(href, url).toString();
        } catch {
          return null;
        }
      })
      .filter((link): link is string => link !== null)
      .filter((link) => link.startsWith("http")) // Tylko HTTP/HTTPS
      .filter((link, index, array) => array.indexOf(link) === index); // Unikalne

    console.log(links);

    return { markdown, links };
  }
}
