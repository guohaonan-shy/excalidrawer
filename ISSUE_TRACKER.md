# Issue tracker：GitHub

这个仓库的需求以 GitHub issue 的形式进来。所有操作用 `gh`，在仓库的 checkout 里跑，仓库由 `git remote` 推出来。

issue 是需求的入口，也是工作的队列：idea-loop 的调度给每个待验证的 issue 出一张会话卡片，人点开后，一个 issue 一个会话，从验证、设计一路走到实现合并。要做的事写在 spec 里（`docs/spec/<slug>/` 下的文件，工单也在那里），issue 里不放 spec 正文。

## 操作

- **读一个 issue**：`gh issue view <号> --comments`，正文和评论都读完。
- **列 issue**：`gh issue list --state open --json number,title,labels`，按需加 `--label`。
- **评论**：`gh issue comment <号> --body "..."`，多行正文用 heredoc。
- **加、去 label**：`gh issue edit <号> --add-label "..."` / `--remove-label "..."`。
- **关闭**：`gh issue close <号> --reason completed|"not planned" --comment "..."`。

## 状态 label

`status:*` 这一组 label 全由 idea-loop 的 `issues.mjs` 改；人只手动打 `status:搁置`。

| issue 的状态 | GitHub 上 | 意思 |
|---|---|---|
| 待验证 | open，没有 `status:*` | 新进来，调度会给它出会话卡片 |
| 验证中 | `status:验证中` | 在复现，看问题是否真实存在，起草 spec |
| 审核中 | `status:审核中` | spec 里有要人定的，人在 issue 会话里 grill |
| 待设计 / 设计中 | `status:待设计` / `status:设计中` | spec 定稿、碰 UI，等设计 / 在设计 |
| 待实现 / 实现中 | `status:待实现` / `status:实现中` | 等实现 / 在实现 |
| 搁置 | `status:搁置` | 先放着，loop 不碰 |
| 关闭·不存在 | closed，not planned | 验证发现问题不成立，或人决定不做 |
| 关闭·完成 | closed，completed | 实现合并了 |

「中」开头的 label 由 issue 会话挂：每个 PR 合并后，它照主分支把 issue 翻到下一段，或关掉。「待」开头的 label 只在上一段的产出合进主分支之后才挂，由调度每轮对账时按主分支挂上，接住没在会话里的 issue；问题不存在、实现已合并的，也在对账时关掉。spec 覆盖了哪几个 issue，记在 spec frontmatter 的 `issues: [12, 15]` 里；一个都没覆盖的 spec（从对话里写的），会开一个标题以「spec：」开头的 issue 作为它在这里的入口。

## 分类 label

issue 还带分类 label：`type:<父类>`，可选的子类 `type:<父类>/<子类>`。有哪些分类、另外保留哪些 label，写在 `AGENTS.md` 的「issue 分类」一节；分类由 idea-loop 验证 issue 时打。不在状态、分类和保留清单里的 label 会被清掉，要留的写进那一节。
