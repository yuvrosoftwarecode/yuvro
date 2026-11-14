import math
import os
import io
import random
from PIL import Image, ImageDraw, ImageFont

def generate_celebration_gif(
    name: str = "Student",
    task: str = "Payment retry logic",
    company: str = "MySQL Lab",
    badge: str = "TICKET CLEARED",
    logo_path: str = None,
    output_fps: int = 15,
    duration_sec: float = 1.6,
) -> bytes:
    """
    Renders an animated GIF matching the Yuvro Achievement Celebration HTML design.
    - Card size: 800 x 418
    - Rotating sunburst rays
    - Animated confetti
    - Pulsing pill
    - Student name, task, and lab footer
    """
    width = 800
    height = 418
    total_frames = int(output_fps * duration_sec)

    # Load logo if available
    if not logo_path or not os.path.exists(logo_path):
        candidate_logo = os.path.join(os.path.dirname(__file__), "logo.png")
        if os.path.exists(candidate_logo):
            logo_path = candidate_logo

    logo_img = None
    if logo_path and os.path.exists(logo_path):
        try:
            raw_logo = Image.open(logo_path).convert("RGBA")
            # Resize proportionally to ~52x52 for clearer presence
            raw_logo.thumbnail((52, 52), Image.Resampling.LANCZOS)
            logo_img = raw_logo
        except Exception as e:
            print("Failed to load logo:", e)

    # Fonts resolution
    fonts_dir = os.path.join(os.path.dirname(__file__), "fonts")
    
    def get_font(size: int, weight: str = "bold"):
        candidates = []
        if weight == "extrabold":
            candidates.extend([
                os.path.join(fonts_dir, "Poppins-ExtraBold.ttf"),
                os.path.join(fonts_dir, "Poppins-Bold.ttf"),
                os.path.join(fonts_dir, "arialbd.ttf"),
                "C:\\Windows\\Fonts\\arialbd.ttf",
            ])
        elif weight == "semibold":
            candidates.extend([
                os.path.join(fonts_dir, "Poppins-SemiBold.ttf"),
                os.path.join(fonts_dir, "Poppins-Bold.ttf"),
                os.path.join(fonts_dir, "seguisb.ttf"),
                os.path.join(fonts_dir, "arialbd.ttf"),
                "C:\\Windows\\Fonts\\seguisb.ttf",
            ])
        else: # bold
            candidates.extend([
                os.path.join(fonts_dir, "Poppins-Bold.ttf"),
                os.path.join(fonts_dir, "Poppins-SemiBold.ttf"),
                os.path.join(fonts_dir, "arialbd.ttf"),
                "C:\\Windows\\Fonts\\arialbd.ttf",
            ])

        for fn in candidates:
            if os.path.exists(fn):
                try:
                    return ImageFont.truetype(fn, size)
                except Exception:
                    pass
        return ImageFont.load_default()

    font_brand = get_font(38, weight="bold")
    font_pill = get_font(18, weight="bold")
    font_headline = get_font(60, weight="extrabold")
    font_task = get_font(28, weight="bold")
    font_footer = get_font(14, weight="semibold")

    # Confetti setup (deterministic seed for smooth loop)
    random.seed(42)
    confetti_colors = [
        (245, 166, 58),   # #f5a63a
        (201, 166, 107),  # #c9a66b
        (140, 123, 102),  # #8c7b66
        (255, 217, 138),  # #ffd98a
        (232, 134, 26),   # #e8861a
        (185, 176, 162),  # #b9b0a2
        (255, 255, 255),  # sparkle white
    ]
    confetti_bits = []
    # 65 confetti pieces matching HTML kind: 0=rect, 1=circle, 2=star, 3=triangle
    for _ in range(65):
        kind = random.choice(["rect", "circle", "star", "triangle"])
        confetti_bits.append({
            "x": random.uniform(15, width - 15),
            "start_y": random.uniform(-40, height),
            "speed": random.uniform(160, 320),
            "size": random.uniform(6, 16),
            "color": random.choice(confetti_colors),
            "kind": kind,
            "rot_offset": random.uniform(0, 2 * math.pi),
            "rot_speed": random.uniform(1.5, 4.5),
            "opacity": random.uniform(0.65, 0.95),
        })

    def draw_star(draw_ctx, cx, cy, r_outer, r_inner, color, rot_angle=0.0):
        points = []
        for i in range(10):
            r = r_outer if i % 2 == 0 else r_inner
            angle = rot_angle + i * math.pi / 5 - math.pi / 2
            points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
        draw_ctx.polygon(points, fill=color)

    def draw_rotated_rect(draw_ctx, cx, cy, rw, rh, color, rot_angle=0.0):
        cos_a = math.cos(rot_angle)
        sin_a = math.sin(rot_angle)
        corners = [(-rw / 2, -rh / 2), (rw / 2, -rh / 2), (rw / 2, rh / 2), (-rw / 2, rh / 2)]
        poly = [(cx + x * cos_a - y * sin_a, cy + x * sin_a + y * cos_a) for x, y in corners]
        draw_ctx.polygon(poly, fill=color)

    def draw_triangle(draw_ctx, cx, cy, s, color, rot_angle=0.0):
        cos_a = math.cos(rot_angle)
        sin_a = math.sin(rot_angle)
        h = s * math.sqrt(3) / 2
        pts = [(0, -h * 2 / 3), (-s / 2, h / 3), (s / 2, h / 3)]
        poly = [(cx + x * cos_a - y * sin_a, cy + x * sin_a + y * cos_a) for x, y in pts]
        draw_ctx.polygon(poly, fill=color)

    # Pre-render base background gradient
    base_bg = Image.new("RGBA", (width, height))
    bg_draw = ImageDraw.Draw(base_bg)
    center_x, center_y = width // 2, height // 2
    max_radius = int(math.hypot(center_x, center_y))

    c_center = (255, 246, 230)
    c_mid = (253, 227, 184)
    c_edge = (249, 209, 149)

    for r in range(max_radius, 0, -3):
        t = r / max_radius
        if t < 0.7:
            alpha = t / 0.7
            color = (
                int(c_center[0] * (1 - alpha) + c_mid[0] * alpha),
                int(c_center[1] * (1 - alpha) + c_mid[1] * alpha),
                int(c_center[2] * (1 - alpha) + c_mid[2] * alpha),
                255
            )
        else:
            alpha = (t - 0.7) / 0.3
            color = (
                int(c_mid[0] * (1 - alpha) + c_edge[0] * alpha),
                int(c_mid[1] * (1 - alpha) + c_edge[1] * alpha),
                int(c_mid[2] * (1 - alpha) + c_edge[2] * alpha),
                255
            )
        bg_draw.ellipse(
            [center_x - r, center_y - r, center_x + r, center_y + r],
            fill=color
        )

    frames = []

    for f in range(total_frames):
        time_sec = f / output_fps
        frame = base_bg.copy()
        draw = ImageDraw.Draw(frame)

        # 1. Rotating Sunburst Rays
        ray_angle_offset = (time_sec / 12.0) * (2 * math.pi)  # full rotation
        ray_count = 18
        ray_radius = 650
        ray_color = (255, 255, 255, 45)

        rays_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        rays_draw = ImageDraw.Draw(rays_img)
        for i in range(ray_count):
            angle1 = ray_angle_offset + (i * 2 * math.pi / ray_count)
            angle2 = angle1 + (math.pi / ray_count)
            p1 = (center_x, center_y)
            p2 = (center_x + ray_radius * math.cos(angle1), center_y + ray_radius * math.sin(angle1))
            p3 = (center_x + ray_radius * math.cos(angle2), center_y + ray_radius * math.sin(angle2))
            rays_draw.polygon([p1, p2, p3], fill=ray_color)
        frame = Image.alpha_composite(frame, rays_img)
        draw = ImageDraw.Draw(frame)

        # 2. Confetti Bits (Rectangles, Circles, Stars, Triangles)
        for bit in confetti_bits:
            y = (bit["start_y"] + bit["speed"] * time_sec) % (height + 50) - 25
            x = bit["x"]
            alpha = int(255 * bit["opacity"])
            color = bit["color"] + (alpha,)
            sz = bit["size"]
            rot = bit["rot_offset"] + bit["rot_speed"] * time_sec

            if bit["kind"] == "circle":
                draw.ellipse([x - sz / 2, y - sz / 2, x + sz / 2, y + sz / 2], fill=color)
            elif bit["kind"] == "star":
                draw_star(draw, x, y, r_outer=sz * 0.9, r_inner=sz * 0.42, color=color, rot_angle=rot)
            elif bit["kind"] == "triangle":
                draw_triangle(draw, x, y, s=sz * 1.1, color=color, rot_angle=rot)
            else:  # rect
                draw_rotated_rect(draw, x, y, rw=sz * 1.5, rh=sz * 0.6, color=color, rot_angle=rot)

        # 3. Logo & Brand (Centered horizontally above pill)
        top_y = 20
        logo_w = logo_img.width if logo_img else 50
        brand_text = "Yuvro"
        b_bbox = font_brand.getbbox(brand_text)
        b_w = b_bbox[2] - b_bbox[0]
        spacing = 12
        total_brand_w = logo_w + spacing + b_w
        start_brand_x = (width - total_brand_w) // 2

        if logo_img:
            frame.paste(logo_img, (int(start_brand_x), int(top_y)), logo_img)
        draw.text(
            (start_brand_x + logo_w + spacing, top_y + 4),
            brand_text,
            font=font_brand,
            fill=(28, 18, 8, 255)
        )

        # 4. Pill (Badge: "TICKET CLEARED" / "LAB COMPLETED" / "SPRINT COMPLETED")
        pill_text = (badge or "TICKET CLEARED").strip().upper()
        p_bbox = font_pill.getbbox(pill_text)
        p_text_w = p_bbox[2] - p_bbox[0]
        p_text_h = p_bbox[3] - p_bbox[1]

        tick_d = 24
        pill_w = max(240, tick_d + 12 + p_text_w + 32)
        pill_h = 42
        pill_x1 = (width - pill_w) / 2
        pill_y1 = 88
        pill_x2 = pill_x1 + pill_w
        pill_y2 = pill_y1 + pill_h

        # Pill background (orange)
        draw.rounded_rectangle([pill_x1, pill_y1, pill_x2, pill_y2], radius=int(pill_h / 2), fill=(245, 154, 35, 255))

        # Checkmark white circle inside pill
        tick_x = pill_x1 + 11
        tick_y = pill_y1 + (pill_h - tick_d) / 2
        draw.ellipse([tick_x, tick_y, tick_x + tick_d, tick_y + tick_d], fill=(255, 255, 255, 255))
        # Draw checkmark inside circle
        draw.line([tick_x + 7, tick_y + 12, tick_x + 10, tick_y + 16], fill=(245, 154, 35, 255), width=3)
        draw.line([tick_x + 10, tick_y + 16, tick_x + 17, tick_y + 8], fill=(245, 154, 35, 255), width=3)

        # Draw Pill text
        draw.text(
            (tick_x + tick_d + 12, pill_y1 + (pill_h - p_text_h) / 2 - 2),
            pill_text,
            font=font_pill,
            fill=(255, 255, 255, 255)
        )

        # 5. Headline ("{name} shipped") - Increased size & ExtraBold
        curr_font_headline = font_headline
        headline_text = f"{name} shipped"
        h_bbox = curr_font_headline.getbbox(headline_text)
        h_w = h_bbox[2] - h_bbox[0]
        if h_w > (width - 60):
            scale_sz = max(32, int(60 * ((width - 60) / h_w)))
            curr_font_headline = get_font(scale_sz, weight="extrabold")
            h_bbox = curr_font_headline.getbbox(headline_text)
            h_w = h_bbox[2] - h_bbox[0]

        draw.text(
            ((width - h_w) // 2, 148),
            headline_text,
            font=curr_font_headline,
            fill=(28, 18, 8, 255)
        )

        # 6. Ticket / Task Box (Moved down slightly to y=254, rounded rectangle radius=18px matching reference)
        task_text = task
        curr_font_task = font_task
        t_bbox = curr_font_task.getbbox(task_text)
        t_w = t_bbox[2] - t_bbox[0]
        t_h = t_bbox[3] - t_bbox[1]

        if t_w > (width - 120):
            scale_task_sz = max(18, int(28 * ((width - 120) / t_w)))
            curr_font_task = get_font(scale_task_sz, weight="bold")
            t_bbox = curr_font_task.getbbox(task_text)
            t_w = t_bbox[2] - t_bbox[0]
            t_h = t_bbox[3] - t_bbox[1]

        # Sizing matching target: rounded box with radius 18, 62px high, moved lower
        box_padding_x = 44
        task_box_h = 62
        task_box_w = max(360, t_w + box_padding_x * 2)
        task_box_x = (width - task_box_w) // 2
        task_box_y = 254

        draw.rounded_rectangle(
            [task_box_x, task_box_y, task_box_x + task_box_w, task_box_y + task_box_h],
            radius=18,
            fill=(255, 255, 255, 255),
            outline=(245, 154, 35, 255),
            width=3
        )
        draw.text(
            (task_box_x + (task_box_w - t_w) // 2, task_box_y + (task_box_h - t_h) // 2 - 2),
            task_text,
            font=curr_font_task,
            fill=(28, 18, 8, 255)
        )

        # 7. Footer ("{company}")
        footer_text = company if company else "Yuvro Labs"
        f_bbox = font_footer.getbbox(footer_text)
        f_w = f_bbox[2] - f_bbox[0]
        draw.text(
            ((width - f_w) // 2, height - 26),
            footer_text,
            font=font_footer,
            fill=(74, 58, 38, 255)
        )

        # Convert to P-mode with adaptive palette for crisp GIF output
        frame_rgb = frame.convert("RGB")
        frame_p = frame_rgb.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
        frames.append(frame_p)

    out = io.BytesIO()
    frames[0].save(
        out,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=int(1000 / output_fps),
        loop=0,
        optimize=True,
    )
    return out.getvalue()
