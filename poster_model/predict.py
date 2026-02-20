import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

IMAGE_DIR = r"C:\Users\vnaga\Downloads\posters"
MODEL_PATH = "three_second_rule.pth"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
model.fc = nn.Linear(model.fc.in_features, 1)
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model = model.to(device)
model.eval()

preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def score_image(path):
    img = Image.open(path).convert("RGB")
    x = preprocess(img).unsqueeze(0).to(device)
    with torch.no_grad():
        s = float(model(x).item())
    return max(1.0, min(10.0, s))

scores = []
for i in range(1, 21):
    found = None
    for ext in [".jpg", ".jpeg", ".JPG", ".JPEG", ".png"]:
        p = os.path.join(IMAGE_DIR, f"{i}{ext}")
        if os.path.exists(p):
            found = p
            break
    if found:
        s = score_image(found)
        scores.append((i, s))

scores.sort(key=lambda x: x[1], reverse=True)

print("\n=== TOP posters among your 20 (model ranking) ===")
for i, s in scores:
    print(f"Poster {i:02d}: {s:.2f}/10")