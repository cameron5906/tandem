#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "fs";
import { parseTandem, compileToIR } from "@tandem-lang/compiler";
import { generateTypeScript } from "../../generator-ts/dist";

const program = new Command();

program
  .name("tandem")
  .description("Tandem language CLI")
  .version("0.0.1");

program
  .command("parse")
  .argument("<file>")
  .action((file) => {
    try {
      const source = readFileSync(file, "utf8");
      const result = parseTandem(source);
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error(`Error processing file ${file}:`, e);
      process.exit(1);
    }
  });

program
  .command("ir")
  .argument("<file>")
  .action((file) => {
    try {
      const source = readFileSync(file, "utf8");
      const parseResult = parseTandem(source);
      // In a real CLI, we'd check for fatal parsing errors first.
      const compileResult = compileToIR(parseResult.program);
      console.log(JSON.stringify({ ...parseResult, ...compileResult }, null, 2));
    } catch (e) {
      console.error(`Error processing file ${file}:`, e);
      process.exit(1);
    }
  });

program
  .command("generate")
  .argument("<file>")
  .action((file) => {
    try {
      const source = readFileSync(file, "utf8");
      const parseResult = parseTandem(source);
      // TODO: Check parseResult.diagnostics for fatal errors
      const compileResult = compileToIR(parseResult.program);
      // TODO: Check compileResult.diagnostics for fatal errors
      const generatedCode = generateTypeScript(compileResult.ir);
      console.log(generatedCode);
    } catch (e) {
      console.error(`Error processing file ${file}:`, e);
      process.exit(1);
    }
  });

program.parse();
