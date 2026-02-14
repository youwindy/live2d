import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(uploadsDir, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

let models = [];

app.get('/api/models', (req, res) => {
  res.json(models);
});

// 支持多文件上传
app.post('/api/models', upload.array('files', 50), async (req, res) => {
  try {
    const { name, scale, x, y, paths } = req.body;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const modelId = Date.now().toString();
    const modelDir = path.join(uploadsDir, modelId);
    fs.mkdirSync(modelDir, { recursive: true });

    // 解析路径信息（从前端传来）
    let pathsArray = [];
    try {
      pathsArray = paths ? JSON.parse(paths) : [];
    } catch (e) {
      console.warn('Failed to parse paths:', e);
    }

    // 查找模型配置文件
    let modelConfigFile = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // 使用前端传来的相对路径，如果没有则使用文件名
      const relativePath = pathsArray[i] || file.originalname;
      const destPath = path.join(modelDir, relativePath);
      const destDir = path.dirname(destPath);
      
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      fs.renameSync(file.path, destPath);

      // 查找 .model.json 或 .model3.json 文件
      if (relativePath.endsWith('.model.json') || relativePath.endsWith('.model3.json')) {
        modelConfigFile = relativePath;
      }
    }

    if (!modelConfigFile) {
      return res.status(400).json({ error: 'No model config file found (.model.json or .model3.json)' });
    }

    const model = {
      id: modelId,
      name: name || modelConfigFile,
      path: `/uploads/${modelId}/${modelConfigFile}`,
      scale: parseFloat(scale) || 0.3,
      position: { x: parseFloat(x) || 200, y: parseFloat(y) || 200 }
    };
    
    models.push(model);
    res.json(model);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 支持 ZIP 文件上传
app.post('/api/models/zip', upload.single('zipfile'), async (req, res) => {
  try {
    const { name, scale, x, y } = req.body;
    const zipFile = req.file;
    
    if (!zipFile) {
      return res.status(400).json({ error: 'No zip file uploaded' });
    }

    const modelId = Date.now().toString();
    const modelDir = path.join(uploadsDir, modelId);
    fs.mkdirSync(modelDir, { recursive: true });

    // 解压 ZIP 文件
    const zip = new AdmZip(zipFile.path);
    zip.extractAllTo(modelDir, true);

    // 删除临时 ZIP 文件
    fs.unlinkSync(zipFile.path);

    // 递归查找模型配置文件
    let modelConfigFile = null;
    const findModelFile = (dir, baseDir = '') => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const relativePath = path.join(baseDir, file);
        
        if (fs.statSync(filePath).isDirectory()) {
          const found = findModelFile(filePath, relativePath);
          if (found) return found;
        } else if (file.endsWith('.model.json') || file.endsWith('.model3.json')) {
          return relativePath;
        }
      }
      return null;
    };

    modelConfigFile = findModelFile(modelDir);

    if (!modelConfigFile) {
      return res.status(400).json({ error: 'No model config file found in ZIP' });
    }

    const model = {
      id: modelId,
      name: name || path.basename(modelConfigFile),
      path: `/uploads/${modelId}/${modelConfigFile.replace(/\\/g, '/')}`,
      scale: parseFloat(scale) || 0.3,
      position: { x: parseFloat(x) || 200, y: parseFloat(y) || 200 }
    };
    
    models.push(model);
    res.json(model);
  } catch (error) {
    console.error('ZIP upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/models/:id', (req, res) => {
  const { id } = req.params;
  const { scale, x, y } = req.body;
  const model = models.find(m => m.id === id);
  if (model) {
    if (scale !== undefined) model.scale = parseFloat(scale);
    if (x !== undefined) model.position.x = parseFloat(x);
    if (y !== undefined) model.position.y = parseFloat(y);
    res.json(model);
  } else {
    res.status(404).json({ error: 'Model not found' });
  }
});

app.delete('/api/models/:id', (req, res) => {
  const { id } = req.params;
  const model = models.find(m => m.id === id);
  
  if (model) {
    // 删除模型文件夹
    const modelDir = path.join(uploadsDir, id);
    if (fs.existsSync(modelDir)) {
      fs.rmSync(modelDir, { recursive: true, force: true });
    }
    
    models = models.filter(m => m.id !== id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Model not found' });
  }
});

// 修复模型配置 - 自动添加表情和动作
app.post('/api/models/:id/fix', (req, res) => {
  try {
    const { id } = req.params;
    const model = models.find(m => m.id === id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const modelDir = path.join(uploadsDir, id);
    
    // 获取模型配置文件的完整路径
    const modelRelativePath = model.path.replace('/uploads/' + id + '/', '');
    const modelConfigPath = path.join(modelDir, modelRelativePath);
    
    console.log('Model dir:', modelDir);
    console.log('Model config path:', modelConfigPath);
    
    if (!fs.existsSync(modelConfigPath)) {
      return res.status(404).json({ error: 'Model config file not found: ' + modelConfigPath });
    }
    
    // 读取模型配置
    const configData = fs.readFileSync(modelConfigPath, 'utf8');
    const config = JSON.parse(configData);
    
    // 获取模型文件所在的目录
    const modelFileDir = path.dirname(modelConfigPath);
    
    // 扫描表情文件
    const expressions = [];
    const scanForExpressions = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // 递归扫描子目录
          scanForExpressions(fullPath);
        } else if (file.endsWith('.exp3.json') || file.endsWith('.exp.json')) {
          // 计算相对于模型配置文件的路径
          const relativePath = path.relative(modelFileDir, fullPath).replace(/\\/g, '/');
          const name = file.replace('.exp3.json', '').replace('.exp.json', '');
          expressions.push({
            Name: name,
            File: relativePath
          });
        }
      });
    };
    
    scanForExpressions(modelFileDir);
    
    console.log('Found expressions:', expressions);
    
    // 添加表情到配置
    if (expressions.length > 0) {
      if (!config.FileReferences) {
        config.FileReferences = {};
      }
      config.FileReferences.Expressions = expressions;
    }
    
    // 保存修复后的配置
    fs.writeFileSync(modelConfigPath, JSON.stringify(config, null, '\t'));
    
    res.json({
      success: true,
      expressionsAdded: expressions.length,
      expressions: expressions
    });
  } catch (error) {
    console.error('Fix model error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
