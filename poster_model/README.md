# Poster Analysis ML Model

This folder contains the Python-based machine learning model for analyzing movie posters using a ResNet18-based "3-Second Rule" predictor.

## Files

- **app.py**: Streamlit web application for interactive poster analysis
- **predict.py**: Batch scoring script for multiple posters
- **cli_analyze.py**: ⭐ CLI wrapper called by Node.js backend (main integration file)
- **test.py**: Test cases and validation scripts
- **requirements.txt**: Python dependencies
- **three_second_rule.pth**: Trained PyTorch model weights (you need to provide this)

## Model Architecture

- Base: ResNet18 with ImageNet pretrained weights
- Custom head: Single linear layer for regression (1-10 score prediction)
- Framework: PyTorch
- Input: 224x224 RGB images
- Output: Score from 1-10 (converted to 0-100 for frontend)

## Setup

1. Install dependencies:
```bash
cd poster_model
pip install -r requirements.txt
```

2. **IMPORTANT**: Place your trained model file `three_second_rule.pth` in this directory
   - The model should be a PyTorch state dict for the ResNet18 architecture
   - If you don't have the model file, the analysis will fail with an error

3. Test the CLI wrapper:
```bash
python cli_analyze.py "C:\path\to\poster.jpg"
```

Expected output:
```json
{
  "score": 85.5,
  "verdict": "good",
  "suggestions": "Excellent stopping power! This poster effectively captures attention..."
}
```

## Usage

### 1. Streamlit Web App (Standalone)
```bash
streamlit run app.py
```
Opens interactive UI at `http://localhost:8501`

### 2. CLI Analysis (Used by Node.js Backend)
```bash
python cli_analyze.py <image_path>
```

### 3. Batch Scoring
```bash
python predict.py
```
Scores all posters in the configured directory

## Integration with Main App

The Node.js Express backend (`server.js`) calls `cli_analyze.py` via child process:

1. Frontend (React) calls `/api/posters/analyze` or `/api/posters/compare`
2. Express server validates the request and image path
3. Server spawns Python process: `python cli_analyze.py <path>`
4. Python outputs JSON to stdout
5. Server parses JSON and returns to frontend

### Environment Variables

- `PYTHON_CMD`: Python executable name (default: `"python"`)
  - Windows: Usually `"python"`
  - Linux/Mac: May need `"python3"`

### Expected JSON Output Format

```json
{
  "score": 75.5,
  "verdict": "good",
  "suggestions": "Optional improvement suggestions"
}
```

**Verdict Types:**
- `"good"`: Score ≥ 8.5/10 (≥ 85/100)
- `"needs_improvement"`: Score 6.5-8.5/10 (65-85/100)
- `"bad"`: Score < 6.5/10 (< 65/100)

## Troubleshooting

### Model file not found
```json
{"error": "Model file not found", "path": "...three_second_rule.pth"}
```
**Solution**: Ensure `three_second_rule.pth` exists in the `poster_model/` folder

### Python command not found
**Solution**: Set environment variable `PYTHON_CMD=python3` or install Python

### CUDA/GPU errors
The model automatically falls back to CPU if CUDA is not available

### Import errors
Run `pip install -r requirements.txt` to ensure all dependencies are installed

## Model Training

If you need to retrain the model:
1. Prepare dataset of movie posters with attractiveness ratings (1-10)
2. Use ResNet18 with transfer learning
3. Fine-tune the final layer for regression
4. Save weights as `three_second_rule.pth`


The Node.js backend (`server.js`) will call this Python service via child process execution.
Alternatively, run this as a standalone Flask server and the Node backend will make HTTP requests to it.

## Model Requirements

- Input: Image file path
- Output: JSON with score, verdict, and optional suggestions
- Verdict categories: "good" | "bad" | "needs_improvement"
- Score range: 0-100 (based on 3-second rule attractiveness)

## Testing

Run tests:
```bash
python test.py
```

Test with sample posters from `public/assets/posters/`
