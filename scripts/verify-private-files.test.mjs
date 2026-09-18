import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const scanner = resolve("scripts/verify-private-files.mjs");
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), "privacy-test-"));
  const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  const scan = (...args) =>
    spawnSync(process.execPath, [scanner, ...args], { cwd: root, encoding: "utf8" });
  try {
    git("init", "-q");
    git("config", "user.name", "Project Contributor");
    git("config", "user.email", "contributor" + "@users.noreply.github.com");
    run({ root, git, scan });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

for (const [label, content] of [
  ["source credential", 'export const apiKey = "' + "X".repeat(32) + '";'],
  ["internal URL", ["http://", "10.23.45.67/internal"].join("")],
  ["other domain", ["https://", "api.fixture.invalid/private"].join("")],
  ["embedded key", "-----BEGIN " + "PRIVATE KEY-----"],
  ["personal email", "person" + "@mail.invalid"],
]) {
  test(`rejects ${label} without echoing its value`, () =>
    fixture(({ root, scan }) => {
      writeFileSync(join(root, "sample.txt"), content);
      const result = scan();
      assert.equal(result.status, 1);
      assert.ok(!(result.stdout + result.stderr).includes(content));
    }));
}
test("scans index even when working tree has been cleaned", () =>
  fixture(({ root, git, scan }) => {
    writeFileSync(join(root, "sample.txt"), JSON.stringify({ token: "X".repeat(32) }));
    git("add", "sample.txt");
    writeFileSync(join(root, "sample.txt"), "safe");
    assert.equal(scan().status, 1);
  }));
test("allows local examples and anonymous commit identity", () =>
  fixture(({ root, git, scan }) => {
    writeFileSync(join(root, "sample.txt"), "http://127.0.0.1:3000\nhttps://example.com");
    git("add", "sample.txt");
    assert.equal(scan("--identity").status, 0);
  }));
test("rejects personal commit identity", () =>
  fixture(({ git, scan }) => {
    git("config", "user.email", "person" + "@mail.invalid");
    assert.equal(scan("--identity").status, 1);
  }));
test("fails closed without Git unless export mode explicitly selected", () =>
  fixture(({ root, scan }) => {
    rmSync(join(root, ".git"), { recursive: true, force: true });
    assert.equal(scan().status, 1);
    assert.equal(scan("--export").status, 0);
  }));
test("checks previous snapshots, not just HEAD", () =>
  fixture(({ root, git, scan }) => {
    writeFileSync(join(root, "sample.txt"), JSON.stringify({ token: "X".repeat(32) }));
    git("add", "sample.txt");
    git("commit", "-qm", "fixture");
    writeFileSync(join(root, "sample.txt"), "safe");
    git("add", "sample.txt");
    git("commit", "-qm", "clean");
    assert.equal(scan("--history").status, 1);
  }));
