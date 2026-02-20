import os
import random
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models, transforms
from torch.utils.data import Dataset, DataLoader
from PIL import Image

# ------------------------
# 1) PATH + LABELS
# ------------------------
IMAGE_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'posters')

train_data = {
    1: {"score": 10, "verdict": "Aggressive / High-Contrast"},
    2: {"score": 9,  "verdict": "Vibrant Pop"},
    3: {"score": 9,  "verdict": "Symmetrical Mystery"},
    4: {"score": 10, "verdict": "Shock Signal"},
    5: {"score": 8,  "verdict": "Grand Scale"},
    6: {"score": 9,  "verdict": "Industrial Grit"},
    7: {"score": 4,  "verdict": "Dull / Passive"},
    8: {"score": 9,  "verdict": "Cold Tension"},
    9: {"score": 10, "verdict": "Surreal Terror"},
    10: {"score": 9, "verdict": "Power Silhouette"},
    11: {"score": 9, "verdict": "Motion Hook"},
    12: {"score": 8, "verdict": "Symmetrical Angst"},
    13: {"score": 8, "verdict": "Dark Mystery"},
    14: {"score": 9, "verdict": "Curiosity Gap"},
    15: {"score": 6, "verdict": "Solid Earthy"},
    16: {"score": 9, "verdict": "Emotion Contrast"},
    17: {"score": 7, "verdict": "Neon Sci-Fi"},
    18: {"score": 9, "verdict": "Bold Typography"},
    19: {"score": 5, "verdict": "Classic Ensemble"},
    20: {"score": 7, "verdict": "Heroic Action"},
    21: {"score": 3, "verdict": "Flat / Poor Hierarchy"},
    22: {"score": 2, "verdict": "Cluttered / Weak Focus"},
    23: {"score": 2, "verdict": "Low Impact / Weak Design"},
    24: {"score": 3, "verdict": "Flat Composition"},
    25: {"score": 1, "verdict": "Very Poor / Scroll Past"},
}

SEED = 42
MODEL_OUT = "three_second_rule.pth"

def seed_all(seed=SEED):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

# ------------------------
# 2) DATASET
# ------------------------
class PosterDataset(Dataset):
    def __init__(self, data_dict, img_dir, transform=None):
        self.transform = transform
        self.samples = []

        for sr_no in data_dict.keys():
            found = False
            for ext in [".jpg", ".jpeg", ".JPG", ".JPEG", ".png"]:
                path = os.path.join(img_dir, f"{sr_no}{ext}")
                if os.path.exists(path):
                    self.samples.append((path, float(data_dict[sr_no]["score"]), sr_no))
                    found = True
                    break
            if not found:
                print(f"⚠️ Warning: Poster {sr_no} not found in {img_dir}. Skipping.")

        if len(self.samples) == 0:
            raise RuntimeError("No images found. Check IMAGE_DIR and filenames.")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, score, sr_no = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        y = torch.tensor([score], dtype=torch.float32)
        return img, y, sr_no

# ------------------------
# 3) TRANSFORMS
# ------------------------
train_tfms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.ColorJitter(brightness=0.10, contrast=0.10, saturation=0.10, hue=0.02),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

eval_tfms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

# ------------------------
# 4) TRAIN UTIL
# ------------------------
def evaluate_on_20(model, dataset, device):
    model.eval()
    loader = DataLoader(dataset, batch_size=4, shuffle=False)
    preds = []
    with torch.no_grad():
        for x, y, sr in loader:
            x = x.to(device)
            out = model(x).cpu().numpy().reshape(-1)
            for o, yy, s in zip(out, y.numpy().reshape(-1), sr.numpy().reshape(-1)):
                # clamp for display
                o_clamped = float(max(1.0, min(10.0, o)))
                preds.append((int(s), float(yy), o_clamped))
    # MAE
    mae = np.mean([abs(t - p) for (_, t, p) in preds])
    # print ranking
    preds_sorted = sorted(preds, key=lambda z: z[2], reverse=True)
    print("\n=== RANKING on your 20 posters (pred high -> best) ===")
    for s, t, p in preds_sorted:
        print(f"Poster {s:02d} | true={t:>4.1f} | pred={p:>5.2f}")
    print(f"MAE on 20 posters: {mae:.3f}\n")
    return mae

# ------------------------
# 5) MAIN TRAIN
# ------------------------
def main():
    seed_all()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    train_ds = PosterDataset(train_data, IMAGE_DIR, transform=train_tfms)
    eval_ds  = PosterDataset(train_data, IMAGE_DIR, transform=eval_tfms)

    train_loader = DataLoader(train_ds, batch_size=4, shuffle=True)

    # IMPORTANT: use pretrained weights consistently
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
    model.fc = nn.Linear(model.fc.in_features, 1)
    model = model.to(device)

    # Phase 1: freeze backbone, train head hard (fast overfit)
    for p in model.parameters():
        p.requires_grad = False
    for p in model.fc.parameters():
        p.requires_grad = True

    criterion = nn.SmoothL1Loss()
    opt = optim.AdamW(model.fc.parameters(), lr=3e-3, weight_decay=0.0)

    print(f"--- Phase 1 (head) on {device} | images: {len(train_ds)} ---")
    best_mae = 1e9

    for epoch in range(1, 61):  # 60 epochs head training
        model.train()
        running = 0.0
        for x, y, _ in train_loader:
            x, y = x.to(device), y.to(device)
            opt.zero_grad(set_to_none=True)
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            opt.step()
            running += loss.item()

        if epoch % 10 == 0:
            print(f"Phase1 Epoch {epoch:03d} | loss={running/len(train_loader):.4f}")
            mae = evaluate_on_20(model, eval_ds, device)
            if mae < best_mae:
                best_mae = mae
                torch.save(model.state_dict(), MODEL_OUT)
                print(f"✅ Saved best -> {MODEL_OUT} (MAE={best_mae:.3f})")

    # Phase 2: unfreeze last block + head, tiny LR fine-tune
    print("--- Phase 2 (last block + head fine-tune) ---")
    for p in model.parameters():
        p.requires_grad = False
    # unfreeze layer4 and fc
    for p in model.layer4.parameters():
        p.requires_grad = True
    for p in model.fc.parameters():
        p.requires_grad = True

    opt2 = optim.AdamW(
        list(model.layer4.parameters()) + list(model.fc.parameters()),
        lr=3e-4,
        weight_decay=1e-5
    )

    for epoch in range(1, 41):  # 40 epochs
        model.train()
        running = 0.0
        for x, y, _ in train_loader:
            x, y = x.to(device), y.to(device)
            opt2.zero_grad(set_to_none=True)
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            opt2.step()
            running += loss.item()

        if epoch % 10 == 0:
            print(f"Phase2 Epoch {epoch:03d} | loss={running/len(train_loader):.4f}")
            mae = evaluate_on_20(model, eval_ds, device)
            if mae < best_mae:
                best_mae = mae
                torch.save(model.state_dict(), MODEL_OUT)
                print(f"✅ Saved best -> {MODEL_OUT} (MAE={best_mae:.3f})")

    print(f"\n--- Done. Best model saved as '{MODEL_OUT}' with MAE={best_mae:.3f} ---")

if __name__ == "__main__":
    main()