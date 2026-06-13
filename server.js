const express = require('express');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const multer = require('multer');

const app = express();
const PORT = 3000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'outputs');

// Ensure dirs exist
[UPLOAD_DIR, OUTPUT_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const upload = multer({ dest: UPLOAD_DIR });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));

// Image processing endpoint
app.post('/api/process', upload.array('images', 50), async (req, res) => {
  try {
    const { action, value, quality = 80 } = req.body;
    const files = req.files;
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const results = [];
    for (const file of files) {
      const outputName = `processed_${Date.now()}_${file.originalname}`;
      const outputPath = path.join(OUTPUT_DIR, outputName);
      let pipeline = sharp(file.path);

      switch (action) {
        case 'compress':
          await pipeline.jpeg({ quality: parseInt(quality) }).toFile(outputPath);
          break;
        case 'resize':
          const w = parseInt(value) || 800;
          await pipeline.resize(w).toFile(outputPath);
          break;
        case 'format':
          const fmt = value || 'jpeg';
          if (fmt === 'png') await pipeline.png().toFile(outputPath);
          else if (fmt === 'webp') await pipeline.webp({ quality: parseInt(quality) }).toFile(outputPath);
          else await pipeline.jpeg({ quality: parseInt(quality) }).toFile(outputPath);
          break;
        case 'grayscale':
          await pipeline.grayscale().toFile(outputPath);
          break;
        default:
          await pipeline.jpeg({ quality: parseInt(quality) }).toFile(outputPath);
      }

      const stat = fs.statSync(outputPath);
      results.push({
        name: outputName,
        originalName: file.originalname,
        size: stat.size,
        url: `/outputs/${outputName}`
      });
    }

    res.json({ success: true, files: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Get processed files list
app.get('/api/outputs', (req, res) => {
  try {
    const files = fs.readdirSync(OUTPUT_DIR).map(f => {
      const stat = fs.statSync(path.join(OUTPUT_DIR, f));
      return { name: f, size: stat.size, time: stat.mtime, url: `/outputs/${f}` };
    }).sort((a, b) => b.time - a.time).slice(0, 50);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/outputs', express.static(OUTPUT_DIR));

// Clean old files every hour
setInterval(() => {
  const files = fs.readdirSync(OUTPUT_DIR);
  const now = Date.now();
  files.forEach(f => {
    const p = path.join(OUTPUT_DIR, f);
    if (now - fs.statSync(p).mtimeMs > 3600000) fs.unlinkSync(p);
  });
}, 3600000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SmartImage Pro running at http://localhost:${PORT}`);
});
