import os
import streamlit as st
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

# --- 1) MODEL CONFIGURATION ---
class ThreeSecondModel:
    def __init__(self, model_path="three_second_rule.pth"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # IMPORTANT: same pretrained weights as training
        self.model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        self.model.fc = nn.Linear(self.model.fc.in_features, 1)

        if os.path.exists(model_path):
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        else:
            st.warning(f"Model file not found: {model_path}")

        self.model.to(self.device)
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

    def predict(self, image):
        img_t = self.transform(image).unsqueeze(0).to(self.device)
        with torch.no_grad():
            score = float(self.model(img_t).item())
        return max(1.0, min(10.0, score))

def get_verdict(score: float):
    if score >= 8.5:
        return ("🔥 **VERDICT: HOOKED**",
                "This poster has high stopping power and will likely stop a user from scrolling.")
    elif score >= 6.5:
        return ("⚠️ **VERDICT: AVERAGE**",
                "Decent visual, but may need stronger hierarchy (title/face/contrast) to stand out.")
    else:
        return ("❄️ **VERDICT: BOUNCED**",
                "Too dull or cluttered; users may scroll past quickly.")

# --- 2) STREAMLIT UI ---
st.set_page_config(page_title="Cinema Oracle: 3-Second Rule", layout="centered")

st.title("🎬 Cinema Oracle")
st.subheader("The 3-Second Rule Predictor")
st.write("Upload a movie poster to analyze its 'Stopping Power' in digital feeds.")

predictor = ThreeSecondModel()

uploaded_file = st.file_uploader("Choose a poster image...", type=["jpg", "jpeg", "png"])

if uploaded_file is not None:
    image = Image.open(uploaded_file).convert("RGB")

    col1, col2 = st.columns([1, 1])

    with col1:
        st.image(image, caption="Uploaded Poster", use_container_width=True)

    with col2:
        with st.spinner("Analyzing..."):
            score = predictor.predict(image)
            st.metric(label="3-Second Hook Score", value=f"{score:.2f} / 10")

            title, msg = get_verdict(score)
            if score >= 8.5:
                st.success(title)
            elif score >= 6.5:
                st.warning(title)
            else:
                st.error(title)
            st.write(msg)

    st.progress(score / 10)