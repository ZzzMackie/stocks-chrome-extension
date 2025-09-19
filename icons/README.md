# 创建 PNG 图标的说明

由于 Chrome 扩展需要 PNG 格式的图标，请按照以下步骤创建图标：

## 图标规格
- icon16.png: 16x16 像素
- icon32.png: 32x32 像素  
- icon48.png: 48x48 像素
- icon128.png: 128x128 像素

## 图标设计
- 背景色：#667eea (渐变蓝色)
- 图标：白色股票趋势线
- 风格：简洁现代

## 创建方法

### 方法1：使用在线工具
1. 访问 https://www.favicon-generator.org/
2. 上传 SVG 图标文件
3. 生成各种尺寸的 PNG 文件

### 方法2：使用设计软件
1. 使用 Photoshop、GIMP 或 Figma
2. 创建 128x128 的画布
3. 设计图标并导出为不同尺寸

### 方法3：使用命令行工具
```bash
# 安装 ImageMagick
npm install -g imagemagick

# 转换 SVG 到 PNG
convert icons/icon16.svg icons/icon16.png
convert icons/icon32.svg icons/icon32.png
convert icons/icon48.svg icons/icon48.png
convert icons/icon128.svg icons/icon128.png
```

## 临时解决方案
如果暂时没有 PNG 图标，可以：
1. 将 manifest.json 中的图标路径改回 SVG
2. 或者使用简单的纯色 PNG 图标

## 图标内容
建议的图标设计：
- 背景：蓝色渐变 (#667eea 到 #764ba2)
- 前景：白色上升趋势线
- 风格：现代、简洁、专业