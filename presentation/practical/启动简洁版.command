#!/bin/zsh -l
cd -- "${0:A:h}"
if ! command -v pnpm >/dev/null 2>&1; then
  print '需要先安装 pnpm。也可以在终端进入本目录运行 pnpm dev。'
  read '?按回车关闭'
  exit 1
fi
if [[ ! -d node_modules ]]; then
  pnpm install --frozen-lockfile || exit 1
fi
exec pnpm dev --open
