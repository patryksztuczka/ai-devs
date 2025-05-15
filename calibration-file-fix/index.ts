import { z } from "zod";
import type OpenAI from "openai";

import { OpenAiService } from "./openai-service";

const testDataSchema = z.object({
  question: z.string(),
  answer: z.number(),
  test: z
    .object({
      q: z.string(),
      a: z.string(),
    })
    .optional(),
});

const calibrationFileSchema = z.object({
  apikey: z.string(),
  description: z.string(),
  copyright: z.string(),
  "test-data": z.array(testDataSchema),
});

const openai = new OpenAiService();

const systemPrompt: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
  role: "system",
  content: `
  You are a helpful assistant that can answer questions as short as possible without any additional information.
`,
};

const response = await fetch(
  `${process.env.HQ_URL}/data/${process.env.PERSONAL_API_KEY}/json.txt`
);

const data = await response.json();

const parsedResult = calibrationFileSchema.safeParse(data);

if (!parsedResult.success) {
  console.error(parsedResult.error);
  process.exit(1);
}

const { "test-data": testData } = parsedResult.data;

const fixedTestDataPromises = testData.map(async (test) => {
  if (test.test) {
    const completion = await openai.completion([
      systemPrompt,
      {
        role: "user",
        content: test.test.q,
      },
    ]);

    const answer = completion.choices[0].message.content;

    console.log(answer);

    return {
      ...test,
      test: {
        ...test.test,
        a: answer,
      },
    };
  }

  const split = test.question.split("+");

  const correctAnswer = split.reduce((acc, curr) => acc + parseInt(curr), 0);

  return {
    ...test,
    answer: correctAnswer,
  };
});

const fixedTestData = await Promise.all(fixedTestDataPromises);

const fixedBody = {
  task: "JSON",
  apikey: process.env.PERSONAL_API_KEY,
  answer: {
    apikey: process.env.PERSONAL_API_KEY,
    description: parsedResult.data.description,
    copyright: parsedResult.data.copyright,
    "test-data": fixedTestData,
  },
};

console.log(fixedBody);

const sendFixResponse = await fetch(`${process.env.HQ_URL}/report`, {
  method: "POST",
  body: JSON.stringify(fixedBody),
});

console.log(await sendFixResponse.json());
