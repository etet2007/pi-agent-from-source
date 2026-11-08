import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const text = readFileSync("narration.txt", "utf8").trim();
const meta = JSON.parse(readFileSync("chapter-meta.json", "utf8"));
const paragraphs = text.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
const duration = getDuration();

const normalizeChars = (value) =>
  Array.from(value.toLowerCase()).filter((char) => /[\p{Script=Han}a-z0-9]/u.test(char));

const splitClauses = (value) =>
  value
    .replace(/\n+/g, "")
    .match(/[^，。！？；：]+[，。！？；：]?/g)
    ?.map((clause) => clause.trim())
    .filter(Boolean) ?? [];

const clauses = [];
paragraphs.forEach((paragraph, paragraphIndex) => {
  for (const text of splitClauses(paragraph)) {
    clauses.push({ text, paragraphIndex });
  }
});

const captions = estimatedCaptions();
const usedWhisper = applyWhisperTimings(captions);
normalizeCaptionTiming(captions);

const scenes = meta.sceneParagraphs.map((paragraphIndex) => {
  const caption = captions.find((item) => item.paragraphIndex === paragraphIndex);
  return caption?.start ?? 0;
});

for (const caption of captions) {
  delete caption.paragraphIndex;
}

const data = { duration, scenes, captions };
writeFileSync("timing-data.js", `window.CHAPTER_DATA = ${JSON.stringify(data, null, 2)};\n`);
updateIndexDuration(duration);
console.log(JSON.stringify({ duration, scenes, captions: captions.length, usedWhisper }, null, 2));

function getDuration() {
  if (!existsSync("narration.wav")) return 180;
  return Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", "narration.wav"],
      { encoding: "utf8" },
    ).trim(),
  );
}

function estimatedCaptions() {
  const weights = clauses.map((clause) => Math.max(4, normalizeChars(clause.text).length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let cursor = 0;
  return clauses.map((clause, index) => {
    const start = cursor;
    cursor += (duration * weights[index]) / totalWeight;
    return {
      text: clause.text,
      start,
      end: Math.min(duration, cursor),
      paragraphIndex: clause.paragraphIndex,
    };
  });
}

function applyWhisperTimings(captions) {
  const transcriptionPath = "transcriptions-word/narration.json";
  if (!existsSync(transcriptionPath)) return false;

  const transcription = JSON.parse(readFileSync(transcriptionPath, "utf8"));
  const whisperWords = transcription.segments.flatMap((segment) => segment.words ?? []);
  if (whisperWords.length === 0) return false;

  const sourceChars = [];
  const clauseRanges = [];
  for (const clause of clauses) {
    const start = sourceChars.length;
    for (const char of normalizeChars(clause.text)) sourceChars.push(char);
    clauseRanges.push([start, sourceChars.length]);
  }

  const targetChars = [];
  for (const word of whisperWords) {
    for (const char of normalizeChars(word.word)) {
      targetChars.push({ char, start: word.start, end: word.end });
    }
  }
  if (sourceChars.length === 0 || targetChars.length === 0) return false;

  const rows = sourceChars.length + 1;
  const cols = targetChars.length + 1;
  const dp = Array.from({ length: rows }, () => new Uint16Array(cols));
  for (let row = sourceChars.length - 1; row >= 0; row -= 1) {
    for (let col = targetChars.length - 1; col >= 0; col -= 1) {
      dp[row][col] =
        sourceChars[row] === targetChars[col].char
          ? dp[row + 1][col + 1] + 1
          : Math.max(dp[row + 1][col], dp[row][col + 1]);
    }
  }

  const sourceToTarget = new Map();
  let row = 0;
  let col = 0;
  while (row < sourceChars.length && col < targetChars.length) {
    if (sourceChars[row] === targetChars[col].char) {
      sourceToTarget.set(row, col);
      row += 1;
      col += 1;
    } else if (dp[row + 1][col] >= dp[row][col + 1]) {
      row += 1;
    } else {
      col += 1;
    }
  }

  let alignedCount = 0;
  for (let index = 0; index < captions.length; index += 1) {
    const [startChar, endChar] = clauseRanges[index];
    const matches = [];
    for (let charIndex = startChar; charIndex < endChar; charIndex += 1) {
      if (sourceToTarget.has(charIndex)) matches.push(sourceToTarget.get(charIndex));
    }
    const minMatches = Math.min(3, Math.max(1, Math.floor((endChar - startChar) * 0.2)));
    if (matches.length < minMatches) continue;

    const first = Math.min(...matches);
    const last = Math.max(...matches);
    captions[index].start = Math.max(0, targetChars[first].start - 0.02);
    captions[index].end = Math.min(duration, targetChars[last].end + 0.04);
    alignedCount += 1;
  }
  return alignedCount > captions.length * 0.7;
}

function normalizeCaptionTiming(captions) {
  for (let index = 1; index < captions.length; index += 1) {
    const previous = captions[index - 1];
    const current = captions[index];
    if (current.start < previous.end) current.start = previous.end;
    current.end = Math.max(current.end, current.start + 0.2);
  }
  for (const caption of captions) {
    caption.start = Number(Math.max(0, caption.start).toFixed(3));
    caption.end = Number(Math.min(duration, caption.end).toFixed(3));
  }
}

function updateIndexDuration(value) {
  const html = readFileSync("index.html", "utf8")
    .replace(/data-duration="[\d.]+"/, `data-duration="${Math.ceil(value + 2)}"`)
    .replace(/<audio([^>]+)data-duration="[\d.]+"([^>]*)>/, `<audio$1data-duration="${value.toFixed(3)}"$2>`);
  writeFileSync("index.html", html);
}
