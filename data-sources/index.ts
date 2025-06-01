import chalk from "chalk";
import inquirer from "inquirer";
import fs from "node:fs/promises";
import path from "path";

import { OpenAiService } from "./openai-service";
import { CentralaService } from "./centrala-service";
import { sendAnswerToAPI } from "../helpers";

const INPUT_DIR = "./data-sources/data";
const OUTPUT_DIR = "./data-sources/output";

async function extractDataFromBarbaraText() {
  const openAiService = new OpenAiService();
  const noteContent = await fs.readFile(
    path.join(INPUT_DIR, "barbara.txt"),
    "utf8"
  );
  const response = await openAiService.ask([
    {
      role: "system",
      content: `
      You are an expert in extracting data from text.
      <objectives>
        - Extract ALL first names of people and cities from the text.
        - All words should be returned in nominative case.
        - Return as object: { "names": string[], "locations": string[] }
      </objectives>
      `,
    },
    {
      role: "user",
      content: `
      <note>
        ${noteContent}
      </note>
      `,
    },
  ]);

  await fs.writeFile(
    path.join(OUTPUT_DIR, "names-and-locations.json"),
    response.output_text
  );
}

async function findBarbara() {
  try {
    const namesAndLoactions = await fs.readFile(
      path.join(OUTPUT_DIR, "names-and-locations.json"),
      { encoding: "utf-8" }
    );
    const data = (await JSON.parse(namesAndLoactions)) as {
      names: string[];
      locations: string[];
    };

    const namesSet = new Set<string>(data.names);
    const locationsSet = new Set<string>(data.locations);

    const centralaService = new CentralaService();

    let isBarbaraFound = false;
    let potentialLocations = new Set<string>();

    while (!isBarbaraFound) {
      for (const name of namesSet) {
        const result = await centralaService.getLocationsByVisitor(name);
        result.message.split(" ").forEach((location) => {
          locationsSet.add(location);
        });
      }

      for (const location of locationsSet) {
        const result = await centralaService.getVisitorsByLocation(location);
        const peopleInLocation = result.message.split(" ");
        peopleInLocation.forEach((person) => namesSet.add(person));
        console.log(location, peopleInLocation);
        if (peopleInLocation.includes("BARBARA")) {
          potentialLocations.add(location);
        }
      }

      for (const location of potentialLocations) {
        const result = await sendAnswerToAPI("loop", location);
        if (result?.code === 0) {
          isBarbaraFound = true;
          break;
        }
      }
    }
  } catch (error) {
    console.error(chalk.red("Error reading names and locations:"), error);
  }
}

async function main() {
  const choices = ["Extract data from Barbara's text", "Find Barbara", "Exit"];

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices,
    },
  ]);

  switch (action) {
    case "Extract data from Barbara's text":
      console.log(chalk.blue("Extracting data from Barbara's text..."));
      await extractDataFromBarbaraText();
      break;
    case "Find Barbara":
      console.log(chalk.blue("Searching for Barbara..."));
      await findBarbara();
      break;
    case "Exit":
      console.log(chalk.yellow("Goodbye!"));
      process.exit(0);
  }

  await main();
}

main();
