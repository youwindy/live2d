import { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';
import axios from 'axios';
import CodeGenerator from './CodeGenerator';
import './Live2DEditor.css';

// 确保 PIXI 在全局可用
window.PIXI = PIXI;

const API_URL = 'http://localhost:3001/api';

export default function Live2DEditor() {
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const currentModelRef = useRef(null);
  const [models, setModels] = useState([]);
  const [scale, setScale] = useState(0.3);
  const [position, setPosition] = useState({ x: 200, y: 200 });
  const [rotation, setRotation] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState('#1a1a1a');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [hasModel, setHasModel] = useState(false);
  const [expressions, setExpressions] = useState([]);
  const [motions, setMotions] = useState([]);
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);
  const [currentModelPath, setCurrentModelPath] = useState('');
  const [currentExpression, setCurrentExpression] = useState(null);
  const [autoExpression, setAutoExpression] = useState(false);
  const [showHitAreas, setShowHitAreas] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [presets, setPresets] = useState([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [enableMouseFollow, setEnableMouseFollow] = useState(true); // 默认启用
  const [enableDrag, setEnableDrag] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [backgroundType, setBackgroundType] = useState('color'); // color, gradient, image, transparent
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [gradientColors, setGradientColors] = useState({ start: '#1a1a1a', end: '#4a4a4a' });
  const [gradientDirection, setGradientDirection] = useState('vertical'); // vertical, horizontal, diagonal
  const [showFPS, setShowFPS] = useState(false);
  const [fps, setFps] = useState(0);
  const [quality, setQuality] = useState('high'); // low, medium, high
  const [performanceMode, setPerformanceMode] = useState(false);
  const fpsCounterRef = useRef({ frames: 0, lastTime: performance.now() });
  const autoExpressionTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const loadModels = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/models`);
      setModels(response.data);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let app = null;
    
    const initApp = async () => {
      try {
        // 创建 PIXI Application，让它自己创建 canvas
        app = new PIXI.Application({
          width: 800,
          height: 600,
          backgroundColor: parseInt(backgroundColor.replace('#', '0x')),
          antialias: true,
          resolution: 1,
        });
        
        // 将 canvas 添加到容器
        containerRef.current.appendChild(app.view);
        
        appRef.current = app;
        await loadModels();
      } catch (err) {
        console.error('Failed to create PIXI app:', err);
        setError('初始化失败: ' + err.message);
      }
    };

    initApp();

    return () => {
      // 清理自动表情定时器
      if (autoExpressionTimerRef.current) {
        clearInterval(autoExpressionTimerRef.current);
      }
      
      // 清理模型
      if (currentModelRef.current) {
        try {
          currentModelRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying model:', e);
        }
        currentModelRef.current = null;
      }
      
      // 清理应用
      if (app) {
        try {
          app.destroy(true, { children: true });
        } catch (e) {
          console.warn('Error destroying PIXI app:', e);
        }
      }
      appRef.current = null;
    };
  }, [loadModels]);

  const loadLive2DModel = useCallback(async (modelPath) => {
    if (!appRef.current) {
      setError('应用未初始化');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // 清除之前的模型
      if (currentModelRef.current) {
        appRef.current.stage.removeChild(currentModelRef.current);
        currentModelRef.current.destroy();
        currentModelRef.current = null;
        setHasModel(false);
      }

      console.log('Loading model from:', modelPath);
      
      setCurrentModelPath(modelPath);
      
      const model = await Live2DModel.from(modelPath);
      
      console.log('Model loaded, original size:', model.width, 'x', model.height);
      console.log('Model position before:', model.position.x, model.position.y);
      console.log('Model scale before:', model.scale.x, model.scale.y);
      
      // 计算合适的缩放比例
      const scaleX = 800 / model.width;
      const scaleY = 600 / model.height;
      const autoScale = Math.min(scaleX, scaleY) * 0.8; // 留一些边距
      
      console.log('Auto calculated scale:', autoScale);
      
      // 使用计算的缩放或用户设置的缩放
      const finalScale = scale === 0.3 ? autoScale : scale;
      model.scale.set(finalScale);
      model.position.set(position.x, position.y);
      model.rotation = rotation;
      
      console.log('Model scale after:', model.scale.x, model.scale.y);
      console.log('Model position after:', model.position.x, model.position.y);
      
      // 获取表情列表 - 直接从 JSON FileReferences 读取
      const expressionList = [];
      if (model.internalModel && model.internalModel.settings) {
        const settings = model.internalModel.settings;
        console.log('Settings:', settings);
        console.log('Settings JSON:', settings.json);
        
        // 从 FileReferences.Expressions 读取
        if (settings.json && settings.json.FileReferences && settings.json.FileReferences.Expressions) {
          console.log('Found expressions in FileReferences.Expressions');
          const expressions = settings.json.FileReferences.Expressions;
          
          expressions.forEach((exp, idx) => {
            const name = exp.Name || exp.File?.replace('.exp3.json', '').replace('.exp.json', '') || `表情${idx + 1}`;
            expressionList.push({
              index: idx,
              name: name,
              file: exp.File
            });
          });
        }
      }
      
      console.log('Final expression list:', expressionList);
      setExpressions(expressionList);
      
      // 获取动作列表 - 从 JSON FileReferences 读取
      const motionList = [];
      if (model.internalModel && model.internalModel.settings) {
        const settings = model.internalModel.settings;
        
        // 从 FileReferences.Motions 读取
        if (settings.json && settings.json.FileReferences && settings.json.FileReferences.Motions) {
          console.log('Found motions in FileReferences.Motions');
          const motions = settings.json.FileReferences.Motions;
          
          Object.keys(motions).forEach(group => {
            const groupMotions = motions[group];
            if (Array.isArray(groupMotions)) {
              groupMotions.forEach((motion, idx) => {
                motionList.push({
                  group: group,
                  index: idx,
                  name: motion.Name || `${group} ${idx + 1}`,
                  file: motion.File
                });
              });
            }
          });
        }
      }
      
      console.log('Final motion list:', motionList);
      setMotions(motionList);
      
      // 添加交互 - 显示点击的热区
      model.on('hit', (hitAreas) => {
        console.log('Hit areas:', hitAreas);
        
        if (hitAreas.length > 0) {
          const hitArea = hitAreas[0];
          
          // 根据热区触发不同的动作
          if (hitArea.includes('head') || hitArea.includes('Head')) {
            // 头部 - 播放特定动作
            const headMotions = motionList.filter(m => 
              m.group.toLowerCase().includes('tap') || 
              m.group.toLowerCase().includes('head')
            );
            if (headMotions.length > 0) {
              const randomMotion = headMotions[Math.floor(Math.random() * headMotions.length)];
              model.motion(randomMotion.group, randomMotion.index);
            }
          } else if (hitArea.includes('body') || hitArea.includes('Body')) {
            // 身体 - 播放身体动作
            const bodyMotions = motionList.filter(m => 
              m.group.toLowerCase().includes('tap') || 
              m.group.toLowerCase().includes('body')
            );
            if (bodyMotions.length > 0) {
              const randomMotion = bodyMotions[Math.floor(Math.random() * bodyMotions.length)];
              model.motion(randomMotion.group, randomMotion.index);
            }
          } else {
            // 其他区域 - 随机动作
            if (motionList.length > 0) {
              const randomMotion = motionList[Math.floor(Math.random() * motionList.length)];
              model.motion(randomMotion.group, randomMotion.index);
            }
          }
          
          // 随机切换表情
          if (expressionList.length > 0 && Math.random() > 0.5) {
            const randomExp = expressionList[Math.floor(Math.random() * expressionList.length)];
            model.expression(randomExp.index);
            setCurrentExpression(randomExp.index);
          }
        }
      });
      
      // 绘制热区（如果启用）
      if (showHitAreas && model.internalModel && model.internalModel.hitAreas) {
        drawHitAreas(model);
      }

      appRef.current.stage.addChild(model);
      currentModelRef.current = model;
      setHasModel(true);
      setLoading(false);
      
      // 更新缩放值为实际使用的值
      if (scale === 0.3) {
        setScale(autoScale);
      }
      
      console.log('Model loaded successfully and added to stage');
      console.log('Stage children count:', appRef.current.stage.children.length);
    } catch (error) {
      console.error('Failed to load Live2D model:', error);
      setError('加载模型失败: ' + error.message);
      setLoading(false);
      setHasModel(false);
    }
  }, [scale, position.x, position.y]);

  const loadSampleModel = useCallback(() => {
    loadLive2DModel('https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/shizuku/shizuku.model.json');
  }, [loadLive2DModel]);

  const handleFileUpload = useCallback(async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    
    // 检查是否是 ZIP 文件
    if (files.length === 1 && files[0].name.endsWith('.zip')) {
      formData.append('zipfile', files[0]);
      formData.append('name', files[0].name);
      formData.append('scale', scale.toString());
      formData.append('x', position.x.toString());
      formData.append('y', position.y.toString());

      try {
        setLoading(true);
        setError(null);
        const response = await axios.post(`${API_URL}/models/zip`, formData);
        await loadModels();
        await loadLive2DModel(`http://localhost:3001${response.data.path}`);
      } catch (error) {
        console.error('Failed to upload ZIP:', error);
        setError('上传 ZIP 失败: ' + (error.response?.data?.error || error.message));
        setLoading(false);
      }
    } else {
      // 多文件上传 - 保持文件夹结构
      const paths = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        formData.append('files', file);
        
        // 获取相对路径（webkitRelativePath 包含文件夹名）
        if (file.webkitRelativePath) {
          // 移除第一层文件夹名，只保留相对路径
          const parts = file.webkitRelativePath.split('/');
          const relativePath = parts.slice(1).join('/');
          paths.push(relativePath);
        } else {
          paths.push(file.name);
        }
      }
      
      formData.append('paths', JSON.stringify(paths));
      formData.append('name', files[0].name);
      formData.append('scale', scale.toString());
      formData.append('x', position.x.toString());
      formData.append('y', position.y.toString());

      try {
        setLoading(true);
        setError(null);
        const response = await axios.post(`${API_URL}/models`, formData);
        await loadModels();
        await loadLive2DModel(`http://localhost:3001${response.data.path}`);
      } catch (error) {
        console.error('Failed to upload files:', error);
        setError('上传文件失败: ' + (error.response?.data?.error || error.message));
        setLoading(false);
      }
    }
    
    // 重置文件输入
    e.target.value = '';
  }, [scale, position.x, position.y, loadModels, loadLive2DModel]);

  const handleReset = useCallback(() => {
    setScale(0.3);
    setPosition({ x: 200, y: 200 });
    setRotation(0);
  }, []);

  const playExpression = useCallback((expressionIndex) => {
    if (currentModelRef.current) {
      currentModelRef.current.expression(expressionIndex);
      setCurrentExpression(expressionIndex);
      console.log('Playing expression:', expressionIndex);
    }
  }, []);

  const playMotion = useCallback((motionGroup, motionIndex = 0) => {
    if (currentModelRef.current) {
      currentModelRef.current.motion(motionGroup, motionIndex);
      console.log('Playing motion:', motionGroup, motionIndex);
    }
  }, []);

  const drawHitAreas = useCallback((model) => {
    if (!appRef.current || !model.internalModel) return;
    
    const hitAreas = model.internalModel.hitAreas || [];
    const graphics = new PIXI.Graphics();
    
    hitAreas.forEach(hitArea => {
      graphics.lineStyle(2, 0x00ff00, 0.5);
      graphics.beginFill(0x00ff00, 0.1);
      
      // 绘制矩形热区
      if (hitArea.x !== undefined && hitArea.y !== undefined) {
        const x = hitArea.x * model.width * model.scale.x + model.position.x;
        const y = hitArea.y * model.height * model.scale.y + model.position.y;
        const width = (hitArea.width || 0.1) * model.width * model.scale.x;
        const height = (hitArea.height || 0.1) * model.height * model.scale.y;
        
        graphics.drawRect(x, y, width, height);
      }
      
      graphics.endFill();
    });
    
    appRef.current.stage.addChild(graphics);
  }, []);

  const toggleAutoExpression = useCallback(() => {
    setAutoExpression(prev => {
      const newValue = !prev;
      
      if (newValue) {
        // 启动自动表情切换
        autoExpressionTimerRef.current = setInterval(() => {
          if (currentModelRef.current && expressions.length > 0) {
            const randomExp = expressions[Math.floor(Math.random() * expressions.length)];
            currentModelRef.current.expression(randomExp.index);
            setCurrentExpression(randomExp.index);
          }
        }, 5000); // 每5秒切换一次
      } else {
        // 停止自动表情切换
        if (autoExpressionTimerRef.current) {
          clearInterval(autoExpressionTimerRef.current);
          autoExpressionTimerRef.current = null;
        }
      }
      
      return newValue;
    });
  }, [expressions]);

  const deleteModel = useCallback(async (modelId) => {
    try {
      await axios.delete(`${API_URL}/models/${modelId}`);
      await loadModels();
      
      // 如果删除的是当前模型，清除显示
      if (currentModelRef.current) {
        appRef.current.stage.removeChild(currentModelRef.current);
        currentModelRef.current.destroy();
        currentModelRef.current = null;
        setHasModel(false);
        setExpressions([]);
        setMotions([]);
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
      setError('删除模型失败: ' + error.message);
    }
  }, [loadModels]);

  const loadModelById = useCallback(async (modelId) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      await loadLive2DModel(`http://localhost:3001${model.path}`);
    }
  }, [models, loadLive2DModel]);

  const exportConfig = useCallback(() => {
    if (!currentModelRef.current) return;
    
    const config = {
      scale: scale,
      position: { x: position.x, y: position.y },
      rotation: rotation,
      backgroundColor: backgroundColor,
    };
    
    const dataStr = JSON.stringify(config, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'live2d-config.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [scale, position, rotation, backgroundColor]);

  const generateEmbedCode = useCallback(() => {
    if (!currentModelRef.current) return;
    setShowCodeGenerator(true);
  }, []);

  const fixModelConfig = useCallback(async () => {
    if (!currentModelRef.current || !currentModelPath) return;
    
    // 从当前模型路径获取模型 ID
    // 路径格式: http://localhost:3001/uploads/ID/folder/file.json
    const pathParts = currentModelPath.split('/');
    const uploadsIndex = pathParts.indexOf('uploads');
    
    if (uploadsIndex === -1 || uploadsIndex + 1 >= pathParts.length) {
      setError('无法解析模型 ID');
      return;
    }
    
    const modelId = pathParts[uploadsIndex + 1];
    console.log('Fixing model with ID:', modelId);
    console.log('Current model path:', currentModelPath);
    
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/models/${modelId}/fix`);
      
      if (response.data.success) {
        setSuccessMessage(`模型配置已修复！添加了 ${response.data.expressionsAdded} 个表情。正在重新加载模型...`);
        setTimeout(() => setSuccessMessage(null), 5000);
        
        // 重新加载模型
        await loadLive2DModel(currentModelPath);
      }
    } catch (error) {
      console.error('Failed to fix model:', error);
      setError('修复模型失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  }, [currentModelPath, loadLive2DModel]);

  // 截图功能
  const takeScreenshot = useCallback(() => {
    if (!appRef.current || !appRef.current.view) return;
    
    try {
      // 强制渲染一帧
      appRef.current.render();
      
      // 获取 canvas
      const canvas = appRef.current.view;
      
      // 使用 toDataURL 方法（更可靠）
      try {
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `live2d-screenshot-${timestamp}.png`;
        link.href = dataURL;
        link.click();
        
        console.log('Screenshot saved');
      } catch (e) {
        // 如果 toDataURL 失败，尝试 toBlob
        canvas.toBlob((blob) => {
          if (!blob) {
            setError('截图失败');
            return;
          }
          
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          link.download = `live2d-screenshot-${timestamp}.png`;
          link.href = url;
          link.click();
          
          URL.revokeObjectURL(url);
          console.log('Screenshot saved via blob');
        }, 'image/png');
      }
    } catch (error) {
      console.error('Screenshot error:', error);
      setError('截图失败: ' + error.message);
    }
  }, []);

  // 开始录制
  const startRecording = useCallback(() => {
    if (!appRef.current || !appRef.current.view) return;
    
    try {
      const canvas = appRef.current.view;
      const stream = canvas.captureStream(30); // 30 FPS
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });
      
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        link.download = `live2d-recording-${timestamp}.webm`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        console.log('Recording saved');
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      console.log('Recording started');
    } catch (error) {
      console.error('Recording error:', error);
      setError('录制失败: ' + error.message);
    }
  }, []);

  // 停止录制
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      console.log('Recording stopped');
    }
  }, [isRecording]);

  // 保存预设
  const savePreset = useCallback(() => {
    if (!presetName.trim()) {
      setError('请输入预设名称');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const preset = {
      id: Date.now().toString(),
      name: presetName,
      scale: scale,
      position: { x: position.x, y: position.y },
      rotation: rotation,
      backgroundColor: backgroundColor,
      expression: currentExpression,
      timestamp: new Date().toISOString()
    };

    const newPresets = [...presets, preset];
    setPresets(newPresets);
    localStorage.setItem('live2d-presets', JSON.stringify(newPresets));
    
    setPresetName('');
    setShowPresetModal(false);
    setSuccessMessage('预设已保存！');
    setTimeout(() => setSuccessMessage(null), 3000);
  }, [presetName, scale, position, rotation, backgroundColor, currentExpression, presets]);

  // 加载预设
  const loadPreset = useCallback((preset) => {
    setScale(preset.scale);
    setPosition(preset.position);
    setRotation(preset.rotation);
    setBackgroundColor(preset.backgroundColor);
    
    if (preset.expression !== null && currentModelRef.current) {
      currentModelRef.current.expression(preset.expression);
      setCurrentExpression(preset.expression);
    }
    
    console.log('Preset loaded:', preset.name);
  }, []);

  // 删除预设
  const deletePreset = useCallback((presetId) => {
    if (!confirm('确定要删除这个预设吗？')) return;
    
    const newPresets = presets.filter(p => p.id !== presetId);
    setPresets(newPresets);
    localStorage.setItem('live2d-presets', JSON.stringify(newPresets));
  }, [presets]);

  // 鼠标跟随控制
  useEffect(() => {
    if (!currentModelRef.current || !containerRef.current) return;

    const handleMouseMove = (e) => {
      if (!enableMouseFollow) {
        // 禁用时重置焦点
        if (currentModelRef.current.internalModel && currentModelRef.current.internalModel.focusController) {
          currentModelRef.current.internalModel.focusController.focus(0, 0);
        }
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 计算相对于画布中心的位置 (-1 到 1)
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const relativeX = (x - centerX) / centerX;
      const relativeY = (y - centerY) / centerY;
      
      // 更新模型的焦点控制器
      if (currentModelRef.current.internalModel && currentModelRef.current.internalModel.focusController) {
        currentModelRef.current.internalModel.focusController.focus(relativeX, relativeY);
      }
    };

    containerRef.current.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [enableMouseFollow]);

  // 拖拽移动
  useEffect(() => {
    if (!enableDrag || !containerRef.current) return;

    const handleMouseDown = (e) => {
      if (e.target.tagName === 'CANVAS') {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
    };

    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    containerRef.current.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enableDrag, isDragging, dragStart, position]);

  // 滚轮缩放
  useEffect(() => {
    if (!containerRef.current) return;

    const handleWheel = (e) => {
      if (e.target.tagName === 'CANVAS') {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newScale = Math.max(0.1, Math.min(2, scale + delta));
        setScale(newScale);
      }
    };

    containerRef.current.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('wheel', handleWheel);
      }
    };
  }, [scale]);

  // 更新模型变换
  useEffect(() => {
    if (currentModelRef.current) {
      currentModelRef.current.scale.set(scale);
      currentModelRef.current.position.set(position.x, position.y);
      currentModelRef.current.rotation = rotation;
    }
  }, [scale, position.x, position.y, rotation]);

  // 更新背景颜色
  useEffect(() => {
    if (appRef.current && appRef.current.renderer) {
      if (backgroundType === 'color') {
        appRef.current.renderer.backgroundColor = parseInt(backgroundColor.replace('#', '0x'));
      } else if (backgroundType === 'transparent') {
        appRef.current.renderer.backgroundColor = 0x000000;
        appRef.current.renderer.backgroundAlpha = 0;
      }
    }
  }, [backgroundColor, backgroundType]);

  // 处理背景图片上传
  const handleBackgroundImageUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgroundImage(event.target.result);
      setBackgroundType('image');
    };
    reader.readAsDataURL(file);
  }, []);

  // 获取背景样式
  const getBackgroundStyle = useCallback(() => {
    switch (backgroundType) {
      case 'color':
        return { backgroundColor };
      case 'gradient':
        const directions = {
          vertical: 'to bottom',
          horizontal: 'to right',
          diagonal: 'to bottom right'
        };
        return {
          background: `linear-gradient(${directions[gradientDirection]}, ${gradientColors.start}, ${gradientColors.end})`
        };
      case 'image':
        return {
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        };
      case 'transparent':
        return {
          background: 'transparent',
          backgroundImage: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 20px 20px'
        };
      default:
        return { backgroundColor };
    }
  }, [backgroundType, backgroundColor, gradientColors, gradientDirection, backgroundImage]);

  // FPS 计数器
  useEffect(() => {
    if (!showFPS || !appRef.current) return;

    const updateFPS = () => {
      const now = performance.now();
      fpsCounterRef.current.frames++;

      if (now >= fpsCounterRef.current.lastTime + 1000) {
        setFps(Math.round((fpsCounterRef.current.frames * 1000) / (now - fpsCounterRef.current.lastTime)));
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;
      }

      if (showFPS) {
        requestAnimationFrame(updateFPS);
      }
    };

    requestAnimationFrame(updateFPS);
  }, [showFPS]);

  // 性能模式切换
  useEffect(() => {
    if (!currentModelRef.current) return;

    if (performanceMode) {
      // 降低更新频率
      if (currentModelRef.current.internalModel) {
        currentModelRef.current.internalModel.motionManager.state.timeScale = 0.5;
      }
    } else {
      // 恢复正常频率
      if (currentModelRef.current.internalModel) {
        currentModelRef.current.internalModel.motionManager.state.timeScale = 1;
      }
    }
  }, [performanceMode]);

  // 画质切换（需要重新创建应用）
  const changeQuality = useCallback((newQuality) => {
    setQuality(newQuality);
    setSuccessMessage('画质已更改，请重新加载模型以应用新设置');
    setTimeout(() => setSuccessMessage(null), 5000);
  }, []);

  return (
    <div className="editor-container">
      <div className="sidebar">
        <h2>Live2D 编辑器</h2>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        {loading && (
          <div className="loading-message">
            加载中...
          </div>
        )}
        
        <div className="upload-section">
          <button className="sample-btn" onClick={loadSampleModel} disabled={loading}>
            加载示例模型
          </button>
          
          <label className="upload-btn">
            上传模型文件夹
            <input 
              type="file" 
              multiple 
              webkitdirectory="true"
              directory="true"
              onChange={handleFileUpload}
              disabled={loading}
            />
          </label>

          <label className="upload-btn zip-btn">
            上传 ZIP 文件
            <input 
              type="file" 
              accept=".zip" 
              onChange={handleFileUpload}
              disabled={loading}
            />
          </label>
        </div>

        <div className="controls">
          <h3>变换控制</h3>
          <div className="control-group">
            <label>缩放: {scale.toFixed(2)}</label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              disabled={!hasModel}
            />
          </div>
          
          <div className="control-group">
            <label>X 位置: {position.x}</label>
            <input
              type="range"
              min="0"
              max="800"
              value={position.x}
              onChange={(e) => setPosition({ ...position, x: parseInt(e.target.value) })}
              disabled={!hasModel}
            />
          </div>
          
          <div className="control-group">
            <label>Y 位置: {position.y}</label>
            <input
              type="range"
              min="0"
              max="600"
              value={position.y}
              onChange={(e) => setPosition({ ...position, y: parseInt(e.target.value) })}
              disabled={!hasModel}
            />
          </div>

          <div className="control-group">
            <label>旋转: {rotation.toFixed(2)}°</label>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={(rotation * 180 / Math.PI).toFixed(0)}
              onChange={(e) => setRotation(parseFloat(e.target.value) * Math.PI / 180)}
              disabled={!hasModel}
            />
          </div>
        </div>

        <div className="background-controls">
          <h3>背景设置</h3>
          
          <div className="background-type-selector">
            <label className="radio-label">
              <input
                type="radio"
                value="color"
                checked={backgroundType === 'color'}
                onChange={(e) => setBackgroundType(e.target.value)}
              />
              <span>纯色</span>
            </label>
            
            <label className="radio-label">
              <input
                type="radio"
                value="gradient"
                checked={backgroundType === 'gradient'}
                onChange={(e) => setBackgroundType(e.target.value)}
              />
              <span>渐变</span>
            </label>
            
            <label className="radio-label">
              <input
                type="radio"
                value="image"
                checked={backgroundType === 'image'}
                onChange={(e) => setBackgroundType(e.target.value)}
              />
              <span>图片</span>
            </label>
            
            <label className="radio-label">
              <input
                type="radio"
                value="transparent"
                checked={backgroundType === 'transparent'}
                onChange={(e) => setBackgroundType(e.target.value)}
              />
              <span>透明</span>
            </label>
          </div>

          {backgroundType === 'color' && (
            <div className="control-group">
              <label>背景颜色</label>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
              />
            </div>
          )}

          {backgroundType === 'gradient' && (
            <>
              <div className="control-group">
                <label>起始颜色</label>
                <input
                  type="color"
                  value={gradientColors.start}
                  onChange={(e) => setGradientColors({ ...gradientColors, start: e.target.value })}
                />
              </div>
              <div className="control-group">
                <label>结束颜色</label>
                <input
                  type="color"
                  value={gradientColors.end}
                  onChange={(e) => setGradientColors({ ...gradientColors, end: e.target.value })}
                />
              </div>
              <div className="control-group">
                <label>渐变方向</label>
                <select 
                  value={gradientDirection}
                  onChange={(e) => setGradientDirection(e.target.value)}
                  className="gradient-select"
                >
                  <option value="vertical">垂直</option>
                  <option value="horizontal">水平</option>
                  <option value="diagonal">对角</option>
                </select>
              </div>
            </>
          )}

          {backgroundType === 'image' && (
            <div className="control-group">
              <label className="upload-bg-btn">
                上传背景图片
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImageUpload}
                />
              </label>
              {backgroundImage && (
                <button 
                  className="clear-bg-btn"
                  onClick={() => {
                    setBackgroundImage(null);
                    setBackgroundType('color');
                  }}
                >
                  清除背景
                </button>
              )}
            </div>
          )}

          {backgroundType === 'transparent' && (
            <div className="transparent-tip">
              💡 透明背景模式，适合导出使用
            </div>
          )}
        </div>

        <div className="controls">
          <h3>交互控制</h3>
          
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={enableMouseFollow}
              onChange={(e) => setEnableMouseFollow(e.target.checked)}
            />
            <span>👀 鼠标跟随</span>
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={enableDrag}
              onChange={(e) => setEnableDrag(e.target.checked)}
            />
            <span>✋ 拖拽移动</span>
          </label>

          <div className="interaction-tip">
            💡 滚轮缩放已启用
          </div>

          {hasModel && (
            <button 
              className="reset-btn"
              onClick={handleReset}
            >
              重置位置
            </button>
          )}
        </div>

        <div className="performance-controls">
          <h3>性能设置</h3>
          
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showFPS}
              onChange={(e) => setShowFPS(e.target.checked)}
            />
            <span>📊 显示 FPS</span>
          </label>

          <label className="toggle-label">
            <input
              type="checkbox"
              checked={performanceMode}
              onChange={(e) => setPerformanceMode(e.target.checked)}
            />
            <span>⚡ 性能模式</span>
          </label>

          <div className="control-group">
            <label>画质设置</label>
            <select 
              value={quality}
              onChange={(e) => changeQuality(e.target.value)}
              className="quality-select"
            >
              <option value="low">低画质</option>
              <option value="medium">中画质</option>
              <option value="high">高画质</option>
            </select>
          </div>

          {showFPS && (
            <div className="fps-display">
              FPS: {fps}
            </div>
          )}

          {hasModel && expressions.length === 0 && (
            <button 
              className="fix-btn"
              onClick={fixModelConfig}
              disabled={loading}
            >
              修复模型配置
            </button>
          )}
        </div>

        {presets.length > 0 && (
          <div className="presets-section">
            <h3>预设配置 ({presets.length})</h3>
            <div className="presets-list">
              {presets.map((preset) => (
                <div key={preset.id} className="preset-item">
                  <span 
                    className="preset-name"
                    onClick={() => loadPreset(preset)}
                    title={`创建于: ${new Date(preset.timestamp).toLocaleString()}`}
                  >
                    {preset.name}
                  </span>
                  <button
                    className="preset-delete-btn"
                    onClick={() => deletePreset(preset.id)}
                    title="删除预设"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasModel && expressions.length > 0 && (
          <div className="expressions-section">
            <div className="section-header">
              <h3>表情 ({expressions.length})</h3>
              <label className="auto-toggle">
                <input
                  type="checkbox"
                  checked={autoExpression}
                  onChange={toggleAutoExpression}
                />
                自动切换
              </label>
            </div>
            <div className="button-grid">
              {expressions.map((exp) => (
                <button
                  key={exp.index}
                  className={`action-btn ${currentExpression === exp.index ? 'active' : ''}`}
                  onClick={() => playExpression(exp.index)}
                  title={exp.file}
                >
                  {exp.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasModel && motions.length > 0 && (
          <div className="motions-section">
            <h3>动作 ({motions.length})</h3>
            <div className="button-grid">
              {motions.map((motion, idx) => (
                <button
                  key={idx}
                  className="action-btn motion-btn"
                  onClick={() => playMotion(motion.group, motion.index)}
                  title={motion.file}
                >
                  {motion.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="models-list">
          <h3>已加载模型</h3>
          {models.length === 0 ? (
            <p className="empty-message">暂无模型</p>
          ) : (
            models.map((model) => (
              <div key={model.id} className="model-item">
                <span 
                  className="model-name"
                  onClick={() => loadModelById(model.id)}
                >
                  {model.name}
                </span>
                <button
                  className="delete-btn"
                  onClick={() => deleteModel(model.id)}
                  title="删除模型"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="info-section">
          <h3>使用说明</h3>
          <ul>
            <li>点击"加载示例模型"快速测试</li>
            <li>上传整个模型文件夹（包含所有资源）</li>
            <li>或上传包含模型的 ZIP 压缩包</li>
            <li>使用滑块调整模型位置和大小</li>
            <li>点击模型不同部位触发不同动作</li>
            <li>点击表情按钮切换表情</li>
            <li>启用"自动切换"让表情自动变化</li>
          </ul>
        </div>
      </div>

      <div 
        className={`canvas-container ${isDragging ? 'dragging' : ''}`} 
        ref={containerRef}
        style={{ 
          cursor: enableDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
          ...getBackgroundStyle()
        }}
      >
        {/* PIXI canvas 将被动态添加到这里 */}
        
        {/* 浮动工具栏 */}
        {hasModel && (
          <div className="floating-toolbar">
            <button 
              className="toolbar-btn screenshot-btn"
              onClick={takeScreenshot}
              data-tooltip="截图"
            >
              📷
            </button>

            {!isRecording ? (
              <button 
                className="toolbar-btn record-btn"
                onClick={startRecording}
                data-tooltip="开始录制"
              >
                🎥
              </button>
            ) : (
              <button 
                className="toolbar-btn record-btn recording"
                onClick={stopRecording}
                data-tooltip="停止录制"
              >
                ⏹️
              </button>
            )}
            
            <button 
              className="toolbar-btn export-btn"
              onClick={exportConfig}
              data-tooltip="导出配置"
            >
              💾
            </button>

            <button 
              className="toolbar-btn embed-btn"
              onClick={generateEmbedCode}
              data-tooltip="生成嵌入代码"
            >
              📝
            </button>

            <button 
              className="toolbar-btn preset-btn"
              onClick={() => setShowPresetModal(true)}
              data-tooltip="保存预设"
            >
              ⭐
            </button>
          </div>
        )}
      </div>

      <CodeGenerator
        isOpen={showCodeGenerator}
        onClose={() => setShowCodeGenerator(false)}
        config={{
          scale,
          position,
          rotation,
          backgroundColor
        }}
        modelPath={currentModelPath}
      />

      {showPresetModal && (
        <div className="preset-modal-overlay" onClick={() => setShowPresetModal(false)}>
          <div className="preset-modal" onClick={(e) => e.stopPropagation()}>
            <h3>保存预设</h3>
            <input
              type="text"
              className="preset-input"
              placeholder="输入预设名称..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && savePreset()}
              autoFocus
            />
            <div className="preset-modal-actions">
              <button className="preset-save-btn" onClick={savePreset}>
                保存
              </button>
              <button className="preset-cancel-btn" onClick={() => setShowPresetModal(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
