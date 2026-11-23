#!/usr/bin/env python3
"""Hero gallery: re-encode photos from the user's existing slides archive as AVIF.

Desktop keeps the 16:10 frame; phone gets a 2:3 portrait crop around a chosen
focal point. A slight exposure reduction keeps white Hero type readable on
bright daylight frames without a runtime CSS filter. Requires local FFmpeg
with libsvtav1. No installs.
"""
import pathlib, subprocess, sys

root = pathlib.Path(__file__).resolve().parent.parent
assets = root / 'showcase/assets'
out = assets / 'hero-gallery'
out.mkdir(parents=True, exist_ok=True)
# id: (source relative to showcase/assets, horizontal focal point 0..1 for the phone crop[, bottom fraction to trim]).
# Ids match the picker at /preview/hero-photos (showcase/preview/hero-photos.html).
catalog = {
    'evening-villa-terrace': ('spain-villa-desktop.avif', .55),
    'marbella-travertine-villa': ('slides/villa-marbella-modern.webp', .42),
    'marbella-sea-terrace': ('slides/villa-marbella-terrace.webp', .5),
    'marbella-infinity-villa': ('slides/01-marbella-modern-infinity-villa.webp', .5),
    'marbella-garden-terraces': ('slides/penthouse-marbella-duplex.webp', .5),
    'fuengirola-sea-penthouse': ('slides/penthouse-fuengirola-sea.webp', .62),
    'video-sunset-pool-villa': ('sequence/poster.jpg', .4),
    'video-evening-pool-villa': ('cinema-main/poster.jpg', .5, .05),  # dark deck edge baked into the frame
    'video-sea-terrace': ('sequence/terrace.jpg', .55),
    'video-sea-living': ('sequence/first.jpg', .45),
    'video-sea-bedroom': ('sequence/interior.jpg', .45),
    'costa-del-sol-white-villa': ('slides/02-costa-del-sol-sunset-residence.webp', .45),
    'golden-mile-pool-villa': ('slides/05-marbella-golden-mile-villa.webp', .55),
    'fuengirola-white-apartments': ('slides/10-fuengirola-seafront-penthouse-terrace.webp', .45),
    'marbella-townhouses': ('slides/townhouse-marbella-luxury.webp', .4),
    'alicante-residential-pool': ('slides/villa-alicante-pool.webp', .4),
    'dusk-modern-house': ('slides/07-benahavis-mountain-sea-mansion.webp', .5),
    'forest-dark-house': ('slides/04-ibiza-travertine-minimalist-villa.webp', .55),
    'interior-living-room': ('slides/06-altea-mediterranean-waterfront-estate.webp', .5),
    'interior-pool-lounge': ('slides/08-mediterranean-indoor-outdoor-lounge.webp', .5),
    'interior-dining': ('slides/09-sotogrande-architectural-water-villa.webp', .4),
    'interior-bedroom': ('slides/03-mallorca-cliffside-penthouse-terrace.webp', .5),
}
# Usage: encode-hero-gallery.py [id ...]  (default: the original five gallery photos)
requested = sys.argv[1:] or ['marbella-travertine-villa', 'marbella-sea-terrace', 'marbella-infinity-villa', 'marbella-garden-terraces', 'fuengirola-sea-penthouse']
unknown = [name for name in requested if name not in catalog]
if unknown:
    sys.exit(f'unknown photo ids: {unknown}')
photos = {name: catalog[name] for name in requested}
tone = 'eq=brightness=-0.035:gamma=0.9:saturation=0.97'
for name, (file, focal, *rest) in photos.items():
    src = assets / file
    trim = f'crop=iw:ih*{1 - rest[0]}:0:0,' if rest else ''
    jobs = {
        'desktop': f'{trim}scale=1920:1200:force_original_aspect_ratio=increase,crop=1920:1200,{tone}',
        # 2:3 portrait from the full height, clamped inside the frame.
        'mobile': f"{trim}scale=-2:1200,crop=800:1200:'max(0,min(iw-800,iw*{focal}-400))':0,{tone}",
    }
    for tier, vf in jobs.items():
        target = out / f'{name}-{tier}.avif'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-vf', vf, '-frames:v', '1',
                        '-flags', '+global_header', '-c:v', 'libsvtav1', '-crf', '32' if tier == 'desktop' else '30',
                        '-preset', '6', '-svtav1-params', 'tune=0', '-pix_fmt', 'yuv420p', '-f', 'avif', str(target)], check=True)
        print(target.name, target.stat().st_size)
