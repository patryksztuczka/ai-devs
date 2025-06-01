import OpenAI from "openai";

export class OpenAiService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public async ask(
    input: OpenAI.Responses.ResponseInput,
    model: string = "gpt-4.1-mini",
    stream: boolean = false
  ) {
    const response = await this.openai.responses.create({
      input,
      model,
      stream,
    });

    return response as OpenAI.Responses.Response;
  }
}
