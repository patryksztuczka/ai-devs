// Interfejs dla serwisów AI
export interface AIService {
  extractTextFromImage(imagePath: string): Promise<string>;
  answerQuestion(context: string, question: string): Promise<string>;
}
