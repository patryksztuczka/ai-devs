import chalk from "chalk";
import inquirer from "inquirer";
import { BananApiService } from "./banan-api-service";
import { OpenAiService } from "./openai-service";
import { findActiveDatacentersWithNotActiveManagersResponseSchema } from "./schemas";
import { sendAnswerToAPI } from "../helpers";

async function findActiveDatacentersWithNotActiveManagers() {
  try {
    const openAiService = new OpenAiService();
    const allTablesStructure = [];
    const bananApiService = new BananApiService();
    const tables = await bananApiService.showTables();
    for (const table of tables) {
      const result = await bananApiService.showCreateTable(table);
      allTablesStructure.push(result);
    }
    const query = await openAiService.getQuery(
      "Find ids of active datacenters with managers who are on vacation",
      allTablesStructure
    );
    if (query) {
      console.log(chalk.blue("Query: "), query);
      const result = await bananApiService.queryDatabase(query);
      const parsedResult =
        findActiveDatacentersWithNotActiveManagersResponseSchema.parse(result);
      const ids = parsedResult.reply.map((item) => item.dc_id);
      console.log(chalk.blue("Ids: "), ids);
      await sendAnswerToAPI("database", ids);
    }
  } catch (error) {
    console.error(
      chalk.red("Error finding active datacenters with not active managers:"),
      error
    );
  }
}

async function main() {
  const choices = ["Find active datacenters with not active managers", "Exit"];

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices,
    },
  ]);

  switch (action) {
    case "Find active datacenters with not active managers":
      console.log(
        chalk.blue("Finding active datacenters with not active managers...")
      );
      await findActiveDatacentersWithNotActiveManagers();
      break;
    case "Exit":
      console.log(chalk.yellow("Goodbye!"));
      process.exit(0);
  }

  await main();
}

main();
