import fs from "node:fs/promises";
import path from "node:path";

export const MODEL_MAP = {
  GPT53CodexHigh: ["gpt-5.3-codex-high", "gpt-5.3-codex"],
  Claude46OpusHigh: ["opus-4.6-thinking", "opus-4.6", "sonnet-4.6-thinking"],
  Gemini31ProThinking: ["gemini-3.1-pro", "gemini-3-pro"],
  Gemini3FlashThinking: ["gemini-3-flash"]
};

export const AGENTS = Object.keys(MODEL_MAP);

export function resolveProjectRoot() {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
}

export async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function languageAppendix(language) {
  if (language === "javascript") {
    return [
      "## JavaScript-specific rules",
      "- No import/export/module statements unless explicitly allowed",
      "- No class keyword",
      "- No console.log",
      "- No markdown fences"
    ].join("\n");
  }
  if (language === "typescript") {
    return [
      "## TypeScript-specific rules",
      "- No top-level imports unless explicitly allowed",
      "- No describe(, it(, test(",
      "- No console.log",
      "- No markdown fences"
    ].join("\n");
  }
  if (language === "python") {
    return [
      "## Python-specific rules",
      "- No if __name__ == '__main__'",
      "- No print(",
      "- No def test_",
      "- No markdown fences"
    ].join("\n");
  }
  if (language === "rust") {
    return [
      "## Rust-specific rules",
      "- No #[cfg(test)] or #[test]",
      "- No fn main(",
      "- No println!",
      "- No markdown fences"
    ].join("\n");
  }
  return "";
}

export function buildPrompt(spec, violationSummary = "") {
  const forbidden = spec.forbiddenPatterns.join(", ");
  const required = spec.requiredIdentifiers.join(", ");
  const importRule = spec.rules.allowTopLevelImports ? "allowed" : "forbidden";
  const testRule = spec.rules.allowTestBlocks ? "allowed" : "forbidden";

  const core = [
    "You must output ONLY executable source code.",
    "No markdown, no explanation, no prose.",
    "",
    "## Task",
    spec.label,
    "",
    "## Constraints (MANDATORY)",
    `- Entrypoint: ${spec.entrypoint}`,
    `- Entrypoint name must be exactly: ${spec.rules.requireEntrypointName}`,
    `- Required identifiers (all must appear): ${required}`,
    `- Minimum lines: ${spec.minLines ?? 1}`,
    `- Maximum lines: ${spec.maxLines}`,
    `- Forbidden patterns: ${forbidden}`,
    `- Top-level imports: ${importRule}`,
    `- Test blocks: ${testRule}`,
    "",
    languageAppendix(spec.language),
    "",
    "Output raw code only."
  ];

  if (!violationSummary) return core.join("\n");
  return [
    ...core,
    "",
    "Your previous output violated constraints.",
    `Violations: ${violationSummary}`,
    "Regenerate and strictly satisfy all constraints."
  ].join("\n");
}

export function cleanSnippet(raw) {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  const fencedAny = normalized.match(/```[^\n]*\n([\s\S]*?)```/m);
  const code = fencedAny ? fencedAny[1] : normalized;
  const stripped = code
    .replace(/^Here(?:'s| is)[^\n]*\n/gim, "")
    .replace(/^Saved[^\n]*\n/gim, "")
    .replace(/^\s*```[a-zA-Z0-9_-]*\s*$/gm, "")
    .trim();

  const hasCodeStart = (text) =>
    /(?:^|\n)\s*(?:export\s+)?(?:function|const|class|def|async def|use|pub struct|struct|impl)\b/m.test(
      text
    );

  if (stripped && hasCodeStart(stripped)) return stripped;

  const probable = normalized
    .split("\n")
    .filter((line) =>
      /^(?:\s*(?:def|async def|function|const|class|export|use|struct|pub struct|impl)\b|[\s\}\{])/m.test(line)
    )
    .join("\n")
    .trim();
  if (probable && hasCodeStart(probable)) return probable;

  const lines = normalized.split("\n");
  const start = lines.findIndex((line) =>
    /^(?:\s*(?:export\s+)?(?:function|const|class|def|async def|use|pub struct|struct|impl)\b)/.test(line)
  );
  if (start >= 0) {
    return lines.slice(start).join("\n").trim();
  }
  return stripped || normalized;
}

export function normalizeSnippet(spec, code) {
  let out = code.replace(/\r\n/g, "\n").trim();

  if (spec.id === "factors") {
    out = out.replace(/\bdef\s+get_prime_factors\b/g, "def prime_factors");
  }
  if (spec.id === "stream_window") {
    out = out.replace(/\bfunction\s+shortestCoveringSubstring\b/g, "function minWindow");
  }

  if (spec.language === "rust" && !spec.rules.allowTestBlocks) {
    out = out.replace(/\n#\[cfg\(test\)\][\s\S]*$/m, "");
  }

  return out.trim();
}

function hasTopLevelImport(language, code) {
  if (language === "javascript" || language === "typescript") {
    return /^\s*import\s+/m.test(code);
  }
  if (language === "python") {
    return /^\s*(?:from\s+\S+\s+import|import\s+)/m.test(code);
  }
  if (language === "rust") {
    return /^\s*use\s+/m.test(code);
  }
  return false;
}

function hasTestBlocks(language, code) {
  if (language === "javascript" || language === "typescript") {
    return /(?:describe\(|it\(|test\()/m.test(code);
  }
  if (language === "python") {
    return /^\s*def\s+test_/m.test(code);
  }
  if (language === "rust") {
    return /#\[cfg\(test\)\]|#\[test\]/m.test(code);
  }
  return false;
}

export function validateSnippet(spec, code) {
  const failures = [];
  const lines = code.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length > spec.maxLines) {
    failures.push({
      code: "FAIL_MAX_LINES",
      detail: `line count ${nonEmptyLines.length} exceeds max ${spec.maxLines}`
    });
  }
  if (nonEmptyLines.length < (spec.minLines ?? 1)) {
    failures.push({
      code: "FAIL_MIN_LINES",
      detail: `line count ${nonEmptyLines.length} below min ${spec.minLines ?? 1}`
    });
  }

  if (code.includes("```")) {
    failures.push({ code: "FAIL_MARKDOWN", detail: "contains markdown fence" });
  }

  for (const pattern of spec.forbiddenPatterns) {
    if (pattern && code.includes(pattern)) {
      failures.push({ code: "FAIL_FORBIDDEN", detail: `forbidden pattern: ${pattern}` });
    }
  }

  for (const id of spec.requiredIdentifiers) {
    const re = new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (!re.test(code)) {
      failures.push({ code: "FAIL_REQUIRED_ID", detail: `missing identifier: ${id}` });
    }
  }

  const entrypointName = spec.rules.requireEntrypointName;
  const entryRe = new RegExp(
    [
      `function\\s+${entrypointName}\\b`,
      `const\\s+${entrypointName}\\b`,
      `def\\s+${entrypointName}\\b`,
      `class\\s+${entrypointName}\\b`,
      `struct\\s+${entrypointName}\\b`,
      `pub\\s+struct\\s+${entrypointName}\\b`
    ].join("|"),
    "m"
  );
  if (!entryRe.test(code)) {
    failures.push({
      code: "FAIL_ENTRYPOINT",
      detail: `entrypoint name mismatch: expected ${entrypointName}`
    });
  }

  if (!spec.rules.allowTopLevelImports && hasTopLevelImport(spec.language, code)) {
    failures.push({ code: "FAIL_IMPORTS", detail: "top-level imports are forbidden" });
  }

  if (!spec.rules.allowTestBlocks && hasTestBlocks(spec.language, code)) {
    failures.push({ code: "FAIL_TEST_BLOCK", detail: "test block is forbidden" });
  }

  const passed = failures.length === 0;
  return {
    passed,
    failures,
    lineCount: nonEmptyLines.length
  };
}

export function computeLineRatio(codeA, codeB) {
  const a = Math.max(1, codeA.split("\n").filter((line) => line.trim()).length);
  const b = Math.max(1, codeB.split("\n").filter((line) => line.trim()).length);
  return Math.max(a, b) / Math.min(a, b);
}
