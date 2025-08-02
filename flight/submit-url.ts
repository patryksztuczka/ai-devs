/**
 * Skrypt do zgłoszenia URL webhook do Centrali
 * UWAGA: Uruchom to TYLKO gdy serwer działa i ngrok jest aktywny!
 */

import { sendAnswerToAPI } from "../helpers";

async function submitWebhookUrl() {
  console.log("🚀 Zgłaszanie URL webhook do Centrali");

  // UWAGA: Zmień ten URL na swój ngrok URL!
  const NGROK_URL = "https://4cc774866a29.ngrok-free.app";

  if (!NGROK_URL) {
    console.error("❌ Brak NGROK_URL w zmiennych środowiskowych");
    console.log("💡 Ustaw NGROK_URL w .env lub uruchom:");
    console.log(
      "   NGROK_URL=https://xxxx-xxxx.ngrok-free.app bun run submit-url.ts"
    );
    process.exit(1);
  }

  const webhookUrl = `${NGROK_URL}/webhook`;

  console.log(`📡 URL webhook: ${webhookUrl}`);
  console.log("\n🔍 Sprawdzam czy endpoint jest dostępny...");

  try {
    // Test połączenia przed zgłoszeniem
    const testResponse = await fetch(`${webhookUrl}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instruction: "test connection",
      }),
    });

    if (!testResponse.ok) {
      throw new Error(
        `HTTP ${testResponse.status}: ${testResponse.statusText}`
      );
    }

    const testData = await testResponse.json();
    console.log("✅ Endpoint jest dostępny:", testData);

    if (!testData.description || typeof testData.description !== "string") {
      console.error(
        "❌ Endpoint nie zwraca poprawnego formatu (brak pola 'description')"
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Nie można połączyć się z webhook URL:", error);
    console.log("💡 Sprawdź czy:");
    console.log("   1. Serwer działa (bun run server.ts)");
    console.log("   2. ngrok jest aktywny");
    console.log("   3. URL jest poprawny");
    process.exit(1);
  }

  console.log("\n📤 Wysyłam URL do Centrali...");
  console.log("⏳ To może potrwać - Centrala będzie testować webhook...");

  try {
    const result = await sendAnswerToAPI("webhook", webhookUrl);

    if (result) {
      console.log("🎉 Sukces! Odpowiedź od Centrali:");
      console.log(result);

      if (result.message?.includes("flag") || result.message?.includes("FLG")) {
        console.log("🏆 FLAGA OTRZYMANA!");
      }
    } else {
      console.log("❌ Brak odpowiedzi lub błąd");
    }
  } catch (error) {
    console.error("💥 Błąd podczas komunikacji z Centralą:", error);
    process.exit(1);
  }
}

// Uruchom zgłoszenie
submitWebhookUrl();
