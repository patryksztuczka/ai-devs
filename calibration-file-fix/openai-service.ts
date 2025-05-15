import OpenAI from "openai";

export class OpenAiService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public async completion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    model: string = "gpt-4o-mini",
    stream: boolean = false
  ) {
    const completion = await this.openai.chat.completions.create({
      messages,
      model,
      stream,
    });

    return completion as OpenAI.Chat.Completions.ChatCompletion;
  }
}
