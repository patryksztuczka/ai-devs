/**
 * Reprezentacja mapy 4x4 z opisami pól
 * Współrzędne: [wiersz, kolumna] gdzie (0,0) to lewy górny róg
 */

export type Position = [number, number];

// Mapa 4x4 - analizując obrazek flight/map.png
export const MAP: string[][] = [
  // Wiersz 0 (górny)
  ["punkt startowy", "pole", "drzewo", "dom"],

  // Wiersz 1
  ["pole", "wiatrak", "pole", "pole"],

  // Wiersz 2
  ["pole", "pole", "skały", "dwa drzewa"],

  // Wiersz 3 (dolny)
  ["góry", "góry", "samochód", "jaskinia"],
];

export const START_POSITION: Position = [0, 0];

/**
 * Pobiera opis pola na podanych współrzędnych
 */
export function getFieldDescription(position: Position): string {
  const [row, col] = position;

  // Sprawdź czy współrzędne są w granicach mapy
  if (row < 0 || row >= MAP.length || col < 0 || col >= MAP[0].length) {
    throw new Error(`Współrzędne poza mapą: [${row}, ${col}]`);
  }

  return MAP[row][col];
}

/**
 * Sprawdza czy pozycja jest poprawna (w granicach mapy)
 */
export function isValidPosition(position: Position): boolean {
  const [row, col] = position;
  return row >= 0 && row < MAP.length && col >= 0 && col < MAP[0].length;
}
