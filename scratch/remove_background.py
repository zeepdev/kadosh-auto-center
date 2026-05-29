import os
from PIL import Image

def make_transparent(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.load() # load() is faster than getdata()

    width, height = img.size
    
    # 1. Aplicar a transparência com base no luma key
    for y in range(height):
        for x in range(width):
            r, g, b, a = datas[x, y]
            brightness = 0.299 * r + 0.587 * g + 0.114 * b
            
            # Se o pixel for escuro (fundo), torna-o completamente transparente
            if brightness < 60:
                datas[x, y] = (0, 0, 0, 0)
            elif brightness < 100:
                # Suavização das bordas
                alpha = int((brightness - 60) * (255 / 40))
                datas[x, y] = (r, g, b, min(a, alpha))

    # 2. Cortar a imagem para o bounding box de pixels não-transparentes
    bbox = img.getbbox()
    if bbox:
        img_cropped = img.crop(bbox)
        # Adicionar uma pequena margem (padding de 5px) para não cortar muito seco
        padding = 5
        padded_width = img_cropped.width + padding * 2
        padded_height = img_cropped.height + padding * 2
        padded_img = Image.new("RGBA", (padded_width, padded_height), (0, 0, 0, 0))
        padded_img.paste(img_cropped, (padding, padding))
        padded_img.save(output_path, "PNG")
        print(f"Saved cropped & transparent image to: {output_path} (size: {padded_img.size})")
    else:
        img.save(output_path, "PNG")
        print(f"Saved transparent image to: {output_path} (no bbox found)")

brain_dir = r"C:\Users\isaqu\.gemini\antigravity\brain\cd836f42-8419-470e-a68f-1702be33702a"
output_dir = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public"

# Processar o logo quadrado
make_transparent(
    os.path.join(brain_dir, "media__1780079982267.png"),
    os.path.join(output_dir, "logo_kadosh_transparent.png")
)

# Processar o banner horizontal
make_transparent(
    os.path.join(brain_dir, "media__1780079825313.png"),
    os.path.join(output_dir, "logo_kadosh_horizontal.png")
)
