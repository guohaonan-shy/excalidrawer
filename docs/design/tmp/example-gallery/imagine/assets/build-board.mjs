import { readFileSync, writeFileSync } from "node:fs";
const IM = "/Users/guohaonan/projects/TOEFLAIR-worktree/excalidrawer/issue-25-f2ede6/docs/design/tmp/example-gallery/imagine/";
const variants = [
  { slug: "fieldbook", family: "暖纸一族 · A", name: "Fieldbook 野外记录本",
    bet: "赌页面像工程师的野外记录本：印好的方格表格里手写记录，图是贴进来的证据。",
    diff: "图怎么放：白图用四个相角贴在 buff 方格纸上，无阴影 · 手写到哪：标题、tab、图名、说明手写；表格标签、文件名、下载、JSON 用等宽 · accent：锈红 #B23A0E",
    timing: "点 tab：立即换图，新面板 0.22 秒淡入上浮 · 点 Input：立即展开" },
  { slug: "card-catalog", family: "暖纸一族 · B", name: "Card catalog 卡片抽屉",
    bet: "赌页面像图书馆的卡片抽屉：每张图是一张归档的白卡，下面一张打字的记录。",
    diff: "图怎么放：白卡 1.5px 墨线边，背后错开 5px 一张马尼拉卡（硬边），卡底打孔 · 手写到哪：同 A；机器的东西用打字机字体 Courier Prime · accent：印章红 #A0281C，下载链接像盖章（转不到 1°）",
    timing: "点 tab：立即换图，卡片 0.22 秒从抽屉里抽出 · 点 Input：立即展开" },
  { slug: "galley", family: "暖纸一族 · C", name: "Galley 校样台",
    bet: "赌页面像印刷厂的校样台：每张图是刚从机器上拉下来的校样，红笔只圈能动手的地方。",
    diff: "图怎么放：白校样压在灰纸板上，4px 平移硬阴影，四角裁切标记，上方一行工单 slug（PROOF 01/08 · 2520×540 @2X） · 手写到哪：所有标签和句子，连下载链接都手写；只有 JSON 和 slug 行用等宽 · accent：胭脂红 #A3122D",
    timing: "点 tab：立即换图，0.18 秒淡入 · 点 Input：立即展开" },
  { slug: "meniscus", family: "白底", name: "Meniscus 量杯",
    bet: "赌页面不是纸、是一台校准过的仪器：全白，图没有边框直接化进页面，整页就是一张引擎画布。",
    diff: "图怎么放：页面白 = 图的白，图无框无影，靠左侧刻度尺和图下一条细线分块 · 手写到哪：只到名字和标题（字标、tab、图名、Input）；说明和读数用 Instrument Sans，JSON 用等宽 · accent：橄榄绿 #4B6A00；当前 tab 下有一道凹液面弧线",
    timing: "点 tab：立即换图，液面弧线 0.28 秒升起 · 点 Input：立即展开" },
  { slug: "viewbox", family: "暗底", name: "Viewbox 看片灯",
    bet: "赌页面是一间暗着的读片室：每张图是灯箱上唯一亮着的东西，人的批注写在旁边。",
    diff: "图怎么放：深石板底 #0F151D，白图夹在灯箱里，顶部一个夹子，所有 UI 都比图暗 · 手写到哪：所有人话（标题、tab、图名、说明、Input、报错）；文件名尺寸用窄体 sans，JSON 用等宽 · accent：琥珀 #E7B54A（深字压在上面）",
    timing: "点 tab：立即换图，0.3 秒灯管启动式闪一下 · 点 Input：立即展开 · tree-stories 里滚动时实时显示看到百分之几" },
];
const frag = (s) => readFileSync(`${IM}assets/variants/${s}.html`, "utf8");
const blocks = variants.map((v) => `
<article class="bd-variant" id="v-${v.slug}" data-slug="${v.slug}">
  <header class="bd-label">
    <p class="bd-family">${v.family}</p>
    <h2 class="bd-name">${v.name} <code>?variant=${v.slug}</code></h2>
    <p class="bd-bet">${v.bet}</p>
    <p class="bd-diff"><b>差别</b>　${v.diff}</p>
    <p class="bd-timing"><b>时序</b>　${v.timing}</p>
  </header>
  <div class="bd-stage">
${frag(v.slug)}
  </div>
</article>`).join("\n");

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Example gallery · 变种板</title>
<style>
@font-face { font-family: "Excalifont"; src: url(assets/fonts/Excalifont-Regular.woff2) format("woff2"); font-display: swap; }
@font-face { font-family: "Virgil"; src: url(assets/fonts/Virgil.woff2) format("woff2"); font-display: swap; }
html, body { margin: 0; }
body { background: #e7e7e4; color: #1d1d1b; font: 14px/1.55 -apple-system, "PingFang SC", "Helvetica Neue", sans-serif; }
.bd-top { position: sticky; top: 0; z-index: 50; background: #1d1d1b; color: #f2f2ef; padding: 10px 16px; display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; font-size: 13px; }
.bd-top b { font-weight: 600; }
.bd-top a { color: #f2f2ef; text-decoration: none; padding: 2px 8px; border: 1px solid #555; border-radius: 3px; }
.bd-top a[aria-current="true"] { background: #f2f2ef; color: #1d1d1b; }
.bd-top label { display: inline-flex; gap: 6px; align-items: center; cursor: pointer; }
.bd-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.bd-intro { max-width: 860px; margin: 20px auto 0; padding: 0 16px; }
.bd-intro p { margin: 0 0 8px; }
.bd-variant { max-width: 860px; margin: 28px auto 56px; padding: 0 16px; }
.bd-label { border-left: 4px solid #1d1d1b; padding: 4px 0 4px 12px; margin-bottom: 14px; }
.bd-family { margin: 0; font-size: 12px; letter-spacing: .04em; color: #555; }
.bd-name { margin: 2px 0 6px; font-size: 20px; }
.bd-name code { font-size: 12px; font-weight: 400; color: #555; margin-left: 6px; }
.bd-bet { margin: 0 0 6px; font-weight: 600; }
.bd-diff, .bd-timing { margin: 0 0 4px; color: #333; }
.bd-stage { outline: 1px dashed #9a9a96; outline-offset: 0; }
body.bd-single .bd-variant:not(.bd-on) { display: none; }
</style>
</head>
<body>
<div class="bd-top" role="region" aria-label="变种板控制">
  <b>Example gallery · 第 1 轮 · 语言</b>
  <span class="bd-row" id="bd-vnav"><a href="?">全部</a>${variants.map((v) => `<a href="?variant=${v.slug}" data-v="${v.slug}">${v.slug}</a>`).join("")}</span>
  <span class="bd-row" id="bd-snav">状态：<a data-s="default">default</a><a data-s="input-open">input-open</a><a data-s="load-error">load-error</a></span>
  <label><input type="checkbox" id="bd-rm"> 预览减弱动效</label>
</div>
<div class="bd-intro">
  <p><b>这一轮比的是语言</b>：底色、字体、形状、语气。每个变种上半是样张（色板、字体、形状、语气），下半是一块能点的图库片段（tab 能切、Input 能展开、图点开是原尺寸 PNG），图全是引擎真画的。</p>
  <p><b>真正分开它们的是两件事</b>：白图和底色什么关系（贴在纸上 / 化进白页 / 暗处唯一亮的东西），手写体铺到哪（只到名字 / 所有人话 / 连链接都手写）。A、B、C 是同一族（暖纸 + 红色 accent + 手写配等宽），差在处理，不是三个方向。</p>
</div>
${blocks}
<script>
(function(){
  var q = new URLSearchParams(location.search);
  var v = q.get("variant"), s = q.get("state") || "default";
  if (["default","input-open","load-error"].indexOf(s) < 0) s = "default";
  if (v && document.getElementById("v-" + v)) {
    document.body.classList.add("bd-single");
    document.getElementById("v-" + v).classList.add("bd-on");
  }
  document.querySelectorAll("#bd-vnav a").forEach(function(a){
    var on = (a.dataset.v || null) === (v || null);
    if (on) a.setAttribute("aria-current","true");
    var u = new URLSearchParams(); if (a.dataset.v) u.set("variant", a.dataset.v); if (s !== "default") u.set("state", s);
    a.href = "?" + u.toString();
  });
  document.querySelectorAll("#bd-snav a").forEach(function(a){
    if (a.dataset.s === s) a.setAttribute("aria-current","true");
    var u = new URLSearchParams(); if (v) u.set("variant", v); if (a.dataset.s !== "default") u.set("state", a.dataset.s);
    a.href = "?" + u.toString();
  });
  var rm = document.getElementById("bd-rm");
  try { rm.checked = localStorage.getItem("bd-rm") === "1"; } catch(e) {}
  function applyRm(){ document.documentElement.classList.toggle("reduce-motion", rm.checked); try { localStorage.setItem("bd-rm", rm.checked ? "1" : "0"); } catch(e) {} }
  rm.addEventListener("change", applyRm); applyRm();
  document.querySelectorAll("[data-variant]").forEach(function(r){ r.setAttribute("data-state", s); });
})();
</script>
</body>
</html>`;
writeFileSync(`${IM}board.html`, html);
console.log("board.html", html.length);
