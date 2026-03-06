import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  AGENTS,
  MODEL_MAP,
  buildPrompt,
  cleanSnippet,
  normalizeSnippet,
  readJson,
  resolveProjectRoot,
  validateSnippet
} from "./snippet-utils.mjs";

const projectRoot = resolveProjectRoot();
const specsPath = path.join(projectRoot, "data", "challenge-specs.json");
const snippetsPath = path.join(projectRoot, "data", "snippets.json");
const generatedDir = path.join(projectRoot, "generated");
const LEGACY_AGENT_FALLBACK = {
  GPT53CodexHigh: ["GPT"],
  Claude46OpusHigh: ["Claude"],
  Gemini31ProThinking: ["Gemini"],
  Gemini3FlashThinking: ["Composer", "Gemini"]
};

function runCursorOnce(prompt, model) {
  return new Promise((resolve, reject) => {
    const child = spawn("cursor", ["agent", "--print", "--model", model, "--trust", prompt], {
      cwd: projectRoot,
      env: process.env
    });
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, 30000);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (buf) => {
      stdout += buf.toString();
    });
    child.stderr.on("data", (buf) => {
      stderr += buf.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolve(stdout);
      else reject(new Error(`cursor exited ${code}: ${stderr}`));
    });
  });
}

async function runCursor(prompt, model) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await runCursorOnce(prompt, model);
    } catch (error) {
      lastError = error;
      const msg = String(error?.message || "");
      const transient =
        msg.includes("Client network socket disconnected") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT") ||
        msg.includes("aborted") ||
        (msg.includes("Cannot use this model") && msg.includes("Available models:"));
      if (!transient || attempt === 3) break;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    ids: [],
    retries: 4,
    agents: AGENTS
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--ids") {
      out.ids = args[i + 1].split(",").map((v) => v.trim()).filter(Boolean);
      i += 1;
    } else if (arg === "--retries") {
      out.retries = Number(args[i + 1] || "4");
      i += 1;
    } else if (arg === "--agents") {
      out.agents = args[i + 1].split(",").map((v) => v.trim()).filter(Boolean);
      i += 1;
    }
  }
  return out;
}

async function writeGenerated(id, agent, code) {
  await fs.mkdir(generatedDir, { recursive: true });
  const outPath = path.join(generatedDir, `${id}-${agent}.txt`);
  await fs.writeFile(outPath, `${code.trim()}\n`, "utf8");
}

function buildFallbackPrompt(spec, violationSummary = "") {
  const required = spec.requiredIdentifiers.join(", ");
  const forbidden = spec.forbiddenPatterns.join(", ");
  const lines = [
    `Write ${spec.language} code only.`,
    `Task: ${spec.label}.`,
    `Entrypoint name must be exactly "${spec.rules.requireEntrypointName}".`,
    `Required identifiers: ${required}.`,
    `Min lines: ${spec.minLines ?? 1}.`,
    `Max lines: ${spec.maxLines}.`,
    `Forbidden patterns: ${forbidden}.`,
    "No explanation."
  ];
  if (violationSummary) {
    lines.push(`Previous output failed for: ${violationSummary}`);
  }
  return lines.join(" ");
}

async function main() {
  const { ids, retries, agents } = parseArgs();
  const specs = await readJson(specsPath);
  const existing = await readJson(snippetsPath).catch(() => []);
  const existingMap = new Map(existing.map((entry) => [entry.id, entry]));
  const targetSpecs = ids.length ? specs.filter((spec) => ids.includes(spec.id)) : specs;
  if (targetSpecs.length === 0) {
    throw new Error("No challenge specs matched the selected ids.");
  }

  for (const spec of targetSpecs) {
    for (const agent of agents) {
      const mapped = MODEL_MAP[agent];
      const models = Array.isArray(mapped) ? mapped : [mapped];
      if (!models[0]) throw new Error(`Unknown agent: ${agent}`);
      let successCode = "";
      let violationSummary = "";

      for (let attempt = 1; attempt <= retries; attempt++) {
        const prompt =
          attempt <= Math.ceil(retries / 2)
            ? buildPrompt(spec, violationSummary)
            : buildFallbackPrompt(spec, violationSummary);
        let runError;
        let bestFailure = "";
        for (const model of models) {
          try {
            const raw = await runCursor(prompt, model);
            const cleaned = cleanSnippet(raw);
            const code = normalizeSnippet(spec, cleaned);
            if (!code.trim()) {
              bestFailure = "empty output";
              continue;
            }
            const result = validateSnippet(spec, code);
            if (result.passed) {
              successCode = code;
              runError = undefined;
              break;
            }
            bestFailure = result.failures.map((f) => `${f.code} (${f.detail})`).join("; ");
          } catch (error) {
            runError = error;
          }
        }
        if (successCode) {
          break;
        }
        if (runError) {
          const message = String(runError?.message || "generation error");
          violationSummary = `generation_error (${message.slice(0, 240)})`;
        } else {
          violationSummary = bestFailure || "validation failed";
        }
      }

      if (!successCode) {
        const fallbackNames = [agent, ...(LEGACY_AGENT_FALLBACK[agent] || [])];
        const fallbackRaw = fallbackNames
          .map((name) => existingMap.get(spec.id)?.answers?.[name])
          .find(Boolean);
        const fallback = fallbackRaw ? normalizeSnippet(spec, cleanSnippet(fallbackRaw)) : "";
        const fallbackResult = fallback ? validateSnippet(spec, fallback) : { passed: false };
        if (fallbackResult.passed) {
          successCode = fallback;
          console.warn(`fallback ${spec.id}/${agent} (existing snippet)`);
        } else {
          throw new Error(
            `Failed to generate valid snippet for ${spec.id}/${agent} after ${retries} attempts`
          );
        }
      }
      await writeGenerated(spec.id, agent, successCode);
      console.log(`generated ${spec.id}/${agent}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
