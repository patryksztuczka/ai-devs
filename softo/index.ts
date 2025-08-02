import { BrowsingAgent } from "./browsing-agent";
import { sendAnswerToAPI } from "../helpers";

interface Question {
  [key: string]: string;
}

interface Answer {
  [key: string]: string;
}

async function main() {
  const API_KEY = process.env.PERSONAL_API_KEY;

  if (!API_KEY) {
    throw new Error("Brak PERSONAL_API_KEY w zmiennych środowiskowych");
  }

  console.log("🚀 Rozpoczynam zadanie softo");

  try {
    // 1. Pobierz pytania z API
    console.log("\n📥 Pobieram pytania z API...");
    const questionsUrl = `https://c3ntrala.ag3nts.org/data/${API_KEY}/softo.json`;
    const questionsResponse = await fetch(questionsUrl);

    if (!questionsResponse.ok) {
      throw new Error(`Błąd pobierania pytań: ${questionsResponse.status}`);
    }

    const questions: Question = await questionsResponse.json();
    console.log("✅ Pobrano pytania:", questions);

    // 2. Stwórz agenta przeszukującego
    const agent = new BrowsingAgent();
    const answers: Answer = {};

    // 3. Dla każdego pytania znajdź odpowiedź
    const questionIds = Object.keys(questions).sort();

    for (const questionId of questionIds) {
      const questionText = questions[questionId];

      console.log(`\n🎯 Przetwarzam pytanie ${questionId}: "${questionText}"`);
      console.log("=".repeat(60));

      const answer = await agent.findAnswer(questionText);
      answers[questionId] = answer;

      console.log(`📝 Odpowiedź dla ${questionId}: "${answer}"`);

      // Krótka przerwa między pytaniami
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("\n" + "=".repeat(60));
    console.log("📋 PODSUMOWANIE ODPOWIEDZI:");
    for (const [id, answer] of Object.entries(answers)) {
      console.log(`  ${id}: "${answer}"`);
    }

    // 4. Wyślij odpowiedzi do API
    console.log("\n📤 Wysyłam odpowiedzi do API...");
    const result = await sendAnswerToAPI("softo", answers);

    if (result) {
      console.log("✅ Zadanie softo zakończone pomyślnie!");
      console.log("📊 Wynik:", result);
    } else {
      console.log("❌ Błąd podczas wysyłania odpowiedzi");
    }
  } catch (error) {
    console.error("💥 Błąd podczas wykonywania zadania:", error);
    process.exit(1);
  }
}

main();
