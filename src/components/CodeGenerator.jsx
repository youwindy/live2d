import { useState } from 'react';
import './CodeGenerator.css';

export default function CodeGenerator({ isOpen, onClose, config, modelPath }) {
  const [codeType, setCodeType] = useState('standalone'); // standalone, widget, inline
  const [copySuccess, setCopySuccess] = useState(false);

  const generateStandaloneHTML = () => {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live2D 模型展示</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: ${config.backgroundColor};
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    #live2d-container {
      position: relative;
    }
  </style>
</head>
<body>
  <div id="live2d-container"></div>

  <!-- PIXI.js -->
  <script src="https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js"></script>
  
  <!-- Cubism SDK -->
  <script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js"></script>
  
  <!-- pixi-live2d-display -->
  <script src="https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js"></script>

  <script>
    const config = {
      modelPath: '${modelPath}',
      scale: ${config.scale},
      position: { x: ${config.position.x}, y: ${config.position.y} },
      rotation: ${config.rotation},
      canvasWidth: 800,
      canvasHeight: 600
    };

    window.PIXI = PIXI;
    
    const app = new PIXI.Application({
      width: config.canvasWidth,
      height: config.canvasHeight,
      transparent: true,
      backgroundAlpha: 0
    });
    
    document.getElementById('live2d-container').appendChild(app.view);

    PIXI.live2d.Live2DModel.from(config.modelPath).then(model => {
      app.stage.addChild(model);
      model.scale.set(config.scale);
      model.position.set(config.position.x, config.position.y);
      model.rotation = config.rotation;
      
      model.on('hit', (hitAreas) => {
        if (hitAreas.length > 0) {
          const groups = Object.keys(model.internalModel.motionManager.definitions || {});
          if (groups.length > 0) {
            model.motion(groups[Math.floor(Math.random() * groups.length)]);
          }
        }
      });
    });
  </script>
</body>
</html>`;
  };

  const generateWidgetCode = () => {
    return `<!-- Live2D 桌面宠物挂件 -->
<div id="live2d-widget" style="position:fixed;bottom:0;right:0;z-index:9999;"></div>

<script src="https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js"></script>
<script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js"></script>

<script>
(function() {
  window.PIXI = PIXI;
  
  const app = new PIXI.Application({
    width: ${Math.round(config.position.x * 2)},
    height: ${Math.round(config.position.y * 2)},
    transparent: true,
    backgroundAlpha: 0
  });
  
  document.getElementById('live2d-widget').appendChild(app.view);

  PIXI.live2d.Live2DModel.from('${modelPath}').then(model => {
    app.stage.addChild(model);
    model.scale.set(${config.scale});
    model.position.set(${config.position.x}, ${config.position.y});
    model.rotation = ${config.rotation};
    
    model.on('hit', (hitAreas) => {
      if (hitAreas.length > 0) {
        const groups = Object.keys(model.internalModel.motionManager.definitions || {});
        if (groups.length > 0) {
          model.motion(groups[Math.floor(Math.random() * groups.length)]);
        }
      }
    });
  });
})();
</script>`;
  };

  const generateInlineCode = () => {
    return `<script src="https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js"></script>
<script src="https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/dylanNew/live2d/webgl/Live2D/lib/live2d.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/index.min.js"></script>

<div id="my-live2d"></div>

<script>
window.PIXI = PIXI;
const app = new PIXI.Application({
  width: 800,
  height: 600,
  backgroundColor: '${config.backgroundColor}'
});
document.getElementById('my-live2d').appendChild(app.view);

PIXI.live2d.Live2DModel.from('${modelPath}').then(model => {
  app.stage.addChild(model);
  model.scale.set(${config.scale});
  model.position.set(${config.position.x}, ${config.position.y});
  model.rotation = ${config.rotation};
  
  model.on('hit', (hitAreas) => {
    if (hitAreas.length > 0) {
      const groups = Object.keys(model.internalModel.motionManager.definitions || {});
      if (groups.length > 0) {
        model.motion(groups[Math.floor(Math.random() * groups.length)]);
      }
    }
  });
});
</script>`;
  };

  const getCode = () => {
    switch (codeType) {
      case 'standalone':
        return generateStandaloneHTML();
      case 'widget':
        return generateWidgetCode();
      case 'inline':
        return generateInlineCode();
      default:
        return '';
    }
  };

  const copyCode = () => {
    const code = getCode();
    navigator.clipboard.writeText(code).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }).catch(err => {
      console.error('复制失败:', err);
    });
  };

  const downloadCode = () => {
    const code = getCode();
    const filename = codeType === 'standalone' ? 'live2d.html' : 'live2d-embed.html';
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="code-generator-overlay" onClick={onClose}>
      <div className="code-generator-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>生成嵌入代码</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="code-type-selector">
            <label>
              <input
                type="radio"
                value="standalone"
                checked={codeType === 'standalone'}
                onChange={(e) => setCodeType(e.target.value)}
              />
              完整 HTML 页面
            </label>
            <label>
              <input
                type="radio"
                value="widget"
                checked={codeType === 'widget'}
                onChange={(e) => setCodeType(e.target.value)}
              />
              桌面宠物挂件
            </label>
            <label>
              <input
                type="radio"
                value="inline"
                checked={codeType === 'inline'}
                onChange={(e) => setCodeType(e.target.value)}
              />
              内联代码
            </label>
          </div>

          <div className="code-description">
            {codeType === 'standalone' && '生成一个完整的 HTML 页面，可以直接在浏览器中打开'}
            {codeType === 'widget' && '生成桌面宠物挂件代码，固定在页面右下角'}
            {codeType === 'inline' && '生成可以插入到现有网页中的代码片段'}
          </div>

          <textarea
            className="code-preview"
            value={getCode()}
            readOnly
          />

          <div className="code-warning">
            ⚠️ 注意：模型路径使用的是本地服务器地址 (localhost:3001)。
            如需在其他网站使用，请将模型文件上传到服务器并修改代码中的 modelPath。
          </div>

          <div className="modal-actions">
            <button className="action-button copy-btn" onClick={copyCode}>
              {copySuccess ? '✓ 已复制' : '复制代码'}
            </button>
            <button className="action-button download-btn" onClick={downloadCode}>
              下载文件
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
