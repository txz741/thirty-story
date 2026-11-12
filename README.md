# 乘风去往回忆里 · GitHub Pages

手机优先的滑动式互动绘本。当前为 M1 羽毛球闭环样片，没有站点依赖、外部字体、统计脚本或构建步骤。

入口：https://txz741.github.io/thirty-story/ ，样片位于 `demo/`。原占位页保留在 `placeholder.html`。

操作和当前范围详见 [demo/README.md](demo/README.md)。封面、主路、四幕回忆、自动收藏和 Wink 已接入；其余九个节点、加班 IF、终章暂未运行接入。

## 发布

仓库 `main` 分支根目录作为 Pages 发布源。此目录中的静态文件整体发布，`.nojekyll` 禁用不必要的 Jekyll 处理。

## 后续更新

修改 `demo/src/`、`demo/styles.css` 或替换 `demo/assets/` 后推送到同一分支即可更新。根地址保持不变，所有素材使用相对路径。

本目录是独立发布内容；项目 handoff、原始照片和设计素材不属于此占位页。
