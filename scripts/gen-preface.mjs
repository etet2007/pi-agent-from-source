// 从根目录 README.md 生成站点序言页 book/index.md。
//
// README.md 是序言内容的唯一来源（同时用于 GitHub 仓库首页展示）。
// 站点序言页位于 book/ 内部，其章节链接前缀应为 ./（指向同目录的 chXX.md），
// 而 README.md 中的链接前缀为 ./book/（相对仓库根）。此处读取 README 并重写该前缀。
//
// 该脚本在 docs:dev / docs:build 之前自动运行，确保序言页始终与 README 同步。
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readme = readFileSync(join(root, "README.md"), "utf8");
const preface = readme.replace(/\]\(\.\/book\/ch/g, "](./ch");
writeFileSync(join(root, "book", "index.md"), preface);
console.log("Generated book/index.md from README.md");
