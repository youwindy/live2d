# 🎨 Live2D 编辑器

一个功能强大、界面精美的 Live2D 模型编辑器，支持模型预览、表情切换、动作播放、截图录制等丰富功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.x-61dafb.svg)
![Node.js](https://img.shields.io/badge/Node.js-16+-339933.svg)

## ✨ 功能特性

### 🎭 模型管理
- 📁 支持上传模型文件夹或 ZIP 压缩包
- 🔄 自动解析模型配置文件（支持 Cubism 2/3/4）
- 📋 模型列表管理，快速切换
- 🔧 自动修复模型配置（添加缺失的表情引用）

### 🎨 模型编辑
- 🔍 实时缩放调整（0.1x - 2x）
- 📍 自由拖拽移动模型位置
- 🔄 360° 旋转控制
- 🖱️ 鼠标滚轮缩放
- 👀 鼠标跟随效果（眼睛追踪）

### 😊 表情与动作
- 😀 表情切换（支持所有 .exp3.json 表情文件）
- 🎬 动作播放（支持所有 motion 动作）
- 🔄 自动表情切换模式
- 🎯 点击模型不同部位触发交互

### 🎨 背景定制
- 🎨 纯色背景
- 🌈 渐变背景（垂直/水平/对角）
- 🖼️ 自定义图片背景
- ✨ 透明背景（适合导出）

### 📸 导出功能
- 📷 一键截图（PNG 格式）
- 🎥 视频录制（WebM 格式，30 FPS）
- 💾 配置导出（JSON 格式）
- 📝 生成嵌入代码（完整 HTML/桌面挂件/内联代码）

### ⚙️ 高级功能
- ⭐ 预设配置保存与加载
- 📊 实时 FPS 显示
- ⚡ 性能模式（降低动画频率）
- 🎯 画质设置（低/中/高）
- 📱 完美适配移动端

## 🛠️ 技术栈

### 前端
- **框架**: React 18 + Vite
- **渲染**: PixiJS 6.5.10
- **Live2D**: pixi-live2d-display + Cubism SDK
- **样式**: 现代化 CSS（渐变、毛玻璃、动画）
- **HTTP**: Axios

### 后端
- **运行时**: Node.js 16+
- **框架**: Express
- **文件处理**: Multer（上传）+ ADM-ZIP（解压）
- **跨域**: CORS

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd live2d-editor
```

2. **安装前端依赖**
```bash
npm install
```

3. **安装后端依赖**
```bash
cd server
npm install
cd ..
```

4. **启动项目**

使用便捷脚本（Windows）：
```bash
start.bat
```

或手动启动：

```bash
# 终端 1 - 启动后端
cd server
npm start

# 终端 2 - 启动前端
npm run dev
```

5. **访问应用**
- 前端地址: http://localhost:5173
- 后端地址: http://localhost:3001

## 📖 使用指南

### 基础操作

1. **加载模型**
   - 点击"加载示例模型"快速测试
   - 上传模型文件夹（选择包含所有文件的文件夹）
   - 上传 ZIP 压缩包（自动解压）

2. **调整模型**
   - 使用左侧滑块调整缩放、位置、旋转
   - 启用"拖拽移动"后可直接拖动模型
   - 使用鼠标滚轮快速缩放

3. **表情与动作**
   - 点击表情按钮切换表情
   - 启用"自动切换"让表情每 5 秒变化
   - 点击模型不同部位触发动作

4. **背景设置**
   - 选择背景类型（纯色/渐变/图片/透明）
   - 自定义颜色和渐变方向
   - 上传自己的背景图片

5. **导出与分享**
   - 📷 截图：保存当前画面为 PNG
   - 🎥 录制：录制模型动画为视频
   - 💾 导出配置：保存当前设置
   - 📝 生成代码：获取嵌入网页的代码
   - ⭐ 保存预设：保存常用配置

### 高级技巧

- **修复模型配置**: 如果表情不显示，点击"修复模型配置"按钮
- **性能优化**: 启用"性能模式"降低 CPU 占用
- **预设管理**: 保存多个预设配置，快速切换不同风格
- **代码生成**: 支持三种代码类型（完整页面/桌面挂件/内联代码）

## 📁 项目结构

```
live2d-editor/
├── src/
│   ├── components/
│   │   ├── Live2DEditor.jsx      # 主编辑器组件
│   │   ├── Live2DEditor.css      # 编辑器样式
│   │   ├── CodeGenerator.jsx     # 代码生成器
│   │   └── CodeGenerator.css     # 代码生成器样式
│   ├── App.jsx                   # 应用根组件
│   ├── main.jsx                  # 入口文件
│   └── index.css                 # 全局样式
├── server/
│   ├── index.js                  # Express 服务器
│   ├── package.json              # 后端依赖
│   └── uploads/                  # 上传文件存储
├── public/                       # 静态资源
├── index.html                    # HTML 模板
├── package.json                  # 前端依赖
├── vite.config.js                # Vite 配置
├── start.bat                     # 启动脚本（Windows）
└── README.md                     # 项目文档
```

## 🔌 API 接口

### 模型管理

#### `GET /api/models`
获取所有已上传的模型列表

**响应示例**:
```json
[
  {
    "id": "1234567890",
    "name": "model_name",
    "path": "/uploads/1234567890/model.model3.json"
  }
]
```

#### `POST /api/models`
上传多个模型文件（保持文件夹结构）

**请求参数**:
- `files`: 文件数组
- `paths`: 文件相对路径（JSON 字符串）
- `name`: 模型名称
- `scale`: 缩放比例
- `x`, `y`: 位置坐标

#### `POST /api/models/zip`
上传 ZIP 压缩包（自动解压）

**请求参数**:
- `zipfile`: ZIP 文件
- `name`: 模型名称
- `scale`: 缩放比例
- `x`, `y`: 位置坐标

#### `POST /api/models/:id/fix`
修复模型配置（扫描并添加表情文件引用）

**响应示例**:
```json
{
  "success": true,
  "expressionsAdded": 12,
  "message": "模型配置已更新"
}
```

#### `DELETE /api/models/:id`
删除指定模型及其所有文件

## 🎨 界面预览

### 桌面端
- 左侧：功能控制面板（320px）
- 右侧：模型预览画布 + 浮动工具栏

### 移动端
- 竖屏：上下布局（控制面板 45% + 画布 55%）
- 横屏：左右布局（控制面板 280px + 画布自适应）

## 🔧 配置说明

### 环境变量
创建 `.env` 文件（参考 `.env.example`）：
```env
VITE_API_URL=http://localhost:3001
```

### 端口配置
- 前端端口: `vite.config.js` 中的 `server.port`
- 后端端口: `server/index.js` 中的 `PORT` 常量

## 📝 模型要求

### 支持的格式
- Cubism 2.x: `.model.json`
- Cubism 3.x/4.x: `.model3.json`

### 必需文件
- 模型配置文件（.model3.json）
- 模型数据文件（.moc3）
- 纹理文件（.png）
- 物理文件（.physics3.json，可选）
- 表情文件（.exp3.json，可选）
- 动作文件（.motion3.json，可选）

### 文件结构示例
```
model_folder/
├── model.model3.json
├── model.moc3
├── model.physics3.json
├── textures/
│   ├── texture_00.png
│   └── texture_01.png
├── expressions/
│   ├── happy.exp3.json
│   └── sad.exp3.json
└── motions/
    ├── idle.motion3.json
    └── tap.motion3.json
```

## 🐛 常见问题

### Q: 模型加载失败？
A: 检查模型文件是否完整，确保包含所有纹理和配置文件。

### Q: 表情不显示？
A: 点击"修复模型配置"按钮，自动扫描并添加表情文件引用。

### Q: 录制的视频没有声音？
A: 当前版本仅录制画面，不包含音频。

### Q: 移动端操作不流畅？
A: 启用"性能模式"或降低画质设置。

### Q: 生成的代码无法使用？
A: 确保模型文件已上传到可访问的服务器，并修改代码中的模型路径。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

本项目采用 MIT 协议开源。

## 🙏 致谢

- [Live2D Cubism SDK](https://www.live2d.com/)
- [PixiJS](https://pixijs.com/)
- [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)

## 📮 联系方式

如有问题或建议，欢迎通过 Issue 反馈。

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！
