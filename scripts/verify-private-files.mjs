import { readFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { execFileSync } from "node:child_process";

const blockedPaths = [
  /(?:^|\/)\.private(?:\/|$)/i,
  /(?:^|\/)PRIVATE_/i,
  /PRIVATE_DESIGN|CODEX_BOOTSTRAP/i,
  /MCP_Gateway_详细设计文档.*\.docx$/i,
  /(?:^|\/)\.env(?:\..*)?$/i,
  /\.(?:pem|key|p12|crt|cer|jks|sarif)$/i,
  /(?:^|\/)(?:secrets|credentials|logs|data|tmp)(?:\/|$)/i,
];
const generated = new Set([".git", "node_modules", "dist", "build", "coverage"]);
const binaries = new Set([
  ".doc",
  ".docx",
  ".pdf",
  ".zip",
  ".gz",
  ".7z",
  ".tar",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bin",
]);
const anonymousEmail = /^[a-z0-9+_.-]+@users\.noreply\.github\.com$/i;
const rules = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  [
    "credential",
    /\b(?:token|access_token|api[_-]?key|secret|password)["']?\s*[:=]\s*["'][^"'\r\n]{8,}["']/i,
  ],
  [
    "provider-token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/,
  ],
];
let failures = 0;
function finding(location, category) {
  failures++;
  console.error(`verify:private: ${location}: ${category} (value redacted)`);
}
export function isBlockedPath(path) {
  path = path.replaceAll("\\", "/");
  return !/(?:^|\/)\.env\.example$/i.test(path) && blockedPaths.some((rule) => rule.test(path));
}
function git(args) {
  try {
    return execFileSync("git", args, {
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    throw new Error("Git check failed; privacy verification is incomplete");
  }
}
function paths(buffer) {
  return buffer.toString("utf8").split("\0").filter(Boolean);
}
function scanContent(content, location, path) {
  for (const [category, rule] of rules) if (rule.test(content)) finding(location, category);
  for (const email of content.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
    if (!anonymousEmail.test(email[0]) && !email[0].endsWith("@example.com"))
      finding(location, "personal-email");
  }
  for (const match of content.matchAll(/https?:\/\/[^\s"'`<>]+/gi)) {
    let url;
    try {
      url = new URL(match[0]);
    } catch {
      continue;
    }
    const local =
      ["localhost", "127.0.0.1", "[::1]", "example.com"].includes(url.hostname) ||
      url.hostname.endsWith(".example.com");
    const dependency =
      path === "package-lock.json" &&
      ((["mirrors.huaweicloud.com", "registry.npmjs.org"].includes(url.hostname) &&
        url.pathname.endsWith(".tgz")) ||
        [
          "github.com",
          "opencollective.com",
          "tidelift.com",
          "github.blog",
          "feross.org",
          "www.patreon.com",
          "eslint.org",
        ].includes(url.hostname));
    const fundingQuery = dependency && url.hostname === "github.com" && url.search === "?sponsor=1";
    if (url.username || url.password || (url.search && !fundingQuery) || (!local && !dependency))
      finding(location, "non-example-url");
  }
}
function scanBuffer(buffer, path, source) {
  const location = `${source}:${path}`;
  if (isBlockedPath(path)) {
    finding(location, "private-path");
    return;
  }
  if (
    binaries.has(extname(path).toLowerCase()) ||
    buffer.includes(0) ||
    buffer.subarray(0, 2).toString() === "PK"
  ) {
    finding(location, "unreviewed-binary");
    return;
  }
  scanContent(buffer.toString("utf8"), location, path);
}
function scanWorkingTree(dir = ".", prefix = "") {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (isBlockedPath(path) || generated.has(entry.name)) continue;
    if (entry.isSymbolicLink()) {
      finding(`worktree:${path}`, "symlink-needs-review");
      continue;
    }
    if (entry.isDirectory()) scanWorkingTree(join(dir, entry.name), path + "/");
    else scanBuffer(readFileSync(join(dir, entry.name)), path, "worktree");
  }
}
function verifyIdentity() {
  for (const kind of ["GIT_AUTHOR_IDENT", "GIT_COMMITTER_IDENT"]) {
    const ident = git(["var", kind]).toString("utf8");
    const email = ident.match(/<([^<>]+)>/u)?.[1] ?? "";
    if (!anonymousEmail.test(email)) finding("commit-identity", "use-github-noreply-email");
  }
}
function scanHistory() {
  const commits = git(["rev-list", "--all"]).toString("utf8").trim().split("\n").filter(Boolean);
  const seen = new Set();
  for (const commit of commits) {
    const emails = git(["show", "-s", "--format=%ae%n%ce", commit])
      .toString("utf8")
      .trim()
      .split("\n");
    if (emails.some((email) => !anonymousEmail.test(email)))
      finding(commit, "personal-commit-email");
    scanContent(
      git(["show", "-s", "--format=%B", commit]).toString("utf8"),
      commit,
      "commit-message",
    );
    for (const record of paths(git(["ls-tree", "-rz", commit]))) {
      const [header, ...name] = record.split("\t");
      const path = name.join("\t");
      const [mode, type, oid] = header.split(" ");
      if (type !== "blob" || mode === "120000") {
        finding(`${commit}:${path}`, "unsupported-git-entry");
        continue;
      }
      const key = path + ":" + oid;
      if (!seen.has(key)) {
        seen.add(key);
        scanBuffer(git(["cat-file", "blob", oid]), path, commit);
      }
    }
  }
}
try {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--identity", "--history", "--export"].includes(arg)))
    throw new Error("Unknown verification option");
  if (args.includes("--export")) {
    if (args.length !== 1) throw new Error("Export mode cannot verify Git identity or history");
    console.log("verify:private: export mode; Git history and index NOT verified");
  } else {
    if (git(["rev-parse", "--is-inside-work-tree"]).toString().trim() !== "true")
      throw new Error("Git work tree required");
    for (const record of paths(git(["ls-files", "--stage", "-z"]))) {
      const [header, ...name] = record.split("\t");
      const [mode, oid, stage] = header.split(" ");
      const path = name.join("\t");
      if (stage !== "0" || (mode !== "100644" && mode !== "100755")) {
        finding(`index:${path}`, "unsupported-git-entry");
        continue;
      }
      scanBuffer(git(["cat-file", "blob", oid]), path, "index");
    }
    if (args.includes("--identity")) verifyIdentity();
    if (args.includes("--history")) scanHistory();
  }
  scanWorkingTree();
  if (failures) process.exitCode = 1;
  else
    console.log("verify:private: no findings under configured rules; not a guarantee of absence");
} catch (error) {
  console.error(`verify:private: ${error.message}`);
  process.exitCode = 1;
}
