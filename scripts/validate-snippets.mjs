import fs from "node:fs/promises";
import path from "node:path";
import {
  AGENTS,
  cleanSnippet,
  computeLineRatio,
  normalizeSnippet,
  readJson,
  resolveProjectRoot,
  validateSnippet,
  writeJson
} from "./snippet-utils.mjs";

const projectRoot = resolveProjectRoot();
const specsPath = path.join(projectRoot, "data", "challenge-specs.json");
const snippetsPath = path.join(projectRoot, "data", "snippets.json");
const generatedDir = path.join(projectRoot, "generated");
const reportPath = path.join(projectRoot, "generated", "validation-report.json");

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    source: "data",
    ids: [],
    write: false,
    strictRatio: 1.6
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--source") {
      out.source = args[i + 1] || "data";
      i += 1;
    } else if (arg === "--ids") {
      out.ids = (args[i + 1] || "").split(",").map((v) => v.trim()).filter(Boolean);
      i += 1;
    } else if (arg === "--write") {
      out.write = true;
    } else if (arg === "--strict-ratio") {
      out.strictRatio = Number(args[i + 1] || "1.6");
      i += 1;
    }
  }
  return out;
}

async function loadFromData(specs, ids) {
  const current = await readJson(snippetsPath);
  const byId = new Map(current.map((entry) => [entry.id, entry]));
  const out = [];
  for (const spec of specs) {
    if (ids.length && !ids.includes(spec.id)) continue;
    const existing = byId.get(spec.id);
    if (!existing) continue;
    out.push({
      id: spec.id,
      label: existing.label || spec.label,
      language: existing.language || spec.language,
      answers: Object.fromEntries(
        AGENTS.map((agent) => {
          const cleaned = cleanSnippet(existing.answers?.[agent] || "");
          return [agent, normalizeSnippet(spec, cleaned)];
        })
      )
    });
  }
  return out;
}

async function loadFromGenerated(specs, ids) {
  const out = [];
  for (const spec of specs) {
    if (ids.length && !ids.includes(spec.id)) continue;
    const answers = {};
    for (const agent of AGENTS) {
      const filePath = path.join(generatedDir, `${spec.id}-${agent}.txt`);
      const raw = await fs.readFile(filePath, "utf8");
      answers[agent] = normalizeSnippet(spec, cleanSnippet(raw));
    }
    out.push({
      id: spec.id,
      label: spec.label,
      language: spec.language,
      answers
    });
  }
  return out;
}

function validateDataset(specs, dataset, strictRatio) {
  const specMap = new Map(specs.map((spec) => [spec.id, spec]));
  const report = [];
  let totalFailures = 0;

  for (const entry of dataset) {
    const spec = specMap.get(entry.id);
    if (!spec) continue;
    const modelResults = {};
    for (const agent of AGENTS) {
      const code = entry.answers[agent] || "";
      const result = validateSnippet(spec, code);
      modelResults[agent] = result;
      totalFailures += result.failures.length;
    }

    const ratios = [];
    for (let i = 0; i < AGENTS.length; i++) {
      for (let j = i + 1; j < AGENTS.length; j++) {
        const a = AGENTS[i];
        const b = AGENTS[j];
        const ratio = computeLineRatio(entry.answers[a] || "", entry.answers[b] || "");
        if (ratio > strictRatio) {
          totalFailures += 1;
          ratios.push({
            pair: `${a}-${b}`,
            code: "FAIL_RATIO",
            detail: `line ratio ${ratio.toFixed(2)} exceeds ${strictRatio}`
          });
        }
      }
    }

    report.push({
      id: entry.id,
      language: entry.language,
      models: modelResults,
      pairwise: ratios
    });
  }

  return { report, totalFailures };
}

async function main() {
  const { source, ids, write, strictRatio } = parseArgs();
  const specs = await readJson(specsPath);

  const dataset =
    source === "generated"
      ? await loadFromGenerated(specs, ids)
      : await loadFromData(specs, ids);

  const { report, totalFailures } = validateDataset(specs, dataset, strictRatio);

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await writeJson(reportPath, report);

  if (write) {
    const existing = await readJson(snippetsPath).catch(() => []);
    const replaceMap = new Map(dataset.map((entry) => [entry.id, entry]));
    const merged = [];
    for (const entry of existing) {
      if (replaceMap.has(entry.id)) {
        merged.push(replaceMap.get(entry.id));
        replaceMap.delete(entry.id);
      } else {
        merged.push(entry);
      }
    }
    for (const entry of replaceMap.values()) {
      merged.push(entry);
    }
    await writeJson(snippetsPath, merged);
  }

  const summary = {
    source,
    challenges: dataset.length,
    failures: totalFailures,
    reportPath: path.relative(projectRoot, reportPath),
    wroteDataset: write
  };
  console.log(JSON.stringify(summary, null, 2));

  if (totalFailures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
