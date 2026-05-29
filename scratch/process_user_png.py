import os
from PIL import Image

def process_and_crop_user_png(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    
    # Cortar a imagem para o bounding box de pixels não-transparentes
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
        print(f"Saved cropped user transparent PNG to: {output_path} (size: {padded_img.size})")
    else:
        img.save(output_path, "PNG")
        print(f"Saved user transparent PNG (no bbox found) to: {output_path}")

input_logo = r"C:\Users\isaqu\.gemini\antigravity\brain\cd836f42-8419-470e-a68f-1702be33702a\media__1780083096171.png"
output_logo = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public\logo_kadosh_transparent.png"

process_and_crop_user_png(input_logo, output_logo)
