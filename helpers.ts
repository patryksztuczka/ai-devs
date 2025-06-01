import chalk from "chalk";

export async function sendAnswerToAPI(task: string, answer: any) {
  if (!process.env.HQ_URL || !process.env.PERSONAL_API_KEY) {
    throw new Error(
      "Missing HQ_URL or PERSONAL_API_KEY in environment variables"
    );
  }

  try {
    const response = await fetch(`${process.env.HQ_URL}/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task,
        apikey: process.env.PERSONAL_API_KEY,
        answer,
      }),
    });

    const result = await response.json();

    console.log(chalk.gray("API response:", JSON.stringify(result, null, 2)));
    return result as {
      code: number;
      message: string;
    };
  } catch (error) {
    console.error(chalk.red("Failed to send answer to API:"), error);
  }
}
