import { execFileSync } from "node:child_process";

const voice = process.argv[2] ?? "zh-CN-XiaoxiaoNeural";

execFileSync("python3", [
	"-m",
	"edge_tts",
	"--voice",
	voice,
	"--file",
	"narration.txt",
	"--write-media",
	"narration-edge.mp3",
], { stdio: "inherit" });

execFileSync("ffmpeg", [
	"-y",
	"-i",
	"narration-edge.mp3",
	"-ac",
	"1",
	"-ar",
	"48000",
	"-c:a",
	"pcm_s16le",
	"narration.wav",
], { stdio: "inherit" });

console.log(JSON.stringify({ voice, output: "narration.wav" }, null, 2));
