"""
MOCK VERSION - For testing without trained model
This returns random scores for testing purposes
"""

import sys
import json
import os
import random

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "No image path provided",
            "usage": "python cli_analyze_mock.py <image_path>"
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
        # MOCK: Generate random score for testing
        raw_score = random.uniform(5.0, 9.5)
        score_100 = (raw_score / 10.0) * 100
        
        if raw_score >= 8.5:
            verdict = "good"
            suggestions = "Excellent stopping power! This poster effectively captures attention and will likely stop users from scrolling. [MOCK DATA]"
        elif raw_score >= 6.5:
            verdict = "needs_improvement"
            suggestions = "Decent visual appeal, but consider strengthening hierarchy (title/face/contrast) to stand out more in digital feeds. [MOCK DATA]"
        else:
            verdict = "bad"
            suggestions = "Low stopping power. The poster may be too cluttered or lacks visual impact. Consider simplifying design. [MOCK DATA]"
        
        result = {
            "score": round(score_100, 1),
            "verdict": verdict,
            "suggestions": suggestions
        }
        
        # Output JSON to stdout
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "type": type(e).__name__
        }), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
