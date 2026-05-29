import os
from PIL import Image

logo_path = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public\logo_kadosh.jpg"
img = Image.open(logo_path).convert("RGBA")
datas = img.load()

# Vamos ver as cores dos cantos para detectar a cor de fundo original
width, height = img.size
corners = [datas[0, 0], datas[width-1, 0], datas[0, height-1], datas[width-1, height-1]]
print("Corner pixels:", corners)

# Contar pixels brilhantes (perto de branco) vs pixels escuros (perto de preto)
bright = 0
dark = 0
for y in range(height):
    for x in range(width):
        r, g, b, a = datas[x, y]
        brightness = (r + g + b) / 3
        if brightness > 200:
            bright += 1
        elif brightness < 50:
            dark += 1

print(f"Total pixels: {width*height}, Bright pixels: {bright}, Dark pixels: {dark}")
