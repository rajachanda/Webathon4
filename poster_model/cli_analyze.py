"""
CLI wrapper for poster analysis - called from Node.js backend
Usage: python cli_analyze.py <image_path>
Output: JSON to stdout
"""

import sys
import json
import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

MODEL_PATH = os.path.join(os.path.dirname(__file__), "three_second_rule.pth")

def load_model():
    """Load the trained ResNet18 model"""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    model.fc = nn.Linear(model.fc.in_features, 1)
    
    if os.path.exists(MODEL_PATH):
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    else:
        # Model file not found - return error
        return None, None
    
    model = model.to(device)
    model.eval()
    return model, device

def get_transform():
    """Get image preprocessing transform"""
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

def predict_score(model, device, image_path):
    """Predict score for a single image"""
    img = Image.open(image_path).convert("RGB")
    transform = get_transform()
    img_tensor = transform(img).unsqueeze(0).to(device)
    
    with torch.no_grad():
        raw_score = float(model(img_tensor).item())
    
    # Clamp to 1-10 range
    score = max(1.0, min(10.0, raw_score))
    return score

def get_verdict(score):
    """Convert score to verdict and suggestions"""
    # Convert 1-10 scale to 0-100 for frontend
    score_100 = (score / 10.0) * 100
    
    if score >= 8.5:
        verdict = "good"
        suggestions = "Excellent stopping power! This poster effectively captures attention and will likely stop users from scrolling."
    elif score >= 6.5:
        verdict = "needs_improvement"
        suggestions = "Decent visual appeal, but consider strengthening hierarchy (title/face/contrast) to stand out more in digital feeds."
    else:
        verdict = "bad"
        suggestions = "Low stopping power. The poster may be too cluttered or lacks visual impact. Consider simplifying design, increasing contrast, or making key elements (title/faces) more prominent."
    
    return {
        "score": round(score_100, 1),
        "verdict": verdict,
        "suggestions": suggestions
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "No image path provided",
            "usage": "python cli_analyze.py <image_path>"
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    # Validate image exists
    if not os.path.exists(image_path):
        print(json.dumps({
            "error": "Image file not found",
            "path": image_path
        }))
        sys.exit(1)
    
    try:
        # Load model
        model, device = load_model()
        if model is None:
            print(json.dumps({
                "error": "Model file not found",
                "path": MODEL_PATH,
                "suggestion": "Ensure three_second_rule.pth is in the poster_model folder"
            }))
            sys.exit(1)
        
        # Run prediction
        score = predict_score(model, device, image_path)
        
        # Get verdict and suggestions
        result = get_verdict(score)
        
        # Output JSON to stdout (Node.js captures this)
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "type": type(e).__name__
        }), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
