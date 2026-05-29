import os
from PIL import Image

def make_original_logo_transparent(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    datas = img.load()

    width, height = img.size
    
    # 1. Aplicar a transparência com base no luma key no logo original
    for y in range(height):
        for x in range(width):
            r, g, b, a = datas[x, y]
            brightness = 0.299 * r + 0.587 * g + 0.114 * b
            
            # O fundo original é composto por gradiente escuro de vermelho/preto
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
        # Adicionar uma pequena margem (padding de 8px) para ficar com bom espaçamento
        padding = 8
        padded_width = img_cropped.width + padding * 2
        padded_height = img_cropped.height + padding * 2
        padded_img = Image.new("RGBA", (padded_width, padded_height), (0, 0, 0, 0))
        padded_img.paste(img_cropped, (padding, padding))
        padded_img.save(output_path, "PNG")
        print(f"Saved cropped & transparent ORIGINAL logo to: {output_path} (size: {padded_img.size})")
    else:
        img.save(output_path, "PNG")
        print(f"Saved transparent original logo (no bbox found) to: {output_path}")

input_logo = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public\logo_kadosh.jpg"
output_logo = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public\logo_kadosh_transparent.png"

make_original_logo_transparent(input_logo, output_logo)
