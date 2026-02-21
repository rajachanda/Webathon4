const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Python command - use environment variable or default to 'python'
const PYTHON_CMD = process.env.PYTHON_CMD || 'python';

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'uploads');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const uniqueName = `${crypto.randomBytes(16).toString('hex')}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * GET /api/posters/list
 * Returns list of available posters from public/assets/posters/
 */
app.get('/api/posters/list', async (req, res) => {
  try {
    const postersDir = path.join(__dirname, 'public', 'assets', 'posters');
    const files = await fs.readdir(postersDir);
    
    // Filter only image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const posters = files.filter(file => 
      imageExtensions.includes(path.extname(file).toLowerCase())
    );
    
    res.json({
      success: true,
      posters: posters.map(filename => ({
        filename,
        path: `/assets/posters/${filename}`,
        url: `/assets/posters/${filename}`
      }))
    });
  } catch (error) {
    console.error('Error listing posters:', error);
    res.status(500).json({
      error: 'Failed to list posters',
      details: error.message
    });
  }
});

/**
 * POST /api/posters/analyze
 * Analyzes a single poster using the Python ML model
 * Body: { imagePath: string }
 */
app.post('/api/posters/analyze', async (req, res) => {
  try {
    const { imagePath } = req.body;
    
    // Validation
    if (!imagePath) {
      return res.status(400).json({
        error: 'Missing imagePath parameter'
      });
    }
    
    // Security: Prevent path traversal, only allow /assets/posters/
    if (!imagePath.startsWith('/assets/posters/')) {
      return res.status(400).json({
        error: 'Invalid image path. Only posters from /assets/posters/ are allowed.'
      });
    }
    
    // Convert to absolute path
    const filename = path.basename(imagePath);
    const absolutePath = path.join(__dirname, 'public', 'assets', 'posters', filename);
    
    // Check if file exists
    try {
      await fs.access(absolutePath);
    } catch {
      return res.status(404).json({
        error: 'Poster file not found',
        path: imagePath
      });
    }
    
    // Execute Python model
    const result = await runPosterAnalysis(absolutePath);
    
    res.json({
      success: true,
      imagePath,
      analysis: result
    });
    
  } catch (error) {
    console.error('Error analyzing poster:', error);
    res.status(500).json({
      error: 'Poster analysis failed',
      details: error.message
    });
  }
});

/**
 * POST /api/posters/analyze-upload
 * Analyzes an uploaded poster image
 * Body: multipart/form-data with 'image' field
 */
app.post('/api/posters/analyze-upload', upload.single('image'), async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file uploaded'
      });
    }
    
    uploadedFilePath = req.file.path;
    
    // Run analysis on uploaded file
    const result = await runPosterAnalysis(uploadedFilePath);
    
    // Clean up uploaded file
    try {
      await fs.unlink(uploadedFilePath);
    } catch (cleanupError) {
      console.warn('Failed to delete uploaded file:', cleanupError);
    }
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    // Clean up on error
    if (uploadedFilePath) {
      try {
        await fs.unlink(uploadedFilePath);
      } catch {}
    }
    
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      details: error.message
    });
  }
});

/**
 * POST /api/posters/compare
 * Compares two posters (A/B testing)
 * Body: { imagePathA: string, imagePathB: string }
 */
app.post('/api/posters/compare', async (req, res) => {
  try {
    const { imagePathA, imagePathB } = req.body;
    
    if (!imagePathA || !imagePathB) {
      return res.status(400).json({
        error: 'Both imagePathA and imagePathB are required'
      });
    }
    
    // Validate both paths
    if (!imagePathA.startsWith('/assets/posters/') || !imagePathB.startsWith('/assets/posters/')) {
      return res.status(400).json({
        error: 'Invalid image paths. Only posters from /assets/posters/ are allowed.'
      });
    }
    
    // Get absolute paths
    const filenameA = path.basename(imagePathA);
    const filenameB = path.basename(imagePathB);
    const absolutePathA = path.join(__dirname, 'public', 'assets', 'posters', filenameA);
    const absolutePathB = path.join(__dirname, 'public', 'assets', 'posters', filenameB);
    
    // Check both files exist
    try {
      await Promise.all([
        fs.access(absolutePathA),
        fs.access(absolutePathB)
      ]);
    } catch {
      return res.status(404).json({
        error: 'One or both poster files not found'
      });
    }
    
    // Analyze both posters in parallel
    const [resultA, resultB] = await Promise.all([
      runPosterAnalysis(absolutePathA),
      runPosterAnalysis(absolutePathB)
    ]);
    
    // Determine winner based on score
    const winner = resultA.score > resultB.score ? 'A' : 
                   resultB.score > resultA.score ? 'B' : 'tie';
    
    res.json({
      success: true,
      comparison: {
        posterA: {
          path: imagePathA,
          analysis: resultA
        },
        posterB: {
          path: imagePathB,
          analysis: resultB
        },
        winner,
        scoreDifference: Math.abs(resultA.score - resultB.score)
      }
    });
    
  } catch (error) {
    console.error('Error comparing posters:', error);
    res.status(500).json({
      error: 'Poster comparison failed',
      details: error.message
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'poster-analysis-api' });
});

/**
 * OTT Deal Assistant Routes
 * Mounted at /api/ott-assistant
 */
const ottDealRoutes = require('./routes/ottDeal.routes');
app.use('/api/ott-assistant', ottDealRoutes);

/**
 * Executes the Python poster analysis model
 * @param {string} imagePath - Absolute path to the poster image
 * @returns {Promise<Object>} Analysis result with score, verdict, suggestions
 */
function runPosterAnalysis(imagePath) {
  return new Promise((resolve, reject) => {
    // Use mock script if model file doesn't exist, otherwise use real script
    const realScript = path.join(__dirname, 'poster_model', 'cli_analyze.py');
    const mockScript = path.join(__dirname, 'poster_model', 'cli_analyze_mock.py');
    const modelFile = path.join(__dirname, 'poster_model', 'three_second_rule.pth');
    
    let pythonScript = realScript;
    
    // Check if model exists, use mock if not
    const fs = require('fs');
    if (!fs.existsSync(modelFile)) {
      console.log('⚠️  Model file not found, using MOCK model for testing');
      pythonScript = mockScript;
    }
    
    // Spawn Python process
    const pythonProcess = spawn(PYTHON_CMD, [pythonScript, imagePath]);
    
    let stdout = '';
    let stderr = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', stderr);
        reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        // Parse JSON output from Python
        const result = JSON.parse(stdout.trim());
        
        // Validate expected fields
        if (typeof result.score !== 'number' || !result.verdict) {
          reject(new Error('Invalid Python output format'));
          return;
        }
        
        resolve({
          score: result.score,
          verdict: result.verdict,
          suggestions: result.suggestions || null
        });
      } catch (error) {
        console.error('Failed to parse Python output:', stdout);
        reject(new Error('Failed to parse Python script output'));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Poster Analysis API running on http://localhost:${PORT}`);
  console.log(`📊 Endpoints available:`);
  console.log(`   GET  /api/posters/list - List all posters`);
  console.log(`   POST /api/posters/analyze - Analyze a single poster`);
  console.log(`   POST /api/posters/analyze-upload - Analyze uploaded poster`);
  console.log(`   POST /api/posters/compare - Compare two posters (A/B)`);
  console.log(`   POST /api/ott-assistant/evaluate - Get OTT deal recommendation`);
  console.log(`   GET  /api/ott-assistant/examples - Get example payloads`);
  console.log(`   GET  /api/ott-assistant/platforms - Get platform info`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`\n🐍 Using Python command: ${PYTHON_CMD}`);
});

module.exports = app;
