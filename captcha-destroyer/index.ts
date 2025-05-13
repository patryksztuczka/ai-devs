import type OpenAI from "openai";

import { OpenAiService } from "./openai-service";

const response = await fetch(process.env.TARGET_URL);

const html = await response.text();

const questionRegex = /<p id="human-question">Question:<br \/>(.*?)<\/p>/s;

const match = html.match(questionRegex);

if (match) {
  const questionContent = match[1];

  const openaiService = new OpenAiService();

  const systemPrompt: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
    role: "system",
    content: `You are a helpful assistant that can answer questions. You are given a question and you need to answer it. Answers are years in format YYYY. Return only the answer, no other text.
      <examples description="Examples of correct answers">
        <example>
          <question>What year was the first iPhone released?</question>
          <answer>2007</answer>
        </example>
        <example>
          <question>When was the first World War?</question>
          <answer>1914</answer>
        </example>
      </examples>
      `,
  };

  const completion = await openaiService.completion([
    systemPrompt,
    { role: "user", content: questionContent },
  ]);

  const answer = completion.choices[0].message.content;

  if (answer) {
    const result = await fetch(process.env.TARGET_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: process.env.LOGIN,
        password: process.env.PASSWORD,
        answer,
      }),
    });

    const text = await result.text();

    console.log(text);
  }
} else {
  console.log("No question found");
}
