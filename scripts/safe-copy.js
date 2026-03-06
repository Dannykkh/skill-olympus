#!/usr/bin/env node
// safe-copy.js — Robust file/directory copy with broken symlink recovery
// Replaces all inline `node -e` fs calls in install.bat
//
// Usage:
//   node safe-copy.js cleanup <dir>          Remove broken symlinks/junctions in skills/agents/hooks
//   node safe-copy.js dir <src> <dest>       Copy directory recursively
//   node safe-copy.js file <src> <dest>      Copy single file
//   node safe-copy.js mkdir <dir>            Create directory

const fs = require("fs");
const path = require("path");

const mode = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

// Remove any broken entry (symlink, junction, corrupted dir) at the given path
function removeBroken(p) {
  try {
    fs.lstatSync(p); // entry exists
    try {
      fs.readdirSync(p); // can we read it?
    } catch (e) {
      // Entry exists but can't be read — broken symlink/junction/corrupted
      try {
        fs.rmSync(p, { recursive: true, force: true });
      } catch (e2) {
        // rmSync not available or failed — try alternatives
        try { fs.rmdirSync(p); } catch (e3) {
          try { fs.unlinkSync(p); } catch (e4) {
            // Last resort: shell rmdir
            try {
              require("child_process").execSync(
                process.platform === "win32"
                  ? `rmdir /s /q "${p}"`
                  : `rm -rf "${p}"`,
                { stdio: "ignore" }
              );
            } catch (e5) {}
          }
        }
      }
      return true;
    }
  } catch (e) {
    // Entry doesn't exist — nothing to do
  }
  return false;
}

// Create directory, auto-recovering broken entries in the path
function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    // Walk up the path to find and fix broken entries
    const segments = path.resolve(dir).split(path.sep);
    let current = segments[0] + path.sep; // drive root (e.g. C:\)
    for (let i = 1; i < segments.length; i++) {
      current = path.join(current, segments[i]);
      try {
        const s = fs.lstatSync(current);
        if (s.isSymbolicLink() || !s.isDirectory()) {
          // Broken symlink or non-directory blocking the path
          removeBroken(current);
          fs.mkdirSync(current);
        } else {
          // Regular directory — check if readable
          try { fs.readdirSync(current); } catch (re) {
            removeBroken(current);
            fs.mkdirSync(current);
          }
        }
      } catch (le) {
        if (le.code === "ENOENT") {
          fs.mkdirSync(current, { recursive: true });
          break;
        }
      }
    }
  }
}

switch (mode) {
  case "cleanup": {
    const dir = arg1;
    const subdirs = process.argv.slice(4);
    if (subdirs.length === 0) subdirs.push("skills", "agents", "hooks");
    for (const d of subdirs) {
      const t = path.join(dir, d);
      if (removeBroken(t)) {
        console.log("      [cleanup] broken entry removed: " + d);
      }
    }
    break;
  }
  case "dir": {
    // 기존 심볼릭 링크/정션이 있으면 제거 후 복사 (install-link.bat 잔존 대응)
    try {
      const s = fs.lstatSync(arg2);
      if (s.isSymbolicLink()) {
        fs.unlinkSync(arg2);
      } else if (!s.isDirectory()) {
        fs.unlinkSync(arg2);
      } else {
        // 일반 디렉토리 — src와 같은 경로인지 확인
        const realSrc = fs.realpathSync(arg1);
        const realDest = fs.realpathSync(arg2);
        if (realSrc === realDest) {
          // 이미 같은 경로 (정션 등) — 삭제 후 복사
          fs.rmSync(arg2, { recursive: true, force: true });
        }
      }
    } catch (e) {
      // 존재하지 않으면 무시
    }
    ensureDir(arg2);
    fs.cpSync(arg1, arg2, { recursive: true, force: true });
    break;
  }
  case "file": {
    // 기존 심볼릭 링크가 있으면 제거
    try {
      if (fs.lstatSync(arg2).isSymbolicLink()) fs.unlinkSync(arg2);
    } catch (e) { /* 존재하지 않으면 무시 */ }
    ensureDir(path.dirname(arg2));
    fs.copyFileSync(arg1, arg2);
    break;
  }
  case "mkdir": {
    ensureDir(arg1);
    break;
  }
  default:
    console.error("Unknown mode:", mode);
    process.exit(1);
}
