/**
 * Tree diagram examples — both directions, run with `node examples/tree-figures.mjs`.
 *
 *   1. Left → right: the user-story map from issue #18 (CJK, 6 groups, 23
 *      numbered leaves). The eval case for the `tree` type.
 *   2. Top → down: a small skill taxonomy with per-node descriptions and
 *      depth captions.
 *   3. The same taxonomy split left → right.
 *   4. The story map from (1) with English labels — the gallery version.
 *
 * Writes .excalidraw / .svg / .png into examples/out/ and prints any lint
 * warnings (there should be none).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { tree, excalidraw, toSvg, toPng, validate, autoRegisterCjkFont } from "../src/index.mjs";

export const stories = {
  title: "报告页音频预取与共享缓存 · 用户故事",
  direction: "horizontal",
  numberLeaves: true,
  root: {
    label: "报告页音频预取与共享缓存",
    children: [
      { label: "刚练完看报告", children: [
        "作为刚做完 L&R 的学生，我想要报告页的原句音频立刻能播，以便不用等它重新下载。",
        "作为刚做完 L&R 的学生，我想要报告页自己的录音立刻能播，以便直接对比原句和自己的发音。",
        "作为刚做完 Interview 的学生，我想要报告页的题目音频和我的回答立刻能播，以便马上回听自己哪里答得不好。",
        "作为刚练完的学生，我想要报告页不显示长时间的加载状态，以便练完马上看到结果。",
      ]},
      { label: "从 history 打开报告", children: [
        "作为从 history 打开旧报告的学生，我想要先看到报告骨架，以便知道页面正在加载、没有卡死。",
        "作为从 history 打开旧报告的学生，我想要报告出现时音频已经能播，以便不用每点一段等一次。",
        "作为网络很慢的学生，我想要最多等 5 秒就看到报告内容，以便不会因为音频下不完而连文字反馈都看不到。",
        "作为某道题本来就没有录音（例如分析失败的题位）的学生，我想要报告照常打开，以便缺失的那段不会卡住整页。",
        "作为某段音频下载失败的学生，我想要报告照常打开，只有那一段显示失败，以便其余内容不受影响。",
      ]},
      { label: "播放器", children: [
        "作为学生，我想要报告渲染后播放器看起来都能直接点，点了如果音频还没下完，按钮显示下载中，以便知道它在下载、不是没反应。",
        "作为学生，我想要音频下完后自动接着播，以便不用再点一次。",
        "作为学生，我想要音频下载失败时看到可以重试的提示，以便知道出了问题并能再试一次。",
        "作为在 L&R 报告上点题位重录的学生，我想要题目音频没准备好时看到下载中而不是 Playing，以便不会对着无声的界面等待。",
        "作为 L&R 学生，我想要在 Original 和 You 之间切换时立刻播放，以便对比时不被下载打断。",
        "作为 L&R 学生，我想要针对性重练的示范音频点了就播，以便专心跟读。",
      ]},
      { label: "一致性", children: [
        "作为在报告页重录了某一题（分析失败或无效录音）的学生，我想要之后在报告上听到的是新录的那一段，以便不会听到被替换掉的旧录音。",
        "作为在另一台设备或另一个标签页重录过某题的学生，我想要这台设备上看到的是新录音，以便不同设备上看到的报告一致。",
        "作为上传失败的学生，我想要报告上不会出现服务器并没有收到的录音，以便我听到的就是被分析的那一段。",
        "作为每次 L&R 针对性重练都留下一次尝试的学生，我想要每次尝试的录音各自能播，以便比较几次尝试的进步。",
      ]},
      { label: "长时间开着的报告", children: [
        "作为把报告页开了一天以上的学生，我想要已经播过的音频还能继续播，以便不因为缓存过期突然没声音。",
        "作为把报告页开了很久、录音链接已经过期的学生，我想要点播放时自动换新链接下载，以便不需要手动刷新页面。",
      ]},
      { label: "缓存的寿命", children: [
        "作为关掉浏览器、几天内重新打开报告或重做同一套题的学生，我想要题目音频不用重新下载，以便加载更快。",
        "作为经常练习的学生，我想要浏览器里存的录音不会无限增长，以便不占用过多磁盘。",
      ]},
    ],
  },
};

// The same story map with English labels — what the skill produces by default
// (labels are English unless the user asks for another language).
export const storiesEn = {
  title: "Report audio prefetch & shared cache · user stories",
  direction: "horizontal",
  numberLeaves: true,
  root: {
    label: "Report audio prefetch & shared cache",
    children: [
      { label: "Right after practice", children: [
        "After L&R, the prompt audio on the report plays instantly — no re-download.",
        "After L&R, my own recordings play instantly, so I can compare them with the prompts.",
        "After Interview, the questions and my answers play instantly, so I can review weak spots.",
        "The report shows no long loading state, so I see results right after practice.",
      ]},
      { label: "Opening from history", children: [
        "Opening an old report, I see a skeleton first, so I know it is loading, not frozen.",
        "When the report appears, its audio is already playable — no wait per clip.",
        "On a slow network I see report content within 5 s, even if audio is still downloading.",
        "A question with no recording (e.g. failed analysis) doesn't block the page.",
        "If one clip fails to download, only that clip shows an error; the rest is unaffected.",
      ]},
      { label: "Player", children: [
        "Every player looks clickable; if audio is still downloading, the button says so.",
        "Playback starts automatically once the download finishes — no second click.",
        "A failed download shows a retry prompt, so I know what happened and can try again.",
        "Re-recording on an L&R report shows “downloading”, not “Playing”, until audio is ready.",
        "Switching between Original and You plays instantly, without a download pause.",
        "Model audio in targeted practice plays on click, so I can focus on shadowing.",
      ]},
      { label: "Consistency", children: [
        "After re-recording a question, the report plays the new take, never the replaced one.",
        "A re-recording made on another device or tab shows up here too.",
        "If an upload failed, the report never shows a recording the server didn't receive.",
        "Each targeted-practice attempt keeps its own playable recording, so I can track progress.",
      ]},
      { label: "Long-open reports", children: [
        "Audio I already played keeps working after the report has been open for a day.",
        "If a recording link has expired, pressing play fetches a fresh link — no page refresh.",
      ]},
      { label: "Cache lifetime", children: [
        "Reopening a report or redoing a set within days doesn't re-download prompt audio.",
        "Stored recordings don't grow without bound, so they don't fill my disk.",
      ]},
    ],
  },
};

export const skills = {
  title: "Skills",
  direction: "vertical",
  levels: ["Root", "Category", "Skill"],
  root: {
    label: "Skills",
    children: [
      { label: "Design", desc: "ui · visual · ux", children: [
        { label: "polish", desc: "align · space · rhythm" },
        { label: "critique", desc: "hierarchy · density" },
      ]},
      { label: "Engineering", desc: "ship · review · test", children: [
        { label: "review", desc: "pre-land diff · sql" },
        { label: "ship", desc: "merge · deploy · verify" },
      ]},
      { label: "Research", desc: "investigate · analyze", children: [
        { label: "investigate", desc: "root cause · evidence" },
      ]},
    ],
  },
};

// Same taxonomy, split left → right instead of top → down.
export const skillsLR = { ...skills, direction: "horizontal" };

// Run directly → write the figures; imported (e.g. by gallery.mjs) → data only.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outDir = new URL("./out/", import.meta.url).pathname;
  mkdirSync(outDir, { recursive: true });

  for (const [name, data] of [["tree-user-stories", stories], ["tree-user-stories-en", storiesEn], ["tree-skills", skills], ["tree-skills-lr", skillsLR]]) {
    const els = tree(data);
    autoRegisterCjkFont(els); // calling toSvg/toPng directly skips render()'s font loading
    const base = `${outDir}${name}`;
    writeFileSync(`${base}.excalidraw`, excalidraw(els));
    writeFileSync(`${base}.svg`, toSvg(els));
    writeFileSync(`${base}.png`, await toPng(els, 2));
    const warnings = validate(els);
    console.log(`✓ ${name}: ${els.length} elements, ${warnings.length} warning(s)`);
    for (const w of warnings) console.log(`  ⚠ ${w.code}: ${w.message}`);
  }
}
