#!/usr/bin/env python3
"""Hero gallery: re-encode photos from the user's existing slides archive as AVIF.

Desktop keeps the 16:10 frame; phone gets a 2:3 portrait crop around a chosen
focal point. A slight exposure reduction keeps white Hero type readable on
bright daylight frames without a runtime CSS filter. Requires local FFmpeg
with libsvtav1. No installs.
"""
import pathlib, subprocess

root = pathlib.Path(__file__).resolve().parent.parent
source = root / 'showcase/assets/slides'
out = root / 'showcase/assets/hero-gallery'
out.mkdir(parents=True, exist_ok=True)
# name: (source file, horizontal focal point 0..1 for the phone crop)
photos = {
    'marbella-travertine-villa': ('villa-marbella-modern.webp', .42),
    'marbella-sea-terrace': ('villa-marbella-terrace.webp', .5),
    'marbella-infinity-villa': ('01-marbella-modern-infinity-villa.webp', .5),
    'marbella-garden-terraces': ('penthouse-marbella-duplex.webp', .5),
    'fuengirola-sea-penthouse': ('penthouse-fuengirola-sea.webp', .62),
}
tone = 'eq=brightness=-0.035:gamma=0.9:saturation=0.97'
for name, (file, focal) in photos.items():
    src = source / file
    jobs = {
        'desktop': f'scale=1920:1200:force_original_aspect_ratio=increase,crop=1920:1200,{tone}',
        # 2:3 portrait from the full height, clamped inside the frame.
        'mobile': f"scale=-2:1200,crop=800:1200:'max(0,min(iw-800,iw*{focal}-400))':0,{tone}",
    }
    for tier, vf in jobs.items():
        target = out / f'{name}-{tier}.avif'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-vf', vf, '-frames:v', '1',
                        '-flags', '+global_header', '-c:v', 'libsvtav1', '-crf', '32' if tier == 'desktop' else '30',
                        '-preset', '6', '-svtav1-params', 'tune=0', '-pix_fmt', 'yuv420p', '-f', 'avif', str(target)], check=True)
        print(target.name, target.stat().st_size)
