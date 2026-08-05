#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const SIGNAL_HUES = new Set(["green", "orange"]);
const DEFAULT_COUNT = 3;
const DEFAULT_MAX_SIGNAL = 0;

// 과사용 스톡 accent 제외 (2026-08-05 분석: DB 161행 중 133행이 Tailwind 기본 hex —
// docs/research/2026-08-05-deep-research-impeccable.md. "인터넷의 평균"을 후보에서 차단).
// 판정 2중: (1) 아래 알려진 스톡 목록, (2) CSV 안에서 STOCK_FREQUENCY_THRESHOLD회 이상
// 재사용된 accent (DB 자신의 중복이 과사용을 정의 — 목록 유지보수 불필요한 데이터 기반 규칙).
const STOCK_FREQUENCY_THRESHOLD = 4;
const KNOWN_STOCK_ACCENTS = new Set([
  // Tailwind 기본 팔레트 500-700 셰이드 (UI accent로 쓰이는 대역)
  "#EF4444", "#DC2626", "#B91C1C", // red
  "#F97316", "#EA580C", "#C2410C", // orange
  "#F59E0B", "#D97706", "#B45309", // amber
  "#EAB308", "#CA8A04", "#A16207", // yellow
  "#84CC16", "#65A30D", // lime
  "#22C55E", "#16A34A", "#15803D", // green
  "#10B981", "#059669", "#047857", // emerald
  "#14B8A6", "#0D9488", "#0F766E", // teal
  "#06B6D4", "#0891B2", "#0E7490", // cyan
  "#0EA5E9", "#0284C7", // sky
  "#3B82F6", "#2563EB", "#1D4ED8", // blue
  "#6366F1", "#4F46E5", "#4338CA", // indigo
  "#8B5CF6", "#7C3AED", "#6D28D9", // violet
  "#A855F7", "#9333EA", // purple
  "#D946EF", // fuchsia
  "#EC4899", "#DB2777", "#BE185D", // pink
  "#F43F5E", "#E11D48", "#BE123C", // rose
]);

function fail(message) {
  console.error(`[palette-select] ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    type: "",
    count: DEFAULT_COUNT,
    seed: "",
    excludeHues: new Set(),
    maxSignal: DEFAULT_MAX_SIGNAL,
    auditOnly: false,
    allowStock: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];

    if (arg === "--type") {
      if (!value) fail("--type requires a value");
      options.type = value;
      index += 1;
    } else if (arg === "--count") {
      if (!value) fail("--count requires a value");
      options.count = Number.parseInt(value, 10);
      index += 1;
    } else if (arg === "--seed") {
      if (!value) fail("--seed requires a value");
      options.seed = value;
      index += 1;
    } else if (arg === "--exclude-hues") {
      if (!value) fail("--exclude-hues requires a comma-separated value");
      options.excludeHues = new Set(
        value
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      );
      index += 1;
    } else if (arg === "--max-signal") {
      if (!value) fail("--max-signal requires a value");
      options.maxSignal = Number.parseInt(value, 10);
      index += 1;
    } else if (arg === "--audit-only") {
      options.auditOnly = true;
    } else if (arg === "--allow-stock") {
      options.allowStock = true;
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        [
          "Usage:",
          "  node select-diverse-palettes.js [--type SaaS] [--count 3]",
          "       [--seed project-name] [--exclude-hues green,orange]",
          "       [--max-signal 1] [--audit-only] [--allow-stock]",
          "",
          "Default --max-signal is 0. Use 1 only with a brand/domain reason.",
          "Overused stock accents (Tailwind defaults, high-frequency reuse) are",
          "excluded by default; --allow-stock disables that filter.",
          "JSON is written to stdout. Status messages are written to stderr.",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 9) {
    fail("--count must be an integer from 1 to 9");
  }
  if (!Number.isInteger(options.maxSignal) || options.maxSignal < 0 || options.maxSignal > 2) {
    fail("--max-signal must be an integer from 0 to 2");
  }

  options.seed = options.seed || options.type || "aphrodite";
  return options;
}

function parseCsv(text) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }

  const [headers, ...rows] = records.filter((row) => row.some((value) => value.length > 0));
  if (!headers) return [];

  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])),
  );
}

function hexToRgb(hex) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!match) return null;
  const value = match[1];
  return {
    r: Number.parseInt(value.slice(0, 2), 16) / 255,
    g: Number.parseInt(value.slice(2, 4), 16) / 255,
    b: Number.parseInt(value.slice(4, 6), 16) / 255,
  };
}

function classifyHue(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "other";

  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const delta = max - min;
  if (delta < 0.08) return "neutral";

  let hue;
  if (max === rgb.r) {
    hue = 60 * (((rgb.g - rgb.b) / delta) % 6);
  } else if (max === rgb.g) {
    hue = 60 * ((rgb.b - rgb.r) / delta + 2);
  } else {
    hue = 60 * ((rgb.r - rgb.g) / delta + 4);
  }
  if (hue < 0) hue += 360;

  if (hue < 15 || hue >= 345) return "red";
  if (hue < 50) return "orange";
  if (hue < 75) return "yellow";
  if (hue < 165) return "green";
  if (hue < 195) return "cyan";
  if (hue < 255) return "blue";
  if (hue < 290) return "violet";
  if (hue < 345) return "pink";
  return "other";
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const linear = [rgb.r, rgb.g, rgb.b].map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function classifyMode(background) {
  const luminance = relativeLuminance(background);
  if (luminance >= 0.62) return "light";
  if (luminance <= 0.18) return "dark";
  return "midtone";
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();
}

function relevanceScore(productType, query) {
  const normalizedType = normalize(productType);
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;
  if (normalizedType === normalizedQuery) return 100;
  if (normalizedType.includes(normalizedQuery) || normalizedQuery.includes(normalizedType)) {
    return 80;
  }

  const typeTokens = new Set(normalizedType.split(" ").filter(Boolean));
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  return queryTokens.reduce((score, token) => score + (typeTokens.has(token) ? 15 : 0), 0);
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildStockCheck(rows) {
  const counts = {};
  for (const row of rows) {
    const accent = String(row.Accent || "").toUpperCase();
    if (accent) counts[accent] = (counts[accent] || 0) + 1;
  }
  return (accentHex) => {
    const accent = String(accentHex || "").toUpperCase();
    return (
      KNOWN_STOCK_ACCENTS.has(accent) ||
      (counts[accent] || 0) >= STOCK_FREQUENCY_THRESHOLD
    );
  };
}

function prepareRows(rows, options, stockCheck) {
  return rows
    .map((row) => ({
      ...row,
      id: `csv:${row.No}`,
      source: "color-palettes.csv",
      hueFamily: classifyHue(row.Accent),
      isStock: stockCheck(row.Accent),
      mode: classifyMode(row.Background),
      relevance: relevanceScore(row["Product Type"], options.type),
      tieBreak: stableHash(
        [
          options.seed,
          row.No,
          row["Product Type"],
          row.Primary,
          row.Accent,
          row.Background,
        ].join("|"),
      ),
    }))
    .filter((row) => !options.excludeHues.has(row.hueFamily))
    .filter(
      (row) =>
        ![
          row.Primary,
          row["On Primary"],
          row.Accent,
          row["On Accent"],
          row.Background,
          row.Foreground,
        ].some((value) => String(value).toUpperCase() === "#000000"),
    );
}

function auditRows(rows) {
  const accentHueCounts = {};
  for (const row of rows) {
    const hue = classifyHue(row.Accent);
    accentHueCounts[hue] = (accentHueCounts[hue] || 0) + 1;
  }

  const signalCount = (accentHueCounts.green || 0) + (accentHueCounts.orange || 0);
  return {
    rows: rows.length,
    accentHueCounts: Object.fromEntries(
      Object.entries(accentHueCounts).sort((left, right) => right[1] - left[1]),
    ),
    greenOrangeCount: signalCount,
    greenOrangePercent: Number(((signalCount / rows.length) * 100).toFixed(1)),
  };
}

function loadPlaybookLanes(playbookPath, options, stockCheck) {
  if (!fs.existsSync(playbookPath)) return [];
  const text = fs.readFileSync(playbookPath, "utf8");
  const lanePattern =
    /^\| ([^|]+) \| `(#(?:[0-9A-F]{6}))` \/ `(#(?:[0-9A-F]{6}))` \| `(#(?:[0-9A-F]{6}))` \/ `(#(?:[0-9A-F]{6}))` \|/gim;

  return [...text.matchAll(lanePattern)]
    .map((match) => {
      const [, laneName, background, foreground, accent, onAccent] = match;
      const hueFamily = classifyHue(accent);
      const isStock = stockCheck(accent);
      return {
        id: `lane:${normalize(laneName).replace(/\s+/g, "-")}`,
        source: "motion-first-prompt-playbook.md",
        No: "",
        "Product Type": `Motion-first seed: ${laneName.trim()}`,
        laneName: laneName.trim(),
        Primary: background,
        "On Primary": foreground,
        Secondary: null,
        "On Secondary": null,
        Accent: accent,
        "On Accent": onAccent,
        Background: background,
        Foreground: foreground,
        Card: null,
        "Card Foreground": null,
        Muted: null,
        "Muted Foreground": null,
        Border: null,
        Ring: accent,
        Notes: "Curated semantic core; derive surface/muted/border scales in DESIGN.md.",
        hueFamily,
        mode: classifyMode(background),
        relevance: options.type ? 10 : 0,
        tieBreak: stableHash(`${options.seed}|${laneName}|${accent}`),
      };
    })
    .filter((row) => !options.excludeHues.has(row.hueFamily));
}

function pickDiverse(candidates, options) {
  const selected = [];
  const usedHues = new Set();
  const usedModes = new Set();
  let signalCount = 0;

  while (selected.length < options.count) {
    const available = candidates.filter((candidate) => {
      if (selected.some((item) => item.id === candidate.id)) return false;
      if (usedHues.has(candidate.hueFamily)) return false;
      if (
        SIGNAL_HUES.has(candidate.hueFamily) &&
        signalCount >= options.maxSignal
      ) {
        return false;
      }
      return true;
    });

    if (available.length === 0) break;

    available.sort((left, right) => {
      const leftNewMode = usedModes.has(left.mode) ? 0 : 1;
      const rightNewMode = usedModes.has(right.mode) ? 0 : 1;
      const leftSignal = SIGNAL_HUES.has(left.hueFamily) ? 1 : 0;
      const rightSignal = SIGNAL_HUES.has(right.hueFamily) ? 1 : 0;

      return (
        right.relevance - left.relevance ||
        rightNewMode - leftNewMode ||
        leftSignal - rightSignal ||
        left.tieBreak - right.tieBreak
      );
    });

    const chosen = available[0];
    selected.push(chosen);
    usedHues.add(chosen.hueFamily);
    usedModes.add(chosen.mode);
    if (SIGNAL_HUES.has(chosen.hueFamily)) signalCount += 1;
  }

  return selected;
}

function selectRows(rows, playbookLanes, options, stockCheck) {
  const preparedRows = prepareRows(rows, options, stockCheck);
  const relevantCsvRows = options.type
    ? preparedRows.filter((row) => row.relevance > 0)
    : preparedRows;
  const allCandidates = [...relevantCsvRows, ...playbookLanes];
  const freshCandidates = allCandidates.filter((candidate) => !candidate.isStock);

  // 1차: 과사용 스톡 accent 제외한 풀에서 선택. 부족하면 스톡 포함 재시도 (무언 실패 금지).
  let stockFallbackUsed = false;
  let selected = pickDiverse(
    options.allowStock ? allCandidates : freshCandidates,
    options,
  );
  if (!options.allowStock && selected.length < options.count) {
    stockFallbackUsed = true;
    selected = pickDiverse(allCandidates, options);
  }

  const mapped = selected.map((row) => ({
    source: row.source,
    stockAccent: row.isStock === true,
    no: row.No ? Number(row.No) : null,
    lane: row.laneName || null,
    productType: row["Product Type"],
    hueFamily: row.hueFamily,
    mode: row.mode,
    relevance: row.relevance,
    primary: row.Primary,
    onPrimary: row["On Primary"],
    secondary: row.Secondary || null,
    onSecondary: row["On Secondary"] || null,
    accent: row.Accent,
    onAccent: row["On Accent"],
    background: row.Background,
    foreground: row.Foreground,
    card: row.Card || null,
    cardForeground: row["Card Foreground"] || null,
    muted: row.Muted || null,
    mutedForeground: row["Muted Foreground"] || null,
    border: row.Border || null,
    ring: row.Ring || null,
    notes: row.Notes,
  }));

  return {
    selected: mapped,
    stockFallbackUsed,
    stockDropped: options.allowStock
      ? 0
      : allCandidates.length - freshCandidates.length,
  };
}

const options = parseArgs(process.argv.slice(2));
const csvPath = path.resolve(__dirname, "..", "references", "color-palettes.csv");
const playbookPath = path.resolve(
  __dirname,
  "..",
  "references",
  "motion-first-prompt-playbook.md",
);
if (!fs.existsSync(csvPath)) fail(`palette database not found: ${csvPath}`);

const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
if (rows.length === 0) fail("palette database is empty or invalid");

const stockCheck = buildStockCheck(rows);
const audit = auditRows(rows);
audit.stockAccentRows = rows.filter((row) => stockCheck(row.Accent)).length;
const playbookLanes = loadPlaybookLanes(playbookPath, options, stockCheck);
const result = options.auditOnly
  ? { selected: [], stockFallbackUsed: false, stockDropped: 0 }
  : selectRows(rows, playbookLanes, options, stockCheck);
const selection = result.selected;

if (!options.auditOnly && selection.length < options.count) {
  fail(
    `could only select ${selection.length}/${options.count} palettes; relax --exclude-hues, --max-signal, or pass --allow-stock`,
  );
}

if (result.stockFallbackUsed) {
  console.error(
    "[palette-select] warning: non-stock pool was too thin; fell back to including overused stock accents (rows marked stockAccent: true)",
  );
}
console.error(
  `[palette-select] rows=${audit.rows} stock_accents=${audit.stockAccentRows} green_orange=${audit.greenOrangeCount} (${audit.greenOrangePercent}%) dropped_stock=${result.stockDropped} selected=${selection.length}`,
);
process.stdout.write(
  `${JSON.stringify(
    {
      query: {
        productType: options.type || null,
        count: options.count,
        seed: options.seed,
        excludedHues: [...options.excludeHues],
        maxSignal: options.maxSignal,
      },
      constraints: {
        distinctHueFamilies: true,
        preferDifferentModes: true,
        maxGreenOrangeCombined: options.maxSignal,
        excludeOverusedStock: !options.allowStock,
        stockFallbackUsed: result.stockFallbackUsed,
        csvOrderIsRanking: false,
      },
      audit,
      selection,
    },
    null,
    2,
  )}\n`,
);
