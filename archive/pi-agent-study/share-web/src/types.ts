export interface SnippetLine {
  line: number | null;
  text: string;
}

export interface SnippetData {
  file: string;
  ranges: string;
  lines: SnippetLine[];
}

export interface Snippets {
  [key: string]: SnippetData;
}

export type { NavNode } from "./data/nodes";
