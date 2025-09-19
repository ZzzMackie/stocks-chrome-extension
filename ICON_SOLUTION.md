# 临时图标解决方案

由于 Chrome 扩展需要 PNG 格式的图标，这里提供几种解决方案：

## 方案1：使用在线转换工具
1. 访问 https://convertio.co/svg-png/
2. 上传现有的 SVG 图标文件
3. 转换为 PNG 格式
4. 下载并替换现有文件

## 方案2：使用简单纯色图标
创建简单的纯色 PNG 图标：
- 背景：蓝色 (#667eea)
- 文字：白色 "S" 字母
- 尺寸：16x16, 32x32, 48x48, 128x128

## 方案3：使用命令行工具
```bash
# 安装 ImageMagick
sudo apt-get install imagemagick  # Ubuntu/Debian
brew install imagemagick          # macOS

# 转换 SVG 到 PNG
convert icons/icon16.svg icons/icon16.png
convert icons/icon32.svg icons/icon32.png
convert icons/icon48.svg icons/icon48.png
convert icons/icon128.svg icons/icon128.png
```

## 方案4：临时使用 SVG
如果暂时无法创建 PNG 图标，可以：
1. 将 manifest.json 中的图标路径改回 SVG
2. 扩展仍然可以正常工作，只是图标可能不显示

## 推荐图标设计
- 背景：蓝色渐变 (#667eea 到 #764ba2)
- 图标：白色上升趋势线
- 风格：现代、简洁、专业
- 确保在小尺寸下仍然清晰可见