/* ============================================================
   《Pi Agent 源码解析》共享脚本
   无第三方依赖。职责：
   1. 书籍数据（BOOK）与页面导航（页头/抽屉目录/章内目录/前后章）
   2. 代码块包装与轻量语法高亮（ts/python/bash/json/toml/yaml）
   3. PB 画布绘图库（流程图/时序图/分层图，支持 DPR、主题、重绘）
   ============================================================ */
(function () {
  "use strict";

  /* ============================ 书籍数据 ============================ */

  var BOOK = {
    title: "Pi Agent 源码解析",
    short: "Pi Agent",
    chapters: [
      { file: "index.html", no: "", title: "序言", part: "" },
      { file: "ch01-architecture.html", no: "01", title: "架构总览：最小化 Agent 的设计哲学", part: "第一部分 · 基础" },
      { file: "ch02-ai-layer.html", no: "02", title: "与模型对话：pi-ai 统一 LLM 层", part: "第一部分 · 基础" },
      { file: "ch03-agent-loop.html", no: "03", title: "Agent Loop：两层嵌套循环", part: "第二部分 · Agent 核心" },
      { file: "ch04-tools.html", no: "04", title: "工具系统：从定义到执行", part: "第二部分 · Agent 核心" },
      { file: "ch05-state-and-session-tree.html", no: "05", title: "状态、消息与会话树", part: "第二部分 · Agent 核心" },
      { file: "ch06-harness.html", no: "06", title: "AgentHarness：可持久化的编排器", part: "第三部分 · 持久化编排" },
      { file: "ch07-compaction.html", no: "07", title: "上下文压缩与分支摘要", part: "第三部分 · 持久化编排" },
      { file: "ch08-bootstrap.html", no: "08", title: "启动流水线：从 cli.ts 到模式分发", part: "第四部分 · 编码 Agent 产品" },
      { file: "ch09-agent-session.html", no: "09", title: "AgentSession：中央编排器", part: "第四部分 · 编码 Agent 产品" },
      { file: "ch10-system-prompt.html", no: "10", title: "系统提示词与资源装配", part: "第四部分 · 编码 Agent 产品" },
      { file: "ch11-modes.html", no: "11", title: "三种运行模式", part: "第四部分 · 编码 Agent 产品" },
      { file: "ch12-tui-rendering.html", no: "12", title: "pi-tui：自研渲染器", part: "第五部分 · 终端界面" },
      { file: "ch13-input-and-editor.html", no: "13", title: "输入、按键与编辑器", part: "第五部分 · 终端界面" },
      { file: "ch14-extensions.html", no: "14", title: "扩展系统：最小化核心的延伸", part: "第六部分 · 扩展与连接" },
      { file: "ch15-remote.html", no: "15", title: "远程控制：守护进程、RPC 与协议", part: "第六部分 · 扩展与连接" },
      { file: "ch16-evals.html", no: "16", title: "行为评估：pi-evals", part: "第七部分 · 质量与结语" },
      { file: "ch17-epilogue.html", no: "17", title: "结语：最小化的赌注", part: "第七部分 · 质量与结语" }
    ]
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function currentFile() {
    var p = location.pathname.split("/").pop();
    return p && p.length ? p : "index.html";
  }
  function findChapter(file) {
    for (var i = 0; i < BOOK.chapters.length; i++) {
      if (BOOK.chapters[i].file === file) return i;
    }
    return -1;
  }

  /* ============================ 页头 ============================ */

  function buildHeader() {
    var here = findChapter(currentFile());
    var ch = here >= 0 ? BOOK.chapters[here] : null;

    var bar = el("div");
    bar.id = "pb-header";

    var site = el("a", "pb-site");
    site.href = "index.html";
    var name = el("span", "pb-name", BOOK.title);
    site.appendChild(name);
    if (ch && ch.no) {
      var crumb = el("span", "pb-crumb", "第 " + ch.no + " 章 · " + ch.title);
      site.appendChild(crumb);
    }
    bar.appendChild(site);

    var btns = el("div", "pb-headbtns");
    var gh = el("a", "pb-gh");
    gh.href = "https://github.com/kuwii/pi-agent-from-source";
    gh.target = "_blank";
    gh.rel = "noopener";
    gh.setAttribute("aria-label", "GitHub");
    gh.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>';
    btns.appendChild(gh);
    btns.appendChild(el("span", "pb-sep", "|"));
    var tocBtn = el("button", "pb-btn", "目录");
    tocBtn.id = "pb-toc-btn";
    tocBtn.setAttribute("aria-label", "打开目录");
    btns.appendChild(tocBtn);
    bar.appendChild(btns);

    document.body.insertBefore(bar, document.body.firstChild);

    var prog = el("div");
    prog.id = "pb-progress";
    document.body.insertBefore(prog, document.body.firstChild);
  }

  /* 宽屏下目录为常驻侧栏，需精确落在 header 下方 */
  function measureHeader() {
    var h = $("#pb-header");
    if (h) document.documentElement.style.setProperty("--header-h", h.offsetHeight + "px");
  }

  function buildDrawer() {
    var drawer = el("div");
    drawer.id = "pb-drawer";
    var panel = el("div", "pb-drawer-panel");
    var head = el("div", "pb-drawer-head");
    var closeBtn = el("button", "pb-btn", "关闭 ✕");
    closeBtn.id = "pb-drawer-close";
    head.appendChild(closeBtn);
    panel.appendChild(head);

    var here = findChapter(currentFile());
    var lastPart = null;
    var list = null;
    BOOK.chapters.forEach(function (c, i) {
      if (c.part !== lastPart) {
        if (c.part) panel.appendChild(el("h3", null, c.part));
        else panel.appendChild(el("h3", null, " "));
        list = el("ol");
        panel.appendChild(list);
        lastPart = c.part;
      }
      var li = el("li");
      var a = el("a");
      a.href = c.file;
      if (i === here) a.className = "here";
      var no = el("span", "pb-no", c.no ? c.no : "◈");
      a.appendChild(no);
      a.appendChild(document.createTextNode(c.title));
      li.appendChild(a);
      list.appendChild(li);
    });

    drawer.appendChild(panel);
    document.body.appendChild(drawer);

    function open() { drawer.classList.add("open"); }
    function close() { drawer.classList.remove("open"); }
    $("#pb-toc-btn").addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    drawer.addEventListener("click", function (e) { if (e.target === drawer) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ============================ 章内目录 ============================ */

  function buildInlineToc() {
    var art = $("article.chapter");
    if (!art) return;
    var heads = $all("h2, h3", art);
    if (!heads.length) return;

    heads.forEach(function (h, i) {
      if (!h.id) h.id = "pb-sec-" + i;
    });

    var toc = el("nav");
    toc.id = "pb-toc";
    toc.appendChild(el("div", "pb-toc-title", "本章目录"));
    heads.forEach(function (h) {
      var a = el("a", h.tagName === "H3" ? "lv3" : "lv2", h.textContent);
      a.href = "#" + h.id;
      toc.appendChild(a);
    });
    var main = $("#pb-main");
    if (main) main.appendChild(toc);

    var links = $all("a", toc);
    function onScroll() {
      var pos = window.scrollY + 130;
      var current = -1;
      heads.forEach(function (h, i) {
        if (h.getBoundingClientRect().top + window.scrollY <= pos) current = i;
      });
      links.forEach(function (a, i) {
        a.classList.toggle("here", i === current);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function markH2() {
    $all("article.chapter h2").forEach(function (h) {
      var m = el("span", "pb-h2mark", "§");
      h.insertBefore(m, h.firstChild);
    });
  }

  /* ============================ 前后章导航 ============================ */

  function buildChapterNav() {
    var here = findChapter(currentFile());
    if (here <= 0) return;
    var nav = el("nav");
    nav.id = "pb-chapter-nav";
    var prev = BOOK.chapters[here - 1];
    var next = BOOK.chapters[here + 1];

    var pa = el("a", "prev");
    pa.href = prev.file;
    pa.appendChild(el("div", "pb-nav-kicker", "← 上一章" + (prev.part ? " · " + prev.part : "")));
    pa.appendChild(el("div", "pb-nav-title", (prev.no ? prev.no + " · " : "") + prev.title));
    nav.appendChild(pa);

    if (next) {
      var na = el("a", "next");
      na.href = next.file;
      na.appendChild(el("div", "pb-nav-kicker", "下一章 · " + next.part + " →"));
      na.appendChild(el("div", "pb-nav-title", next.no + " · " + next.title));
      nav.appendChild(na);
    } else {
      nav.appendChild(el("a", "next ghost"));
    }

    var foot = el("div");
    foot.id = "pb-footer";
    foot.innerHTML = "《" + BOOK.title + "》 · 书中所有文件路径均相对于 <code>pi-agent-src/</code>。" +
      " 本书为独立的教育性源码分析，与 Pi Agent 的维护者无关。";

    var holder = $("#pb-nav-holder");
    if (holder) {
      holder.parentNode.insertBefore(nav, holder);
      holder.parentNode.insertBefore(foot, holder);
      holder.remove();
    } else {
      var art = $("article.chapter");
      if (art && art.parentNode) {
        art.parentNode.insertBefore(nav, art.nextSibling);
        art.parentNode.insertBefore(foot, nav.nextSibling);
      }
    }

    document.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowLeft") location.href = prev.file;
      if (e.key === "ArrowRight" && next) location.href = next.file;
    });
  }

  /* ============================ 进度条 / 返回顶部 ============================ */

  function buildProgress() {
    var prog = $("#pb-progress");
    var top = el("button");
    top.id = "pb-top";
    top.textContent = "↑";
    top.setAttribute("aria-label", "返回顶部");
    document.body.appendChild(top);
    top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var r = max > 0 ? window.scrollY / max : 0;
      if (prog) prog.style.width = (r * 100).toFixed(2) + "%";
      top.classList.toggle("show", window.scrollY > 600);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  /* ============================ 语法高亮 ============================ */

  function escHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function R(re, cls) { return { re: re, cls: cls }; }

  var TS_KEYWORDS = "abstract as asserts async await break case catch class const continue debugger declare default delete do else enum export extends finally for from function get if implements import in infer instanceof interface is keyof let namespace new of out override private protected public readonly return satisfies set static super switch this throw try type typeof var void while with yield never unknown any string number boolean object symbol bigint undefined null true false require module";
  var PY_KEYWORDS = "and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case True False None self cls";

  function wordSet(words) {
    return new RegExp("(?:" + words.trim().split(/\s+/).join("|") + ")(?![\\w$])", "y");
  }

  var HL_RULES = {
    ts: [
      R(/^\s+/y, null),
      R(/^\/\*[\s\S]*?\*\//y, "c-com"),
      R(/^\/\/[^\n]*/, "c-com"),
      R(/^`(?:[^`\\]|\\.)*`/, "c-str"),
      R(/^"(?:[^"\\\n]|\\.)*"/, "c-str"),
      R(/^'(?:[^'\\\n]|\\.)*'/, "c-str"),
      R(/^0[xXbBoO][\da-fA-F_]+n?\b/, "c-num"),
      R(/^\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?n?\b/, "c-num"),
      R(wordSet(TS_KEYWORDS), "c-key"),
      R(/^@[A-Za-z_$][\w$]*/, "c-attr"),
      R(/^[A-Z][\w$]*/, "c-type"),
      R(/^[a-z_$][\w$]*(?=\s*\()/, "c-fn"),
      R(/^[A-Za-z_$][\w$]*/, null),
      R(/^[{}()[\].,;:+\-*/%<>=!&|?~^]+/, "c-pun"),
      R(/^./, null)
    ],
    python: [
      R(/^\s+/y, null),
      R(/^#[^\n]*/, "c-com"),
      R(/^(?:[rRbBfFuU]{1,2})(?:"""[\s\S]*?"""|'''[\s\S]*?''')/, "c-str"),
      R(/^(?:[rRbBfFuU]{1,2})"(?:[^"\\\n]|\\.)*"/, "c-str"),
      R(/^(?:[rRbBfFuU]{1,2})'(?:[^'\\\n]|\\.)*'/, "c-str"),
      R(/^0[xXbBoO][\da-fA-F_]+\b/, "c-num"),
      R(/^\d[\d_]*(?:\.[\d_]+)?(?:[eE][+-]?\d+)?j?\b/, "c-num"),
      R(wordSet(PY_KEYWORDS), "c-key"),
      R(/^@[\w.]+/, "c-attr"),
      R(/^[A-Z][\w]*/, "c-type"),
      R(/^[a-z_][\w]*(?=\s*\()/, "c-fn"),
      R(/^[A-Za-z_][\w]*/, null),
      R(/^[{}()[\].,;:+\-*/%<>=!&|?~^@]+/, "c-pun"),
      R(/^./, null)
    ],
    bash: [
      R(/^\s+/y, null),
      R(/^#[^\n]*/, "c-com"),
      R(/^"(?:[^"\\]|\\.)*"/, "c-str"),
      R(/^'[^']*'/, "c-str"),
      R(/^\$\{[^}]*\}/, "c-attr"),
      R(/^\$[\w@#?*!$-]/, "c-attr"),
      R(wordSet("if then else elif fi for while until do done case esac function in export local readonly declare return exit set shift trap eval exec source alias echo cd printf read sudo curl tar mkdir rm cp mv ls cat grep sed awk git node npm npx python python3 uv pip pip3 sh bash kill sleep touch chmod find"), "c-key"),
      R(/^--?[\w-]+/, "c-attr"),
      R(/^-?[\d.]+\b/, "c-num"),
      R(/^[A-Za-z_][\w.-]*/, null),
      R(/^[{}()[\].,;:+\-*/%<>=!&|?~^]+/, "c-pun"),
      R(/^./, null)
    ],
    json: [
      R(/^\s+/y, null),
      R(/^"(?:[^"\\]|\\.)*"(?=\s*:)/, "c-attr"),
      R(/^"(?:[^"\\]|\\.)*"/, "c-str"),
      R(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "c-num"),
      R(wordSet("true false null"), "c-key"),
      R(/^[{}[\],:]/, "c-pun"),
      R(/^./, null)
    ],
    toml: [
      R(/^\s+/y, null),
      R(/^#[^\n]*/, "c-com"),
      R(/^\[[^\]\n]*\]/, "c-fn"),
      R(/^"(?:[^"\\]|\\.)*"/, "c-str"),
      R(/^'[^']*'/, "c-str"),
      R(/^[A-Za-z0-9_.-]+(?=\s*=)/, "c-attr"),
      R(/^-?\d+(?:\.\d+)?/, "c-num"),
      R(wordSet("true false"), "c-key"),
      R(/^[=,.\[\]]/, "c-pun"),
      R(/^./, null)
    ],
    yaml: [
      R(/^\s+/y, null),
      R(/^#[^\n]*/, "c-com"),
      R(/^[\w.-]+(?=\s*:)/, "c-attr"),
      R(/^"(?:[^"\\]|\\.)*"/, "c-str"),
      R(/^'[^']*'/, "c-str"),
      R(/^-?\d+(?:\.\d+)?/, "c-num"),
      R(wordSet("true false null yes no"), "c-key"),
      R(/^[:\-,>|]/, "c-pun"),
      R(/^./, null)
    ],
    text: []
  };
  HL_RULES.javascript = HL_RULES.ts;
  HL_RULES.js = HL_RULES.ts;
  HL_RULES.tsx = HL_RULES.ts;
  HL_RULES.typescript = HL_RULES.ts;
  HL_RULES.py = HL_RULES.python;
  HL_RULES.sh = HL_RULES.bash;
  HL_RULES.shell = HL_RULES.bash;
  HL_RULES.jsonc = HL_RULES.json;
  HL_RULES.ini = HL_RULES.toml;

  function highlightCode(src, lang) {
    var rules = HL_RULES[(lang || "").toLowerCase()] || HL_RULES.text;
    if (!rules.length) return escHtml(src);
    var out = "";
    var i = 0;
    while (i < src.length) {
      var matched = false;
      for (var k = 0; k < rules.length; k++) {
        var rule = rules[k];
        rule.re.lastIndex = i;
        var m = rule.re.exec(src);
        if (m && m.index === i && m[0].length > 0) {
          out += rule.cls
            ? '<span class="' + rule.cls + '">' + escHtml(m[0]) + "</span>"
            : escHtml(m[0]);
          i += m[0].length;
          matched = true;
          break;
        }
      }
      if (!matched) { out += escHtml(src[i]); i += 1; }
    }
    return out;
  }

  function enhanceCodeBlocks() {
    $all("pre.code").forEach(function (pre) {
      var lang = pre.getAttribute("data-lang") || "text";
      var file = pre.getAttribute("data-file");
      var codeEl = $("code", pre);
      var src = (codeEl ? codeEl.textContent : pre.textContent).replace(/^\n/, "").replace(/\s+$/, "") + "\n";

      var fig = document.createElement("figure");
      fig.className = "codeblock";
      if (file || lang !== "text") {
        var head = el("div", "cb-head");
        head.appendChild(el("span", "cb-file", file || ""));
        head.appendChild(el("span", "cb-lang", lang));
        fig.appendChild(head);
      }
      var newPre = document.createElement("pre");
      var newCode = document.createElement("code");
      newCode.innerHTML = highlightCode(src, lang);
      newPre.appendChild(newCode);
      fig.appendChild(newPre);
      pre.parentNode.replaceChild(fig, pre);
    });
  }

  /* ============================ 画布绘图库 ============================ */

  var FONT = '-apple-system, "Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif';
  var MONO = '"Cascadia Code", Consolas, "SF Mono", Menlo, monospace';

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function makeTheme() {
    var tones = {};
    ["accent", "teal", "gold", "violet", "slate"].forEach(function (t) {
      tones[t] = { stroke: cssVar("--tone-" + t), fill: cssVar("--tone-" + t + "-fill") };
    });
    return {
      tones: tones,
      fg: cssVar("--fg"),
      muted: cssVar("--fg-muted"),
      faint: cssVar("--fg-faint"),
      border: cssVar("--border"),
      borderStrong: cssVar("--border-strong"),
      bg: cssVar("--bg"),
      panel: cssVar("--bg-panel"),
      accent: cssVar("--accent")
    };
  }

  function roundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, maxW) {
    var lines = [];
    var para = String(text).split("\n");
    for (var p = 0; p < para.length; p++) {
      var words = Array.from(para[p]);
      var cur = "";
      for (var i = 0; i < words.length; i++) {
        var test = cur + words[i];
        if (ctx.measureText(test).width > maxW && cur.length > 0) {
          lines.push(cur);
          cur = words[i];
        } else {
          cur = test;
        }
      }
      lines.push(cur);
    }
    return lines;
  }

  function makeDrawAPI(ctx, W, H, theme) {
    var shapes = new Map();

    function font(size, weight, mono) {
      ctx.font = (weight || 400) + " " + size + "px " + (mono ? MONO : FONT);
    }

    function tone(t) {
      return theme.tones[t] || theme.tones.slate;
    }

    function anchorOf(sh, side) {
      switch (side) {
        case "left": return { x: sh.x, y: sh.y + sh.h / 2 };
        case "right": return { x: sh.x + sh.w, y: sh.y + sh.h / 2 };
        case "top": return { x: sh.x + sh.w / 2, y: sh.y };
        case "bottom": return { x: sh.x + sh.w / 2, y: sh.y + sh.h };
        default: return { x: sh.x + sh.w / 2, y: sh.y + sh.h / 2 };
      }
    }

    function autoSides(a, b) {
      var ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
      var cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      var dx = cb.x - ca.x, dy = cb.y - ca.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? ["right", "left"] : ["left", "right"];
      }
      return dy > 0 ? ["bottom", "top"] : ["top", "bottom"];
    }

    var api = {
      ctx: ctx, W: W, H: H, theme: theme,

      /* 文本 */
      text: function (str, x, y, o) {
        o = o || {};
        font(o.size || 13, o.weight || 400, o.mono);
        ctx.textAlign = o.align || "center";
        ctx.textBaseline = o.baseline || "middle";
        ctx.fillStyle = o.color || theme.fg;
        if (o.halo) {
          ctx.save();
          ctx.lineWidth = 4;
          ctx.lineJoin = "round";
          ctx.strokeStyle = theme.bg;
          ctx.strokeText(str, x, y);
          ctx.restore();
        }
        ctx.fillText(str, x, y);
      },

      /* 盒子：可带 title + 若干行说明 */
      box: function (o) {
        var tn = tone(o.tone);
        ctx.save();
        roundedRect(ctx, o.x, o.y, o.w, o.h, o.r !== undefined ? o.r : 10);
        ctx.fillStyle = o.fill === false ? theme.bg : (o.fill || tn.fill);
        ctx.fill();
        ctx.lineWidth = o.lw || 1.4;
        ctx.strokeStyle = o.stroke || tn.stroke;
        if (o.dashed) ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.restore();

        var padX = 12;
        var ts = o.titleSize || 13.5;
        var ls = o.size || 12;
        var lh = o.lh || 17;
        var tx = o.align === "left" ? o.x + padX : o.x + o.w / 2;
        var cursorY = null;

        if (o.title) {
          font(ts, 700);
          var tlines = wrapText(ctx, o.title, o.w - padX * 2);
          var startY = o.y + (o.titleTop !== undefined ? o.titleTop : 16);
          ctx.fillStyle = o.titleColor || tn.stroke;
          ctx.textAlign = o.align || "center";
          ctx.textBaseline = "middle";
          tlines.forEach(function (ln, i) {
            ctx.fillText(ln, tx, startY + i * ts * 1.35);
          });
          cursorY = startY + (tlines.length - 1) * ts * 1.35 + ts * 0.9;
        }

        if (o.lines && o.lines.length) {
          font(ls, 400);
          var flat = [];
          o.lines.forEach(function (ln) {
            wrapText(ctx, ln, o.w - padX * 2).forEach(function (ln2) { flat.push(ln2); });
          });
          var firstY;
          if (cursorY !== null) {
            firstY = cursorY + (o.linesTop !== undefined ? o.linesTop : 4) + lh / 2;
          } else {
            firstY = o.y + o.h / 2 - ((flat.length - 1) * lh) / 2 + (o.linesTop || 0);
          }
          ctx.fillStyle = o.lineColor || theme.muted;
          ctx.textAlign = o.align || "center";
          ctx.textBaseline = "middle";
          flat.forEach(function (ln, i) {
            ctx.fillText(ln, tx, firstY + i * lh);
          });
        }
        if (o.id) shapes.set(o.id, { x: o.x, y: o.y, w: o.w, h: o.h });
        return o;
      },

      /* 胶囊标签 */
      pill: function (o) {
        var tn = tone(o.tone);
        ctx.save();
        roundedRect(ctx, o.x, o.y, o.w, o.h, o.h / 2);
        ctx.fillStyle = o.fill || tn.fill;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = o.stroke || tn.stroke;
        ctx.stroke();
        ctx.restore();
        font(o.size || 12, 600);
        ctx.fillStyle = o.color || tn.stroke;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(o.label, o.x + o.w / 2, o.y + o.h / 2 + 0.5);
        if (o.id) shapes.set(o.id, { x: o.x, y: o.y, w: o.w, h: o.h });
        return o;
      },

      /* 分组容器 */
      group: function (o) {
        var tn = tone(o.tone || "slate");
        ctx.save();
        roundedRect(ctx, o.x, o.y, o.w, o.h, o.r !== undefined ? o.r : 12);
        ctx.fillStyle = o.fill || "transparent";
        if (o.fill) ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = o.stroke || theme.borderStrong;
        ctx.setLineDash(o.dashed === false ? [] : [6, 5]);
        ctx.stroke();
        ctx.restore();
        if (o.label) {
          font(11.5, 700);
          var w = ctx.measureText(o.label).width;
          var lx = o.labelPos === "center" ? o.x + o.w / 2 - w / 2 - 8 : o.x + 14;
          ctx.fillStyle = theme.bg;
          ctx.fillRect(lx, o.y - 8, w + 16, 16);
          ctx.fillStyle = o.labelColor || tn.stroke;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(o.label, lx + 8, o.y);
        }
        if (o.id) shapes.set(o.id, { x: o.x, y: o.y, w: o.w, h: o.h });
        return o;
      },

      /* 箭头：a/b 为形状 id、{x,y} 或 [x,y] */
      arrow: function (a, b, o) {
        o = o || {};
        var A = typeof a === "string" ? shapes.get(a) : (Array.isArray(a) ? { x: a[0], y: a[1], w: 0, h: 0 } : a);
        var B = typeof b === "string" ? shapes.get(b) : (Array.isArray(b) ? { x: b[0], y: b[1], w: 0, h: 0 } : b);
        if (!A || !B) return;

        var color = o.color || theme.fg;
        var lw = o.lw || 1.5;
        var headLen = o.head || 8;

        // 自环
        if (typeof a === "string" && a === b) {
          var side = o.side || "right";
          var p0 = anchorOf(A, side);
          var dir = side === "right" ? 1 : -1;
          var loopW = o.loopW || 46, loopH = o.loopH || 34;
          ctx.save();
          ctx.strokeStyle = color; ctx.lineWidth = lw;
          if (o.dashed) ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.bezierCurveTo(
            p0.x + dir * loopW, p0.y - loopH * 0.4,
            p0.x + dir * loopW, p0.y + loopH * 0.9,
            p0.x + dir * 4, p0.y + loopH * 0.62
          );
          ctx.stroke();
          ctx.restore();
          var endA = { x: p0.x + dir * 4, y: p0.y + loopH * 0.62 };
          drawHead(ctx, endA.x, endA.y, Math.atan2(endA.y - (p0.y + loopH * 0.2), dir * -6), headLen, color, o.openHead);
          if (o.label) {
            font(11.5, o.labelWeight || 600);
            labelAt(ctx, p0.x + dir * (loopW + 6), p0.y + loopH * 0.2, o.label, color, o.labelAlign || (dir > 0 ? "left" : "right"), theme);
          }
          return;
        }

        var sides = null;
        if (o.from && o.to) sides = [o.from, o.to];
        else if (A.w > 0 && B.w > 0) sides = autoSides(A, B);
        else sides = ["center", "center"];

        var p1 = sides[0] === "center" ? { x: A.x + A.w / 2, y: A.y + A.h / 2 } : anchorOf(A, sides[0]);
        var p2 = sides[1] === "center" ? { x: B.x + B.w / 2, y: B.y + B.h / 2 } : anchorOf(B, sides[1]);

        var bend = o.bend || 0;
        var mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
        var dx = p2.x - p1.x, dy = p2.y - p1.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = -dy / len, ny = dx / len;
        var cx = mx + nx * bend, cy2 = my + ny * bend;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        if (o.dashed) ctx.setLineDash(o.dash || [5, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        if (bend) ctx.quadraticCurveTo(cx, cy2, p2.x, p2.y);
        else ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();

        var ang = bend
          ? Math.atan2(p2.y - cy2, p2.x - cx)
          : Math.atan2(p2.y - p1.y, p2.x - p1.x);
        drawHead(ctx, p2.x, p2.y, ang, headLen, color, o.openHead);

        if (o.label) {
          var t = o.at !== undefined ? o.at : 0.5;
          var lx2, ly2;
          if (bend) {
            lx2 = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * cx + t * t * p2.x;
            ly2 = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * cy2 + t * t * p2.y;
          } else {
            lx2 = p1.x + dx * t;
            ly2 = p1.y + dy * t;
          }
          var lox = nx * (o.labelOff !== undefined ? o.labelOff : 0);
          var loy = ny * (o.labelOff !== undefined ? o.labelOff : 0);
          font(o.labelSize || 11.5, o.labelWeight || 600);
          labelAt(ctx, lx2 + lox, ly2 + loy - (o.labelOff === undefined && !bend ? 0 : 0), o.label, color, o.labelAlign || "center", theme, o.labelDy === undefined ? -11 : o.labelDy);
        }
      },

      /* 折线路径（可带箭头） */
      path: function (pts, o) {
        o = o || {};
        ctx.save();
        ctx.strokeStyle = o.color || theme.fg;
        ctx.lineWidth = o.lw || 1.5;
        if (o.dashed) ctx.setLineDash(o.dash || [5, 4]);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
        ctx.restore();
        if (o.arrow !== false) {
          var n = pts.length;
          var ang = Math.atan2(pts[n - 1][1] - pts[n - 2][1], pts[n - 1][0] - pts[n - 2][0]);
          drawHead(ctx, pts[n - 1][0], pts[n - 1][1], ang, o.head || 8, o.color || theme.fg, o.openHead);
        }
      },

      /* 时序图 */
      sequence: function (o) {
        var parts = o.participants;
        var steps = o.steps || [];
        var x0 = o.x, y0 = o.y;
        var totalW = o.w;
        var colW = totalW / parts.length;
        var rowH = o.rowH || 38;
        var pillH = 30;
        var cols = {};
        parts.forEach(function (p, i) {
          cols[p.id] = x0 + colW * (i + 0.5);
          var tn = tone(p.tone || "slate");
          font(12.5, 700);
          var tw = Math.max(ctx.measureText(p.label).width + 26, 74);
          api.pill({
            x: cols[p.id] - tw / 2, y: y0, w: tw, h: pillH,
            label: p.label, tone: p.tone || "slate", size: 12.5
          });
          if (p.sub) {
            font(10.5, 400);
            ctx.fillStyle = theme.muted;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(p.sub, cols[p.id], y0 + pillH + 4);
          }
        });
        var lifeTop = y0 + pillH + (o.subGap || 18);
        var lifeBottom = y0 + pillH + (o.subGap || 18) + steps.length * rowH + (o.tailPad || 14);
        parts.forEach(function (p) {
          ctx.save();
          ctx.strokeStyle = theme.border;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.moveTo(cols[p.id], lifeTop);
          ctx.lineTo(cols[p.id], lifeBottom);
          ctx.stroke();
          ctx.restore();
        });
        var y = lifeTop + 6;
        steps.forEach(function (s) {
          y += rowH;
          var yy = y - rowH / 2;
          if (s.kind === "note") {
            font(11.5, 400);
            var nw = totalW - 40;
            var lines = wrapText(ctx, s.label, nw - 20);
            var nh = lines.length * 16 + 12;
            ctx.save();
            roundedRect(ctx, x0 + 20, yy - nh / 2, nw, nh, 8);
            ctx.fillStyle = theme.panel;
            ctx.fill();
            ctx.strokeStyle = theme.border;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
            ctx.fillStyle = theme.muted;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            lines.forEach(function (ln, i) {
              ctx.fillText(ln, x0 + 20 + nw / 2, yy - nh / 2 + 10 + i * 16);
            });
            y += nh - rowH + 8;
            return;
          }
          if (s.kind === "self") {
            var px = cols[s.from];
            ctx.save();
            ctx.strokeStyle = s.color || theme.fg;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(px, yy - 7);
            ctx.lineTo(px + 34, yy - 7);
            ctx.lineTo(px + 34, yy + 7);
            ctx.lineTo(px + 3, yy + 7);
            ctx.stroke();
            ctx.restore();
            drawHead(ctx, px + 3, yy + 7, Math.PI, 7, s.color || theme.fg);
            font(11.5, 600);
            labelAt(ctx, px + 42, yy, s.label, s.color || theme.fg, "left", theme);
            return;
          }
          var fromX = cols[s.from], toX = cols[s.to];
          var isRet = s.kind === "return";
          ctx.save();
          ctx.strokeStyle = s.color || (isRet ? theme.muted : theme.fg);
          ctx.lineWidth = 1.4;
          if (isRet || s.dashed) ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(fromX, yy);
          ctx.lineTo(toX, yy);
          ctx.stroke();
          ctx.restore();
          var ang2 = toX > fromX ? 0 : Math.PI;
          drawHead(ctx, toX, yy, ang2, 7.5, s.color || (isRet ? theme.muted : theme.fg), isRet);
          font(11.5, 600);
          labelAt(ctx, (fromX + toX) / 2, yy - 9, s.label, s.color || (isRet ? theme.muted : theme.fg), "center", theme);
          if (s.note) {
            font(10.5, 400);
            labelAt(ctx, (fromX + toX) / 2, yy + 10, s.note, theme.faint, "center", theme);
          }
        });
        return { bottom: lifeBottom, col: cols };
      },

      /* 分层堆叠图 */
      stack: function (o) {
        var x = o.x, y = o.y, w = o.w;
        var gap = o.gap !== undefined ? o.gap : 12;
        var cy = y;
        (o.layers || []).forEach(function (layer) {
          var tn = tone(layer.tone || "slate");
          var inner = layer.items || [];
          var minH = layer.minH || 58;
          var pillRows = 0;
          if (inner.length) {
            var perRow = layer.perRow || 4;
            pillRows = Math.ceil(inner.length / perRow);
          }
          var h = Math.max(minH, 30 + pillRows * 32 + 10);
          api.box({
            x: x, y: cy, w: w, h: h,
            title: layer.label, tone: layer.tone || "slate",
            titleTop: 16, align: "left", titleSize: 13,
            fill: layer.fill
          });
          if (layer.sub) {
            font(11, 400);
            ctx.fillStyle = theme.muted;
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(layer.sub, x + w - 14, cy + 16);
          }
          if (inner.length) {
            var perRow2 = layer.perRow || 4;
            var pad = 14;
            var cellW = (w - pad * 2) / perRow2;
            inner.forEach(function (it, i) {
              var row = Math.floor(i / perRow2), col = i % perRow2;
              var label = typeof it === "string" ? it : it.label;
              var itTone = (typeof it === "object" && it.tone) || layer.tone || "slate";
              var tn2 = tone(itTone);
              font(11.5, 600);
              var tw2 = ctx.measureText(label).width + 22;
              var bx = x + pad + col * cellW + 4;
              var by = cy + 32 + row * 32;
              api.pill({ x: bx, y: by, w: Math.min(tw2, cellW - 8), h: 24, label: label, tone: itTone, size: 11.5 });
            });
          }
          cy += h + gap;
        });
        return { bottom: cy - gap };
      },

      shapes: shapes
    };
    return api;
  }

  function drawHead(ctx, x, y, ang, len, color, open) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    if (open) {
      ctx.beginPath();
      ctx.moveTo(-len, -len * 0.55);
      ctx.lineTo(0, 0);
      ctx.lineTo(-len, len * 0.55);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-len * 1.3, -len * 0.52);
      ctx.lineTo(-len * 1.3, len * 0.52);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function labelAt(ctx, x, y, text, color, align, theme, dy) {
    var lines = String(text).split("\n");
    font11(ctx);
    ctx.textAlign = align || "center";
    ctx.textBaseline = "middle";
    lines.forEach(function (ln, i) {
      var yy = y + (dy || 0) + i * 14;
      ctx.save();
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.strokeStyle = theme.bg;
      ctx.strokeText(ln, x, yy);
      ctx.restore();
      ctx.fillStyle = color;
      ctx.fillText(ln, x, yy);
    });
    function font11(c) { c.font = "600 11.5px " + FONT; }
  }

  /* ---- figure 注册与渲染 ---- */

  var figRegistry = new Map();
  var pendingFigs = [];

  function registerFig(name, drawFn) {
    var canvas = document.querySelector('canvas[data-fig="' + name + '"]');
    if (!canvas) {
      pendingFigs.push({ name: name, drawFn: drawFn });
      return;
    }
    var entry = {
      name: name, canvas: canvas, drawFn: drawFn,
      W: parseInt(canvas.getAttribute("data-w") || "800", 10),
      H: parseInt(canvas.getAttribute("data-h") || "400", 10)
    };
    figRegistry.set(name, entry);
    renderFig(entry);
  }

  function renderFig(entry) {
    var canvas = entry.canvas;
    // 以块级 <figure> 容器测宽：内层 .fig-box 是 inline-block，其宽度由 canvas 决定，
    // 用它测量会读到 canvas 的旧尺寸（首帧 300px 默认值）导致图缩得过小。
    var fig = canvas.closest ? canvas.closest("figure") : null;
    var container = fig || canvas.parentElement.parentElement || canvas.parentElement;
    var avail = Math.min(container.clientWidth - 30, entry.W);
    if (avail < 60) avail = entry.W;
    var scale = avail / entry.W;
    var dpr = window.devicePixelRatio || 1;
    canvas.style.width = avail + "px";
    canvas.style.height = Math.round(entry.H * scale) + "px";
    canvas.width = Math.round(avail * dpr);
    canvas.height = Math.round(entry.H * scale * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.clearRect(0, 0, entry.W, entry.H);
    var theme = makeTheme();
    var api = makeDrawAPI(ctx, entry.W, entry.H, theme);
    try {
      entry.drawFn(api);
    } catch (err) {
      console.error("[PB.fig] 绘图失败: " + entry.name, err);
    }
  }

  function renderAllFigs() {
    figRegistry.forEach(renderFig);
  }

  function initFigs() {
    pendingFigs = pendingFigs.filter(function (p) {
      var canvas = document.querySelector('canvas[data-fig="' + p.name + '"]');
      if (!canvas) return true;
      figRegistry.set(p.name, {
        name: p.name, canvas: canvas, drawFn: p.drawFn,
        W: parseInt(canvas.getAttribute("data-w") || "800", 10),
        H: parseInt(canvas.getAttribute("data-h") || "400", 10)
      });
      renderFig(figRegistry.get(p.name));
      return false;
    });
    var resizeTimer = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderAllFigs, 120);
    });
  }

  /* ============================ 启动 ============================ */

  function boot() {
    buildHeader();
    measureHeader();
    window.addEventListener("resize", measureHeader);
    window.addEventListener("load", measureHeader);
    buildDrawer();
    enhanceCodeBlocks();
    buildInlineToc();
    markH2();
    buildChapterNav();
    buildProgress();
    initFigs();
  }

  window.PB = {
    fig: function (name, drawFn) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () { registerFig(name, drawFn); });
      } else {
        registerFig(name, drawFn);
      }
    },
    redraw: function () { renderAllFigs(); },
    book: BOOK
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
