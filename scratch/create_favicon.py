import os
from PIL import Image

def generate_perfect_square_favicon(input_path, output_png_path, output_ico_path):
    img = Image.open(input_path).convert("RGBA")
    
    # 1. Obter o bounding box de pixels não transparentes
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
        
    # 2. Criar uma tela perfeitamente quadrada (baseada na maior dimensão + padding)
    max_dim = max(img.width, img.height)
    # Adicionar 10% de padding para que o ícone respire e não fique colado nas bordas do círculo do Google
    padding = int(max_dim * 0.1)
    square_size = max_dim + padding * 2
    
    square_img = Image.new("RGBA", (square_size, square_size), (0, 0, 0, 0))
    
    # Centralizar a imagem na tela quadrada
    offset_x = (square_size - img.width) // 2
    offset_y = (square_size - img.height) // 2
    square_img.paste(img, (offset_x, offset_y))
    
    # 3. Redimensionar para tamanhos padrão
    # Favicon PNG (512x512) para alta resolução e Android
    favicon_512 = square_img.resize((512, 512), Image.Resampling.LANCZOS)
    favicon_512.save(output_png_path, "PNG")
    print(f"Generated perfect square PNG favicon at: {output_png_path} (512x512)")
    
    # Apple Touch Icon (180x180) para iOS
    apple_touch_path = output_png_path.replace("favicon.png", "apple-touch-icon.png")
    favicon_180 = square_img.resize((180, 180), Image.Resampling.LANCZOS)
    favicon_180.save(apple_touch_path, "PNG")
    print(f"Generated Apple Touch Icon at: {apple_touch_path} (180x180)")

    # Favicon ICO (48x48, 32x32, 16x16) para navegadores antigos e suporte nativo desktop
    favicon_ico_sizes = [(16, 16), (32, 32), (48, 48)]
    square_img.save(output_ico_path, format="ICO", sizes=favicon_ico_sizes)
    print(f"Generated multi-size ICO favicon at: {output_ico_path}")

input_logo = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public\logo_kadosh_transparent.png"
public_dir = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public"

generate_perfect_square_favicon(
    input_logo,
    os.path.join(public_dir, "favicon.png"),
    os.path.join(public_dir, "favicon.ico")
)
