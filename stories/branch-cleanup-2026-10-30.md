# 2026-10-30 分支清理记录

用户授权清理不用的本地与远端分支，并推送最新版本。只删除已完整包含在当前 `gpt/yahiko-v11-refine` 历史中的旧分支，不强推、不重写历史、不删除工作目录。

## 可清理的已合并旧分支

操作前逐一通过 `git merge-base --is-ancestor <tip> HEAD` 检查：

| 分支 | 原 tip |
|---|---|
| `claude/adoring-darwin-982h4c` | `d40fd5c27e8a0d5676d65f360019dd6fe1784f1e` |
| `claude/yahiko-claude` | `4b9be2d9f0d93e099245c4e065b9ed731ccd626a` |
| `gpt/review` | `d6d0ab3c0d47df1e6918ec6e70ddfbfc129a2b8e` |
| `review/yahiko-v8-independent` | `d2d2c18771e0a2eb57d2110f6999a6219f0231c9` |

这些历史提交仍可由当前分支访问。需要恢复某个分支时可执行 `git branch <旧名称> <上述SHA>`，再显式推送。删除远端时使用期望 tip 的 lease，防止误删其他设备刚推送的新提交。

## 保留

- `main`：原主分支，不改默认分支、不擅自合并工作分支。
- `gpt/yahiko-v11-refine`：当前最新四季修改所在分支。
- `gpt/yahiko-refine-2026-10-24`（`03d13b6`）：存在 **11 个尚未进入当前分支的提交**，本轮不删。

## 本地范围

- `C:/Users/chen-y/Documents/niigata-data-viz-v11-refine`：当前工作副本。
- `C:/Users/chen-y/Documents/niigata-data-viz-review`：检查无未提交改动后，切换到当前最新分支，删除已合并旧本地分支并清理远端跟踪引用；不删除整个目录。
- `niigata-map` 是另一个仓库，本轮不动。
- 下载文件夹内对照 HTML 不是 Git 分支，保留作为可打开的历史对照。
