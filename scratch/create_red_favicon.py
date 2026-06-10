import os
from PIL import Image

def generate_red_favicon(input_path, output_png_path, output_ico_path):
    img = Image.open(input_path).convert("RGBA")
    
    # Como é o logo original com fundo gradiente vermelho/preto, ele já é praticamente quadrado (320x320).
    # Vamos apenas redimensioná-lo para os formatos do favicon.
    
    # Favicon PNG (512x512)
    favicon_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    favicon_512.save(output_png_path, "PNG")
    print(f"Generated red background PNG favicon at: {output_png_path} (512x512)")
    
    # Apple Touch Icon (180x180)
    apple_touch_path = output_png_path.replace("favicon.png", "apple-touch-icon.png")
    favicon_180 = img.resize((180, 180), Image.Resampling.LANCZOS)
    favicon_180.save(apple_touch_path, "PNG")
    print(f"Generated red background Apple Touch Icon at: {apple_touch_path} (180x180)")

    # Favicon ICO (48x48, 32x32, 16x16)
    favicon_ico_sizes = [(16, 16), (32, 32), (48, 48)]
    img.save(output_ico_path, format="ICO", sizes=favicon_ico_sizes)
    print(f"Generated red background multi-size ICO favicon at: {output_ico_path}")

input_logo = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public\logo_kadosh.jpg"
public_dir = r"c:\Users\isaqu\Desktop\automacao\oficina-kadosh\frontend\public"

generate_red_favicon(
    input_logo,
    os.path.join(public_dir, "favicon.png"),
    os.path.join(public_dir, "favicon.ico")
)
