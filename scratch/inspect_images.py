import os
from PIL import Image

brain_dir = r"C:\Users\isaqu\.gemini\antigravity\brain\cd836f42-8419-470e-a68f-1702be33702a"
files = ["media__1780079825313.png", "media__1780079982267.png"]

for f in files:
    path = os.path.join(brain_dir, f)
    if os.path.exists(path):
        img = Image.open(path)
        print(f"File: {f}, Size: {img.size}, Mode: {img.mode}")
    else:
        print(f"File {f} not found!")
