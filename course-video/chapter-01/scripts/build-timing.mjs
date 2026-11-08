import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const text = readFileSync("narration.txt", "utf8").trim();
const paragraphs = text.split(/\n\s*\n/).map((value) => value.trim());
const duration = Number(
	execFileSync(
		"ffprobe",
		[
			"-v",
			"error",
			"-show_entries",
			"format=duration",
			"-of",
			"default=nw=1:nk=1",
			"narration.wav",
		],
		{ encoding: "utf8" },
	).trim(),
);

const normalizeChars = (value) =>
	Array.from(value.toLowerCase()).filter((char) => /[\p{Script=Han}a-z0-9]/u.test(char));

const splitClauses = (value) =>
	value
		.replace(/\n+/g, "")
		.match(/[^，。！？；：]+[，。！？；：]?/g)
		?.map((clause) => clause.trim())
		.filter(Boolean) ?? [];

const weights = paragraphs.map((paragraph) => normalizeChars(paragraph).length);
const totalWeight = weights.reduce((sum, value) => sum + value, 0);
const paragraphStarts = [];
let cursor = 0;
for (const weight of weights) {
	paragraphStarts.push(cursor);
	cursor += (duration * weight) / totalWeight;
}

const sceneParagraphs = [0, 2, 6, 7, 9, 13, 14];
const scenes = sceneParagraphs.map((index) => paragraphStarts[index]);

const clauses = [];
paragraphs.forEach((paragraph, paragraphIndex) => {
	for (const text of splitClauses(paragraph)) {
		clauses.push({ text, paragraphIndex });
	}
});

for (let index = 0; index < clauses.length - 1; index += 1) {
	if (clauses[index].text === "每轮根据工具结果，" && clauses[index + 1].text === "决定下一步动作。") {
		clauses.splice(index, 2, {
			text: "每轮根据工具结果，决定下一步动作。",
			paragraphIndex: clauses[index].paragraphIndex,
		});
		break;
	}
}

const clauseWeights = clauses.map((clause) => Math.max(4, normalizeChars(clause.text).length));
const clauseTotal = clauseWeights.reduce((sum, value) => sum + value, 0);
const captions = [];
cursor = 0;
for (let index = 0; index < clauses.length; index += 1) {
	const start = cursor;
	const clauseDuration = (duration * clauseWeights[index]) / clauseTotal;
	cursor += clauseDuration;
	captions.push({
		text: clauses[index].text,
		start,
		end: Math.min(duration, cursor),
		paragraphIndex: clauses[index].paragraphIndex,
	});
}

const transcriptionPath = "transcriptions-word/narration.json";

const applyWhisperTimings = () => {
	if (!existsSync(transcriptionPath)) return false;

	const transcription = JSON.parse(readFileSync(transcriptionPath, "utf8"));
	const whisperWords = transcription.segments.flatMap((segment) => segment.words ?? []);
	if (whisperWords.length === 0) return false;

	const sourceChars = [];
	const clauseRanges = [];
	for (let index = 0; index < clauses.length; index += 1) {
		const start = sourceChars.length;
		for (const char of normalizeChars(clauses[index].text)) {
			sourceChars.push(char);
		}
		clauseRanges.push([start, sourceChars.length]);
	}

	const targetChars = [];
	for (const word of whisperWords) {
		const chars = normalizeChars(word.word);
		for (const char of chars) {
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
			if (sourceToTarget.has(charIndex)) {
				matches.push(sourceToTarget.get(charIndex));
			}
		}
		const minMatches = Math.min(3, Math.max(1, Math.floor((endChar - startChar) * 0.2)));
		if (matches.length < minMatches) continue;

		const first = Math.min(...matches);
		const last = Math.max(...matches);
		captions[index].start = Math.max(0, targetChars[first].start - 0.02);
		captions[index].end = Math.min(duration, targetChars[last].end + 0.04);
		captions[index].source = "whisper";
		alignedCount += 1;
	}

	for (let index = 0; index < captions.length; index += 1) {
		const previous = captions[index - 1];
		const caption = captions[index];
		if (previous && caption.start < previous.end) {
			caption.start = previous.end;
		}
		caption.end = Math.max(caption.end, caption.start + 0.2);
	}

	for (let index = 0; index < sceneParagraphs.length; index += 1) {
		const paragraphIndex = sceneParagraphs[index];
		const caption = captions.find((item) => item.paragraphIndex === paragraphIndex);
		if (caption?.source === "whisper" || paragraphIndex === 0) {
			scenes[index] = caption?.start ?? 0;
		}
	}

	return alignedCount > captions.length * 0.7;
};

const usedWhisper = applyWhisperTimings();

for (const caption of captions) {
	delete caption.paragraphIndex;
	delete caption.source;
}

const data = { duration, scenes, captions };
writeFileSync(
	"timing-data.js",
	`window.CHAPTER_DATA = ${JSON.stringify(data, null, 2)};\n`,
);
console.log(JSON.stringify({ duration, scenes, captions: captions.length, usedWhisper }, null, 2));
