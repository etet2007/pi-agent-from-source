import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 5180,
  open: false,
  fs: {
      // 允许读取上层 pi/ 源码用于构建期提取
      allow: ["..", "../.."],
    },
  },
});
