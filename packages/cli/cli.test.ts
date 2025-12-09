import { describe, it, expect, afterAll } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

describe("@tandem-lang/cli", () => {
  const cliPath = path.resolve(__dirname, "dist/index.js");
  const testFilePath = path.resolve(__dirname, "test.tdm");

  afterAll(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it("runs the parse command on a valid file", () => {
    const sampleTdmPath = path.resolve(__dirname, "../../samples/sample.tdm");
    const source = fs.readFileSync(sampleTdmPath, "utf-8");
    fs.writeFileSync(testFilePath, source);

    const command = `node ${cliPath} parse ${testFilePath}`;

    let output = "";
    let error = null;
    try {
      output = execSync(command, { encoding: "utf8" });
    } catch (e) {
      error = e;
    }

    expect(error).toBeNull();
    const parsedOutput = JSON.parse(output);
    expect(parsedOutput).toHaveProperty("program");
    expect(parsedOutput.program).toHaveProperty("modules");
    expect(parsedOutput.program.modules[0].name).toBe("sample.project");
    expect(parsedOutput.program).toHaveProperty("intents");
    expect(parsedOutput.program.intents[0].name).toBe("GetUser");
  });
});
