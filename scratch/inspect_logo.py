import os
from PIL import Image

logo_path = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public\logo_kadosh.jpg"
if os.path.exists(logo_path):
    img = Image.open(logo_path)
    print(f"Original Logo Size: {img.size}, Mode: {img.mode}")
else:
    print("logo_kadosh.jpg not found!")
