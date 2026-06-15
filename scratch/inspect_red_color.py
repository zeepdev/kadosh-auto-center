import os
from PIL import Image

path = r"C:\Users\isaqu\.gemini\antigravity\brain\cd836f42-8419-470e-a68f-1702be33702a\media__1781537328560.png"
if os.path.exists(path):
    img = Image.open(path).convert("RGBA")
    datas = img.load()
    width, height = img.size
    print(f"Corners: (0,0): {datas[0,0]}, (w-1,0): {datas[width-1, 0]}, (0, h-1): {datas[0, height-1]}")
    # Vamos encontrar a cor predominante que é o fundo
    colors = {}
    for y in range(height):
        for x in range(width):
            c = datas[x, y]
            # Usar apenas RGB para contar
            rgb = c[:3]
            colors[rgb] = colors.get(rgb, 0) + 1
    # Mostrar as 5 cores mais comuns
    sorted_colors = sorted(colors.items(), key=lambda x: x[1], reverse=True)
    print("Top 5 colors:")
    for c, count in sorted_colors[:5]:
        print(f"Color: {c}, Hex: #{c[0]:02x}{c[1]:02x}{c[2]:02x}, Count: {count}")
else:
    print("File not found!")
