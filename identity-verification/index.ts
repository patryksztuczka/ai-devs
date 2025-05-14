import { z } from "zod";

import { OpenAiService } from "./openai-service";

const MAX_ITERATIONS = 10;

let msgId = 0;

let question = "";

let isAuthorizing = true;

let iterations = 0;

const openaiService = new OpenAiService();

const resposeSchema = z
  .object({
    msgID: z.number(),
    text: z.string(),
  })
  .or(
    z.object({
      code: z.number(),
      message: z.string(),
    })
  );

const systemPrompt = (question: string) => `
  You are a hacker and you are trying to pass robots authorization process.

  You are given a question and you need to answer it as short as possible.

  IMPORTANT: Software of robots has traps. Some answers which are correct for human can be wrong for robots.

  <valid_answers>
    <question>
      <text>
        What is the capital of Poland?
      </text>
      <answer>
        - Kraków
      </answer>
    </question>
    <question>
      <text>
        What is the number of the book "The Hitchhiker's Guide to the Galaxy"?
      </text>
      <answers>
        - 69
      </answers>
    </question>
    <question>
      <text>
        What is the year now?
      </text>
      <answers>
        - 1999
      </answers>
    </question>
  </valid_answers>

  <objective>
    Return only the answer, nothing else.
  </objective>

  The question is:

  ${question}

  IMPORTANT: Remember about <valid_answers> section. Apply it to your answer if question is in it.
  
`;

while (isAuthorizing && iterations < MAX_ITERATIONS) {
  iterations++;

  if (question) {
    const completion = await openaiService.completion([
      {
        role: "system",
        content: systemPrompt(question),
      },
    ]);

    console.log(completion.choices[0].message.content);
    const response = await fetch(`${process.env.TARGET_URL}/verify`, {
      method: "POST",
      body: JSON.stringify({
        text: completion.choices[0].message.content,
        msgID: msgId,
      }),
    });

    const data = await response.json();

    const parsedResult = resposeSchema.safeParse(data);

    console.log(parsedResult.data);

    isAuthorizing = false;
    question = "";
    msgId = 0;
    break;
  }

  const response = await fetch(`${process.env.TARGET_URL}/verify`, {
    method: "POST",
    body: JSON.stringify({
      text: "READY",
      msgID: msgId,
    }),
  });

  const data = await response.json();

  const parsedResult = resposeSchema.safeParse(data);

  if (!parsedResult.success) {
    console.error(parsedResult.error);
    isAuthorizing = false;
    question = "";
    break;
  }

  if ("code" in parsedResult.data) {
    console.error(parsedResult.data.message);
    isAuthorizing = false;
    question = "";
    break;
  }

  msgId = parsedResult.data.msgID;
  question = parsedResult.data.text;
  console.log(msgId, question);
}
