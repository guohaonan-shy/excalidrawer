# 开发

idea-loop 的 agent 照这份文件选分支、准备 worktree、起服务。小节标题保持原样：idea-loop 按标题找。

## 分支

- 基准分支：`main`
- 合并方式：`squash`

## worktree 准备

新 worktree 在开工前跑：

```
npm ci
```

除了上面这条，agent 照下面的默认做法逐项补齐，跳过不适用的项。

| 要补的 | 默认做法 |
|---|---|
| 被 git 忽略的配置（`.env` 之类） | Claude 建 worktree 时按仓库根的 `.worktreeinclude` 复制。它跳过所有软链，缺了的从主 checkout（`git worktree list` 第一行）手动补 |
| 依赖目录（如 `node_modules`） | 按锁文件装（如 `npm ci`）。macOS 上源和目标在同一个 APFS 卷时，可以用 `cp -cR` 从主 checkout 克隆，软链保留，比重装快。依赖目录不走 `.worktreeinclude`：它会丢掉 `.bin` 这类软链 |
| 端口 | 用分配给你的端口，照「开发服务器」的命令起服务；前端要指向后端的，改它读的那个配置 |

依赖跟着代码基准走：每次代码基准变了（开工时 reset、提交前合入集成分支的最新提交），对比依赖目录里记录的锁文件和当前锁文件（npm 是 `node_modules/.package-lock.json` 对 `package-lock.json`），不一致就增量装一次。锁文件冲突只解决清单文件（`package.json`）的冲突，再用包管理器重新生成锁文件。

## 开发服务器

无。excalidrawer 是库 + CLI + MCP server，没有要起的服务；看效果直接跑 `node examples/basic.mjs` 或 `excalidrawer render`，产物是文件。landing page 的站点工作区建起来后，在这里补它的启动命令。

起好了的判断：不适用。

## 清理

无。
