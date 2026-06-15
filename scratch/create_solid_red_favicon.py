import os
from PIL import Image

def generate_solid_red_favicon(logo_path, output_png_path, output_ico_path):
    # Carregar o logo transparente
    logo = Image.open(logo_path).convert("RGBA")
    
    # Cortar as bordas transparentes para garantir centralização perfeita
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
        
    # Definir o tamanho final quadrado do favicon
    target_size = 512
    
    # Definir a cor sólida do fundo (Vermelho Escuro/Vinho do print: #5c0303 ou #4e0404)
    # Vamos usar exatamente #5c0303 que é um tom de vinho rico, combinando com o tema Kadosh
    bg_color = (92, 3, 3, 255) # #5c0303
    
    # Criar a tela quadrada preenchida com a cor sólida
    bg_img = Image.new("RGBA", (target_size, target_size), bg_color)
    
    # Redimensionar o logo para caber no favicon com uma boa margem (padding de 12%)
    padding = int(target_size * 0.12)
    max_logo_size = target_size - padding * 2
    
    # Manter a proporção do logo ao redimensionar
    ratio = min(max_logo_size / logo.width, max_logo_size / logo.height)
    new_width = int(logo.width * ratio)
    new_height = int(logo.height * ratio)
    
    logo_resized = logo.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Calcular coordenadas para centralizar o logo no fundo vermelho
    offset_x = (target_size - new_width) // 2
    offset_y = (target_size - new_height) // 2
    
    # Colar o logo por cima da cor sólida usando o canal alpha como máscara
    bg_img.alpha_composite(logo_resized, (offset_x, offset_y))
    
    # Salvar em formato PNG (512x512)
    bg_img.save(output_png_path, "PNG")
    print(f"Generated solid red favicon at: {output_png_path} (512x512)")
    
    # Apple Touch Icon (180x180)
    apple_touch_path = output_png_path.replace("favicon.png", "apple-touch-icon.png")
    favicon_180 = bg_img.resize((180, 180), Image.Resampling.LANCZOS)
    favicon_180.save(apple_touch_path, "PNG")
    print(f"Generated solid red Apple Touch Icon at: {apple_touch_path} (180x180)")

    # Favicon ICO (48x48, 32x32, 16x16)
    favicon_ico_sizes = [(16, 16), (32, 32), (48, 48)]
    bg_img.save(output_ico_path, format="ICO", sizes=favicon_ico_sizes)
    print(f"Generated solid red multi-size ICO favicon at: {output_ico_path}")

logo_path = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public\logo_kadosh_transparent.png"
public_dir = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public"

generate_solid_red_favicon(
    logo_path,
    os.path.join(public_dir, "favicon.png"),
    os.path.join(public_dir, "favicon.ico")
)
