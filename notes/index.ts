import * as pdfParse from "pdf-parse";
import { fromPath } from "pdf2pic";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import chalk from "chalk";
import { sendAnswerToAPI } from "../helpers";
import { AIServiceFactory } from "./ai-service.factory";
import type { AIService } from "./ai-service.interface";

// Ścieżki do plików
const DATA_DIR = join(process.cwd(), "notes", "data");
const PDF_URL = "https://c3ntrala.ag3nts.org/dane/notatnik-rafala.pdf";
const NOTES_URL = `https://c3ntrala.ag3nts.org/data/${process.env.PERSONAL_API_KEY}/notes.json`;

// Funkcja pobierająca plik
async function downloadFile(url: string, outputPath: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const buffer = await response.arrayBuffer();
    await writeFile(outputPath, Buffer.from(buffer));
    console.log(chalk.green(`✓ Pobrano plik: ${outputPath}`));
  } catch (error) {
    console.error(chalk.red(`✗ Błąd podczas pobierania pliku: ${error}`));
    throw error;
  }
}

// Funkcja do ekstrakcji tekstu z PDF (strony 1-18)
async function extractTextFromPDF(pdfPath: string): Promise<string> {
  try {
    const dataBuffer = await readFile(pdfPath);

    // Konfiguracja dla pdf-parse
    const options = {
      max: 18, // Tylko pierwsze 18 stron
      pagerender: function (pageData: any) {
        return pageData.getTextContent().then(function (textContent: any) {
          let text = "";
          textContent.items.forEach((item: any) => {
            text += item.str + " ";
          });
          return text;
        });
      },
    };

    // Parsowanie PDF z własnymi opcjami
    const data = await (pdfParse as any).default(dataBuffer, options);
    console.log(chalk.green(`✓ Wyekstrahowano tekst z PDF`));
    return data.text;
  } catch (error) {
    console.error(chalk.red(`✗ Błąd podczas ekstrakcji tekstu: ${error}`));
    throw error;
  }
}

// Funkcja do konwersji ostatniej strony PDF na obraz
async function convertLastPageToImage(pdfPath: string, outputPath: string) {
  try {
    const convert = fromPath(pdfPath, {
      density: 300,
      saveFilename: "strona-19",
      savePath: DATA_DIR,
      format: "png",
      width: 2480,
      height: 3508,
    });

    await convert(19); // Konwertuj tylko stronę 19
    console.log(chalk.green(`✓ Przekonwertowano stronę 19 na obraz`));
  } catch (error) {
    console.error(
      chalk.red(`✗ Błąd podczas konwersji strony na obraz: ${error}`)
    );
    throw error;
  }
}

// Funkcja do wczytania cache poprawnych odpowiedzi
async function loadCorrectAnswersCache(): Promise<Record<string, string>> {
  try {
    const cacheData = await readFile(
      join(DATA_DIR, "correct-answers-cache.json"),
      "utf-8"
    );
    const cache = JSON.parse(cacheData);
    console.log(
      chalk.cyan(
        `📂 Wczytano cache poprawnych odpowiedzi: ${
          Object.keys(cache).length
        } pytań`
      )
    );
    return cache;
  } catch (error) {
    console.log(
      chalk.gray(`📂 Brak cache poprawnych odpowiedzi - zacznę od nowa`)
    );
    return {};
  }
}

// Funkcja do zapisania cache poprawnych odpowiedzi
async function saveCorrectAnswersCache(correctAnswers: Record<string, string>) {
  try {
    await writeFile(
      join(DATA_DIR, "correct-answers-cache.json"),
      JSON.stringify(correctAnswers, null, 2)
    );
    console.log(
      chalk.cyan(
        `💾 Zapisano cache poprawnych odpowiedzi: ${
          Object.keys(correctAnswers).length
        } pytań`
      )
    );
  } catch (error) {
    console.error(chalk.red(`✗ Błąd podczas zapisywania cache: ${error}`));
  }
}

// Funkcja wysyłająca raport
async function sendReport(answers: Record<string, string>) {
  try {
    console.log(chalk.green(`✓ Wysyłanie raportu...`));
    const result = await sendAnswerToAPI("notes", answers);
    console.log(chalk.green(`✓ Raport wysłany pomyślnie`));
    return result;
  } catch (error) {
    console.error(chalk.red(`✗ Błąd podczas wysyłania raportu: ${error}`));
    throw error;
  }
}

// Iteracyjne odpowiadanie na pytania z feedbackiem
async function answerQuestionsIteratively(
  aiService: AIService,
  fullContext: string,
  questionsData: Record<string, string>,
  maxIterations: number = 3
): Promise<Record<string, string>> {
  // Wczytaj cache poprawnych odpowiedzi
  let answers: Record<string, string> = await loadCorrectAnswersCache();
  let incorrectAnswers: Record<
    string,
    {
      attempts: { answer: string; hint: string }[];
      latestHint: string;
    }
  > = {};
  let correctlyAnswered: Set<string> = new Set(Object.keys(answers)); // Załaduj z cache

  // Pokaż status cache
  if (correctlyAnswered.size > 0) {
    console.log(
      chalk.cyan(
        `🎯 Znaleziono ${correctlyAnswered.size} poprawnych odpowiedzi w cache:`
      )
    );
    Object.entries(answers).forEach(([key, answer]) => {
      console.log(chalk.green(`  ${key}: ${answer}`));
    });
  }

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    console.log(chalk.blue(`\n🔄 Iteracja ${iteration}/${maxIterations}`));

    // Odpowiadaj na pytania (tylko te, które nie zostały jeszcze poprawnie odpowiedziane)
    for (const [key, question] of Object.entries(questionsData)) {
      if (!correctlyAnswered.has(key)) {
        console.log(chalk.yellow(`Pytanie ${key}: ${question}`));

        // Przygotuj kontekst z feedbackiem jeśli to nie pierwsza iteracja
        let contextWithFeedback = fullContext;
        if (incorrectAnswers[key]) {
          const attempts = incorrectAnswers[key].attempts;
          const attemptsList = attempts
            .map(
              (attempt, index) =>
                `${index + 1}. "${attempt.answer}" - BŁĘDNA (Hint: ${
                  attempt.hint
                })`
            )
            .join("\n");

          const allIncorrectAnswers = attempts
            .map((a) => a.answer)
            .join('", "');

          contextWithFeedback = `KRYTYCZNE: Wszystkie poprzednie odpowiedzi były BŁĘDNE!

HISTORIA BŁĘDNYCH ODPOWIEDZI:
${attemptsList}

NAJNOWSZY HINT: ${incorrectAnswers[key].latestHint}

ABSOLUTNY ZAKAZ: NIE MOŻESZ użyć ŻADNEJ z tych odpowiedzi: "${allIncorrectAnswers}"

ZADANIE: 
1. Przeanalizuj CAŁY tekst bardzo dokładnie
2. Znajdź wszystkie daty i wydarzenia 
3. Uwzględnij WSZYSTKIE fakty i odwołania do wydarzeń
4. Znajdź NOWĄ odpowiedź, która nie była jeszcze wypróbowana

${fullContext}`;
        }

        const answer = await aiService.answerQuestion(
          contextWithFeedback,
          question as string
        );
        answers[key] = answer;
        console.log(chalk.green(`Odpowiedź: ${answer}`));
      }
    }

    // Wyślij odpowiedzi i sprawdź feedback
    console.log(
      chalk.blue(`\n📤 Wysyłanie odpowiedzi (iteracja ${iteration})...`)
    );
    const result = await sendReport(answers);

    // Sprawdź czy są błędy
    if (result && result.code !== 0) {
      console.log(chalk.red(`❌ Odpowiedź niepoprawna: ${result.message}`));

      // Wyciągnij informacje o błędnej odpowiedzi
      const errorMatch = result.message.match(
        /Answer for question (\d+) is incorrect/
      );
      if (errorMatch && (result as any).hint) {
        const questionKey = errorMatch[1].padStart(2, "0"); // Format 01, 02, etc.
        const currentAnswer = answers[questionKey];
        const currentHint = (result as any).hint;

        // Dodaj do historii błędnych odpowiedzi
        if (!incorrectAnswers[questionKey]) {
          incorrectAnswers[questionKey] = {
            attempts: [],
            latestHint: currentHint,
          };
        }

        // Dodaj obecną błędną odpowiedź do historii
        incorrectAnswers[questionKey].attempts.push({
          answer: currentAnswer,
          hint: currentHint,
        });

        // Aktualizuj najnowszy hint
        incorrectAnswers[questionKey].latestHint = currentHint;

        console.log(
          chalk.yellow(`💡 Hint dla pytania ${questionKey}: ${currentHint}`)
        );
        console.log(
          chalk.red(
            `📋 Historia błędnych odpowiedzi dla pytania ${questionKey}: ${incorrectAnswers[questionKey].attempts.length} prób`
          )
        );
      }

      // Jeśli to ostatnia iteracja, przerwij
      if (iteration === maxIterations) {
        console.log(
          chalk.red(
            `❌ Osiągnięto maksymalną liczbę iteracji (${maxIterations})`
          )
        );
        break;
      }
    } else {
      console.log(chalk.green(`✅ Wszystkie odpowiedzi poprawne!`));
      break;
    }

    // Sprawdź które pytania zostały poprawnie odpowiedziane w tej iteracji
    if (result && result.code === 0) {
      // Wszystkie pytania poprawne - dodaj wszystkie do zbioru
      Object.keys(questionsData).forEach((key) => correctlyAnswered.add(key));
      console.log(
        chalk.green(`🎉 WSZYSTKIE pytania poprawne! Zapisuję do cache.`)
      );
    } else if (result && result.code !== 0) {
      // API sprawdza sekwencyjnie i zatrzymuje się na pierwszym błędzie
      // Wszystkie pytania PRZED błędnym są poprawne i mogą być cache'owane
      const errorMatch = result.message.match(
        /Answer for question (\d+) is incorrect/
      );
      if (errorMatch) {
        const incorrectKey = errorMatch[1].padStart(2, "0");
        console.log(chalk.red(`❌ Pytanie ${incorrectKey} jest błędne`));

        // Wszystkie pytania PRZED błędnym są poprawne (API sprawdza sekwencyjnie)
        Object.keys(questionsData)
          .sort() // Sortuj klucze żeby mieć poprawną kolejność
          .forEach((key) => {
            if (key < incorrectKey) {
              correctlyAnswered.add(key);
              console.log(
                chalk.green(
                  `✅ Pytanie ${key} - POPRAWNE! (sprawdzone przed błędnym ${incorrectKey})`
                )
              );
            }
          });
      }
    }

    // Zapisz aktualny stan cache po każdej iteracji
    const currentCorrectAnswers: Record<string, string> = {};
    correctlyAnswered.forEach((key) => {
      if (answers[key]) {
        currentCorrectAnswers[key] = answers[key];
      }
    });
    await saveCorrectAnswersCache(currentCorrectAnswers);
  }

  return answers;
}

// Funkcja do czyszczenia cache
async function clearCache() {
  try {
    await writeFile(join(DATA_DIR, "correct-answers-cache.json"), "{}");
    console.log(chalk.yellow(`🗑️ Wyczyszczono cache poprawnych odpowiedzi`));
  } catch (error) {
    console.error(chalk.red(`✗ Błąd podczas czyszczenia cache: ${error}`));
  }
}

// Główna funkcja
async function main() {
  try {
    const aiService = AIServiceFactory.createFromEnv();

    // Sprawdź czy użytkownik chce wyczyścić cache
    if (process.env.CLEAR_CACHE === "true") {
      await clearCache();
    }
    const pdfPath = join(DATA_DIR, "notatnik-rafala.pdf");
    const notesPath = join(DATA_DIR, "notes.json");
    const imagePath = join(DATA_DIR, "strona-19.19.png");

    // 1. Pobierz plik z pytaniami (jeśli nie istnieje)
    try {
      await readFile(notesPath);
      console.log(chalk.green("✓ Plik z pytaniami już istnieje"));
    } catch {
      console.log(chalk.blue("📥 Pobieranie pliku z pytaniami..."));
      await downloadFile(NOTES_URL, notesPath);
    }

    // 2. Ekstrakcja tekstu ze stron 1-18 (jeśli nie istnieje)
    let textContent: string;
    try {
      textContent = await readFile(join(DATA_DIR, "text-content.txt"), "utf-8");
      console.log(chalk.green("✓ Tekst z PDF już wyekstrahowany"));
    } catch {
      console.log(chalk.blue("📄 Ekstrakcja tekstu z PDF..."));
      textContent = await extractTextFromPDF(pdfPath);
      await writeFile(join(DATA_DIR, "text-content.txt"), textContent);
    }

    // 3. Konwersja strony 19 na obraz (jeśli nie istnieje)
    try {
      await readFile(imagePath);
      console.log(chalk.green("✓ Obraz strony 19 już istnieje"));
    } catch {
      console.log(chalk.blue("🖼️ Konwersja strony 19 na obraz..."));
      await convertLastPageToImage(pdfPath, join(DATA_DIR, "strona-19.png"));
    }

    // 4. OCR - odczytanie tekstu z obrazu (jeśli nie istnieje)
    let imageText: string;
    try {
      imageText = await readFile(join(DATA_DIR, "ocr-text.txt"), "utf-8");
      console.log(chalk.green("✓ Tekst z obrazu już odczytany"));
    } catch {
      console.log(chalk.blue("👁️ OCR - odczytywanie tekstu z obrazu..."));
      imageText = await aiService.extractTextFromImage(imagePath);
      await writeFile(join(DATA_DIR, "ocr-text.txt"), imageText);
    }

    // 5. Połączenie tekstów
    console.log(chalk.blue("🔗 Łączenie tekstów..."));
    const fullContext = `TEKST Z STRON 1-18:\n${textContent}\n\nTEKST ZE STRONY 19 (OCR):\n${imageText}`;
    await writeFile(join(DATA_DIR, "full-context.txt"), fullContext);

    // 6. Wczytanie pytań
    console.log(chalk.blue("❓ Wczytywanie pytań..."));
    const questionsData = JSON.parse(await readFile(notesPath, "utf-8"));

    // 7. Iteracyjne odpowiadanie na pytania
    console.log(chalk.blue("🤔 Iteracyjne odpowiadanie na pytania..."));
    const finalAnswers = await answerQuestionsIteratively(
      aiService,
      fullContext,
      questionsData,
      10 // maksymalnie 5 iteracji
    );

    // 8. Zapisanie końcowych odpowiedzi
    await writeFile(
      join(DATA_DIR, "final-answers.json"),
      JSON.stringify(finalAnswers, null, 2)
    );

    console.log(chalk.blue("✅ Wszystkie operacje zakończone!"));
  } catch (error) {
    console.error(chalk.red(`✗ Wystąpił błąd: ${error}`));
    process.exit(1);
  }
}

main();
