import chalk from "chalk";
import inquirer from "inquirer";
import fs from "node:fs/promises";
import path from "path";

import { sendAnswerToAPI } from "../helpers";
import { BananApiService } from "./banan-api-service";
import type { TUser, TUsersConnection } from "./schemas";
import { Neo4jService } from "./neo4j-service";
import type { PathSegment } from "neo4j-driver";

const OUTPUT_DIR = "./shortest-path";

async function fetchUsersAndConnections() {
  const bananApiService = new BananApiService();
  const users = await bananApiService.getUsers();
  const connections = await bananApiService.getConnections();
  await fs.writeFile(
    path.join(OUTPUT_DIR, "users.json"),
    JSON.stringify(users, null, 2)
  );
  await fs.writeFile(
    path.join(OUTPUT_DIR, "connections.json"),
    JSON.stringify(connections, null, 2)
  );
}

async function writeDataToGraphDatabase() {
  const users = await fs.readFile(path.join(OUTPUT_DIR, "users.json"), "utf8");
  const connections = await fs.readFile(
    path.join(OUTPUT_DIR, "connections.json"),
    "utf8"
  );
  const usersData = JSON.parse(users) as TUser[];
  const connectionsData = JSON.parse(connections) as TUsersConnection[];
  const neo4jService = new Neo4jService(
    process.env.NEO4J_URI!,
    process.env.NEO4J_USER!,
    process.env.NEO4J_PASSWORD!
  );

  for (const user of usersData) {
    await neo4jService.addNode("User", {
      userId: user.id,
      username: user.username,
    });
  }

  for (const connection of connectionsData) {
    await neo4jService.connectNodes(
      Number(connection.user1_id),
      Number(connection.user2_id),
      "KNOWS"
    );
  }
}

async function findShortestPath() {
  const names = [];
  const neo4jService = new Neo4jService(
    process.env.NEO4J_URI!,
    process.env.NEO4J_USER!,
    process.env.NEO4J_PASSWORD!
  );
  const result = await neo4jService.findShortestPath("Rafał", "Barbara");
  result.records.forEach((record) => {
    const path = record.get("p");
    path.segments.forEach((segment: PathSegment, index: number) => {
      names.push(segment.start.properties.username);
    });
  });
  names.push("Barbara");
  const pathString = names.join(",");

  await sendAnswerToAPI("connections", pathString);
}

async function main() {
  const choices = [
    "Fetch data about users and connections",
    "Write data to graph database",
    "Find shortest path",
    "Exit",
  ];

  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do?",
      choices,
    },
  ]);

  switch (action) {
    case "Fetch data about users and connections":
      console.log(chalk.blue("Fetching data about users and connections..."));
      await fetchUsersAndConnections();
      break;
    case "Write data to graph database":
      console.log(chalk.blue("Writing data to graph database..."));
      await writeDataToGraphDatabase();
      break;
    case "Find shortest path":
      console.log(chalk.blue("Finding shortest path..."));
      await findShortestPath();
      break;
    case "Exit":
      console.log(chalk.yellow("Goodbye!"));
      process.exit(0);
  }

  await main();
}

main();
