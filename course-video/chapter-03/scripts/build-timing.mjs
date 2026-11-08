import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const text = readFileSync("narration.txt", "utf8").trim();
const paragraphs = text.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
const audioPath = "narration.wav";

const punctuation = /[\s，。！？：；、“”‘’（）,.!?:;"'()`-]/g;
const clauses = text
	.replace(/\n+/g, "")
	.match(/[^，。！？；：]+[，。！？；：]?/g)
	.map((value) => value.trim())
	.filter(Boolean);

const cleanLength = (value) => Math.max(4, value.replace(punctuation, "").length);
const weights = clauses.map(cleanLength);

function getDuration() {
	if (!existsSync(audioPath)) return 150;
	return Number(
		execFileSync(
			"ffprobe",
			[
				"-v",
				"error",
				"-show_entries",
				"format=duration",
				"-of",
				"default=nw=1:nk=1",
				audioPath,
			],
			{ encoding: "utf8" },
		).trim(),
	);
}

function getSpeechIntervals(duration) {
	if (!existsSync(audioPath)) return [];
	const result = spawnSync(
		"ffmpeg",
		[
			"-hide_banner",
			"-nostats",
			"-i",
			audioPath,
			"-af",
			"silencedetect=noise=-35dB:d=0.22",
			"-f",
			"null",
			"-",
		],
		{ encoding: "utf8" },
	);
	const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

	const silences = [];
	let currentStart;
	for (const line of output.split("\n")) {
		const start = line.match(/silence_start: ([\d.]+)/);
		if (start) currentStart = Number(start[1]);
		const end = line.match(/silence_end: ([\d.]+)/);
		if (end && currentStart !== undefined) {
			silences.push({ start: currentStart, end: Number(end[1]) });
			currentStart = undefined;
		}
	}

	const intervals = [];
	let cursor = 0;
	for (const silence of silences) {
		if (silence.start - cursor >= 0.16) {
			intervals.push({ start: cursor, end: silence.start });
		}
		cursor = Math.max(cursor, silence.end);
	}
	if (duration - cursor >= 0.16) {
		intervals.push({ start: cursor, end: duration });
	}
	return intervals.map((item, index) => ({
		...item,
		index,
		weight: Math.max(1, item.end - item.start),
	}));
}

function estimatedCaptions(duration) {
	const totalWeight = weights.reduce((sum, value) => sum + value, 0);
	let cursor = 0;
	return clauses.map((text, index) => {
		const start = cursor;
		cursor += (duration * weights[index]) / totalWeight;
		return { text, start, end: Math.min(duration, cursor) };
	});
}

function silenceAlignedCaptions(duration) {
	const intervals = getSpeechIntervals(duration);
	if (intervals.length < Math.floor(clauses.length * 0.65)) {
		return estimatedCaptions(duration);
	}

	const captions = [];
	const totalTextWeight = weights.reduce((sum, value) => sum + value, 0);
	const totalSpeechWeight = intervals.reduce((sum, value) => sum + value.weight, 0);
	let speechCursor = 0;

	for (let index = 0; index < clauses.length; index += 1) {
		const targetStart = (speechCursor / totalTextWeight) * totalSpeechWeight;
		speechCursor += weights[index];
		const targetEnd = (speechCursor / totalTextWeight) * totalSpeechWeight;
		const startInterval = intervalAtWeight(intervals, targetStart);
		const endInterval = intervalAtWeight(intervals, targetEnd);
		const start = startInterval ? startInterval.start : (targetStart / totalSpeechWeight) * duration;
		const end = endInterval ? endInterval.end : (targetEnd / totalSpeechWeight) * duration;
		captions.push({
			text: clauses[index],
			start: Math.max(0, start - 0.03),
			end: Math.min(duration, Math.max(start + 0.35, end + 0.03)),
		});
	}
	return normalizeCaptionTiming(captions, duration);
}

function intervalAtWeight(intervals, target) {
	let cursor = 0;
	for (const interval of intervals) {
		const next = cursor + interval.weight;
		if (target <= next) return interval;
		cursor = next;
	}
	return intervals.at(-1);
}

function normalizeCaptionTiming(captions, duration) {
	for (let index = 1; index < captions.length; index += 1) {
		const previous = captions[index - 1];
		const current = captions[index];
		if (current.start < previous.end) {
			const midpoint = (previous.start + current.end) / 2;
			previous.end = Math.max(previous.start + 0.25, midpoint - 0.03);
			current.start = Math.min(current.end - 0.25, midpoint + 0.03);
		}
	}
	for (const caption of captions) {
		caption.start = Number(Math.max(0, caption.start).toFixed(3));
		caption.end = Number(Math.min(duration, caption.end).toFixed(3));
	}
	return captions;
}

const manualCaptionTimings = new Map([
	// Add exact overrides here when preview reveals a local mismatch:
	// ["字幕文本。", [12.34, 14.56]],
]);

const duration = getDuration();
const captions = silenceAlignedCaptions(duration);
for (const caption of captions) {
	const timing = manualCaptionTimings.get(caption.text);
	if (timing) [caption.start, caption.end] = timing;
}

const paragraphFirstClause = new Map();
let clauseIndex = 0;
for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
	const count = paragraphs[paragraphIndex]
		.match(/[^，。！？；：]+[，。！？；：]?/g)
		?.filter(Boolean).length ?? 0;
	paragraphFirstClause.set(paragraphIndex, clauseIndex);
	clauseIndex += count;
}

const sceneParagraphs = [0, 2, 7, 16, 24, 27, 34, 37, 49];
const scenes = sceneParagraphs.map((paragraphIndex) => {
	const firstClause = paragraphFirstClause.get(paragraphIndex) ?? 0;
	return captions[firstClause]?.start ?? 0;
});

const data = { duration, scenes, captions };
writeFileSync("timing-data.js", `window.CHAPTER_DATA = ${JSON.stringify(data, null, 2)};\n`);
console.log(JSON.stringify({ duration, scenes, captions: captions.length }, null, 2));
