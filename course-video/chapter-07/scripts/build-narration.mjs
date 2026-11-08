import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const voice = process.argv[2] ?? "bf_emma";
const text = readFileSync("narration.txt", "utf8").trim();
const workDir = ".tts-work";
rmSync(workDir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });

const paragraphs = text.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
const chunks = [];
const maxChunkLength = 28;
for (const paragraph of paragraphs) {
  if (paragraph.length <= maxChunkLength) {
    chunks.push(paragraph);
    continue;
  }
  const parts = paragraph.match(/[^，。！？；：]+[，。！？；：]?/g)?.map((value) => value.trim()).filter(Boolean) ?? [paragraph];
  let current = "";
  for (const part of parts) {
    if (part.length > maxChunkLength) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (let offset = 0; offset < part.length; offset += maxChunkLength) {
        chunks.push(part.slice(offset, offset + maxChunkLength));
      }
      continue;
    }
    if ((current + part).length > maxChunkLength && current) {
      chunks.push(current);
      current = part;
    } else {
      current += part;
    }
  }
if (current) chunks.push(current);
}

const speakable = /[\p{Script=Han}A-Za-z0-9]/u;
const normalizedChunks = [];
for (const chunk of chunks) {
  if (!speakable.test(chunk)) {
    if (normalizedChunks.length > 0) {
      normalizedChunks[normalizedChunks.length - 1] += chunk;
    }
    continue;
  }
  normalizedChunks.push(chunk);
}
chunks.length = 0;
chunks.push(...normalizedChunks);

const concatLines = [];
for (let index = 0; index < chunks.length; index += 1) {
  const textPath = join(workDir, `chunk-${String(index).padStart(3, "0")}.txt`);
  const wavPath = join(workDir, `chunk-${String(index).padStart(3, "0")}.wav`);
  const pausePath = join(workDir, `pause-${String(index).padStart(3, "0")}.wav`);
  writeFileSync(textPath, chunks[index]);
  execFileSync("npx", ["--yes", "hyperframes@0.6.89", "tts", textPath, "--voice", voice, "--output", wavPath], {
    stdio: "inherit",
  });
  concatLines.push(`file '${resolve(wavPath).replaceAll("'", "'\\''")}'`);
  if (index < chunks.length - 1) {
    execFileSync("ffmpeg", [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=24000:cl=mono",
      "-t",
      "0.18",
      "-c:a",
      "pcm_s16le",
      pausePath,
    ], { stdio: "ignore" });
    concatLines.push(`file '${resolve(pausePath).replaceAll("'", "'\\''")}'`);
  }
}

const concatPath = join(workDir, "concat.txt");
writeFileSync(concatPath, `${concatLines.join("\n")}\n`);
execFileSync("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  concatPath,
  "-ar",
  "48000",
  "-ac",
  "1",
  "-c:a",
  "pcm_s16le",
  "narration.wav",
], { stdio: "inherit" });

console.log(JSON.stringify({ voice, chunks: chunks.length, output: "narration.wav" }, null, 2));
