// 简单的图标生成脚本
// 运行此脚本生成 PNG 图标

const fs = require('fs');
const path = require('path');

// 创建简单的 PNG 图标数据 (16x16, 蓝色背景，白色线条)
function createIcon(size) {
    // 这是一个简化的 PNG 创建函数
    // 实际项目中建议使用专业的图像处理库
    
    const canvas = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="#667eea"/>
        <path d="M2 ${size-2} L${size/4} ${size/2} L${size/2} ${size/4} L${size*3/4} ${size/3} L${size-2} 2" 
              stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${size-2}" cy="2" r="2" fill="white"/>
    </svg>`;
    
    return canvas;
}

// 生成不同尺寸的图标
const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
    const svgContent = createIcon(size);
    const filename = `icon${size}.svg`;
    
    fs.writeFileSync(path.join(__dirname, 'icons', filename), svgContent);
    console.log(`Generated ${filename}`);
});

console.log('Icons generated! Convert SVG to PNG using an online converter or ImageMagick.');