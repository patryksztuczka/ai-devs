import type { AIService } from "./ai-service.interface";
import { GeminiService } from "./gemini-service";
import { OpenAIService } from "./openai-service";

export type AIProvider = "gemini" | "openai";

export class AIServiceFactory {
  static create(provider: AIProvider = "gemini"): AIService {
    switch (provider) {
      case "gemini":
        return new GeminiService();
      case "openai":
        return new OpenAIService();
      default:
        throw new Error(`Nieznany provider AI: ${provider}`);
    }
  }

  static createFromEnv(): AIService {
    const provider = (process.env.AI_PROVIDER as AIProvider) || "gemini";
    console.log(`🤖 Używany serwis AI: ${provider.toUpperCase()}`);
    return this.create(provider);
  }
}
