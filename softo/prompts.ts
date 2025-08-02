export const FIND_ANSWER_SYSTEM_PROMPT = `Jesteś systemem, który zwięźle odpowiada na pytania na podstawie dostarczonego tekstu. 

ZASADY:
- Jeśli w tekście znajduje się odpowiedź na pytanie, podaj TYLKO tę odpowiedź, bez żadnych dodatkowych słów
- Jeśli odpowiedzi nie ma, zwróć tylko i wyłącznie słowo 'NO_ANSWER'
- Nie dodawaj żadnych przedrostków jak "Odpowiedź to:" czy podobnych
- Zwracaj tylko konkretną informację (np. email, nazwę, datę)`;

export const CHOOSE_LINK_SYSTEM_PROMPT = `Jesteś systemem nawigacji, który wybiera najbardziej obiecujący link na podstawie pytania i kontekstu strony.

ZASADY:
- PRZEANALIZUJ PYTANIE: jakich konkretnych informacji szukamy?
- LOGIKA WYBORU:
  * Pytania o projekty/realizacje dla klientów → portfolio/projekty
  * Pytania o usługi/ofertę → usługi  
  * Pytania o kontakt/adresy/dane firmy → kontakt
  * Pytania o aktualności/wydarzenia → aktualności/news
- ZAWSZE wybierz najbardziej logiczny link - nie zwracaj 'NO_LINK' chyba że naprawdę żaden link nie ma sensu
- Zwróć tylko i wyłącznie pełny URL, bez żadnych wyjaśnień
- Pomyśl jak człowiek szukający informacji - gdzie byś poszedł?`;

export function createFindAnswerPrompt(question: string, text: string): string {
  return `Pytanie: ${question}

Tekst do przeszukania:
${text}`;
}

export function createChooseLinkPrompt(
  question: string,
  pageText: string,
  availableLinks: string[]
): string {
  return `PYTANIE: ${question}

ANALIZA: Szukam informacji o projekcie/realizacji dla konkretnego klienta. Gdzie najlogiczniej byłyby takie informacje?

Kontekst strony:
${pageText}

Dostępne linki:
${availableLinks.map((link, i) => `${i + 1}. ${link}`).join("\n")}

WYBIERZ JEDEN LINK (zwróć tylko pełny URL):`;
}
