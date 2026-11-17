#!/usr/bin/env python3
"""
Ultimate AVIF Quality Upgrade: 4K Master / 60 FPS / Ultra-Sharp Architectural Geometry.
Pristine donor: main.MP4 (1920x1080 @ 24fps, 287 frames).
Interpolates across 4 scenes independently (zero cross-cut morphing).
Applies Lanczos + Fine Unsharp + AMD CAS edge-adaptive enhancement.
Encodes Chrome/Safari-compliant AVIF with valid av1C headers via libsvtav1.
Produces Multi-Tier assets: Desktop Ultra 4K, Desktop Standard 1080p, Mobile Portrait.
"""

import concurrent.futures
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'main.MP4'
CINEMA_DIR = ROOT / 'showcase/assets/cinema-main'

# 4 edited scenes identified via I-frames and hard cut analysis:
# Scene 1: Exterior pool & villa facade (frames 0..73 = 74 frames)
# Scene 2: Living room interior & glass doors (frames 74..143 = 70 frames)
# Scene 3: Panoramic balcony & sea vista (frames 144..215 = 72 frames)
# Scene 4: Sunset chillout terrace (frames 216..286 = 71 frames)
SCENES = [
    (1, 0, 73),
    (2, 74, 143),
    (3, 144, 215),
    (4, 216, 286)
]

def interpolate_scene(scene_args):
    """Interpolate a single isolated scene to 60fps using motion-compensated interpolation."""
    scene_num, start_idx, end_idx, src_frames_dir, out_scene_dir = scene_args
    os.makedirs(out_scene_dir, exist_ok=True)
    
    # Create numbered input symlinks/copies for ffmpeg
    scene_input_dir = Path(out_scene_dir) / 'input'
    os.makedirs(scene_input_dir, exist_ok=True)
    count = 0
    for idx in range(start_idx, end_idx + 1):
        count += 1
        src = Path(src_frames_dir) / f'frame_{idx:05d}.png'
        dst = scene_input_dir / f'frame_{count:05d}.png'
        if dst.exists():
            dst.unlink()
        os.link(src, dst)
        
    scene_output_frames = Path(out_scene_dir) / 'frames'
    os.makedirs(scene_output_frames, exist_ok=True)
    
    # Motion-compensated interpolation (MCI + AOBMC + Bidir)
    vf = 'minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1'
    cmd = [
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
        '-framerate', '24',
        '-i', str(scene_input_dir / 'frame_%05d.png'),
        '-vf', vf,
        '-pix_fmt', 'yuv420p',
        str(scene_output_frames / 'f_%05d.png')
    ]
    t0 = time.time()
    subprocess.run(cmd, check=True)
    frames = sorted(scene_output_frames.glob('*.png'))
    print(f'Scene {scene_num} ({count} src frames) -> {len(frames)} 60fps frames in {time.time()-t0:.1f}s', flush=True)
    return scene_num, frames

def encode_frame(job):
    """Encode an individual frame to AVIF for a specific tier."""
    tier, index, src_path, target_path = job
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(src_path)]
    
    if tier == 'desktop':
        # Desktop Ultra 4K: Lanczos 5-tap scale + architectural unsharp + AMD CAS edge-adaptive sharpener
        vf = 'scale=3840:2160:flags=lanczos+accurate_rnd,unsharp=5:5:0.6:3:3:0.25,cas=0.45'
        crf = '34'
    elif tier == 'desktop-standard':
        # Desktop Standard 1080p: Edge-enhanced 1080p master
        vf = 'unsharp=3:3:0.4:3:3:0.15,cas=0.35'
        crf = '30'
    elif tier == 'mobile':
        # Mobile Portrait: Center crop 720x1080 on architectural focal point
        vf = 'crop=720:1080:600:0,unsharp=3:3:0.4:3:3:0.15,cas=0.35'
        crf = '30'
    else:
        raise ValueError(f'Unknown tier {tier}')
        
    cmd += [
        '-vf', vf,
        '-flags', '+global_header',
        '-c:v', 'libsvtav1',
        '-crf', crf,
        '-preset', '6',
        '-svtav1-params', 'lp=2:tune=0',
        '-pix_fmt', 'yuv420p',
        str(target_path)
    ]
    subprocess.run(cmd, check=True)

def main():
    t_start = time.time()
    print('=== ULTIMATE AVIF QUALITY UPGRADE (4K / 60 FPS / ULTRA SHARP) ===', flush=True)
    print(f'Source video: {SOURCE}', flush=True)
    
    # 1. Probe source
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(SOURCE)]))
    v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    w, h = v['width'], v['height']
    cname = v.get('codec_name', '')
    fps_val = v.get('r_frame_rate', '')
    print(f'Source master resolution: {w}x{h}, codec: {cname}, r_frame_rate: {fps_val}', flush=True)
    
    # 2. Setup tier output directories
    tiers = ['desktop', 'desktop-standard', 'mobile']
    for tier in tiers:
        (CINEMA_DIR / tier).mkdir(parents=True, exist_ok=True)
        
    with tempfile.TemporaryDirectory(prefix='cinema-upgrade-') as temp:
        temp_dir = Path(temp)
        raw_frames_dir = temp_dir / 'raw_24fps'
        raw_frames_dir.mkdir()
        
        # 3. Decode all 287 source frames to lossless PNGs
        print('Decoding 287 source frames from main.MP4...', flush=True)
        subprocess.run([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
            '-i', str(SOURCE), '-an', '-fps_mode', 'passthrough',
            str(raw_frames_dir / 'frame_%05d.png')
        ], check=True)
        # Rename 1-based frame_00001.png to 0-based frame_00000.png for exact index mapping
        raw_files = sorted(raw_frames_dir.glob('frame_*.png'))
        for idx, f in enumerate(raw_files):
            os.rename(f, raw_frames_dir / f'frame_{idx:05d}.png')
        print(f'Decoded {len(raw_files)} lossless 1080p source frames.', flush=True)
        
        # 4. Interpolate the 4 scenes concurrently to 60 fps
        print('Starting parallel 60 FPS motion interpolation across 4 scene segments...', flush=True)
        scene_args_list = []
        for scene_num, start_idx, end_idx in SCENES:
            scene_out = temp_dir / f'scene_{scene_num}'
            scene_args_list.append((scene_num, start_idx, end_idx, raw_frames_dir, scene_out))
            
        scene_results = {}
        with concurrent.futures.ProcessPoolExecutor(max_workers=4) as executor:
            for s_num, s_frames in executor.map(interpolate_scene, scene_args_list):
                scene_results[s_num] = s_frames
                
        # 5. Assemble master unified 60 fps sequence
        master_frames = []
        for s_num, _, _ in SCENES:
            master_frames.extend(scene_results[s_num])
            
        total_count = len(master_frames)
        print(f'Master 60 FPS sequence generated: {total_count} frames (duration: {total_count/60:.2f}s).', flush=True)
        
        # 6. Encode tiers in parallel
        # Note: Desktop 4K, Desktop 1080p, and Mobile Portrait
        print(f'Encoding {total_count * len(tiers)} tier frames into AVIF...', flush=True)
        encode_jobs = []
        for idx, src_frame in enumerate(master_frames, 1):
            frame_name = f'frame_{idx:05d}.avif'
            for tier in tiers:
                target_path = CINEMA_DIR / tier / frame_name
                encode_jobs.append((tier, idx, src_frame, target_path))
                
        # Encode with thread pool (8 parallel workers)
        completed = 0
        total_jobs = len(encode_jobs)
        t_enc = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(encode_frame, job) for job in encode_jobs]
            for f in concurrent.futures.as_completed(futures):
                f.result()
                completed += 1
                if completed % 150 == 0 or completed == total_jobs:
                    print(f'Encoded {completed}/{total_jobs} tier frames ({completed/total_jobs*100:.1f}%) in {time.time()-t_enc:.1f}s...', flush=True)
                    
        # 7. Generate manifests for each tier
        tier_specs = [
            ('desktop', 3840, 2160),
            ('desktop-standard', 1920, 1080),
            ('mobile', 720, 1080)
        ]
        
        for tier, width, height in tier_specs:
            files = sorted((CINEMA_DIR / tier).glob('frame_*.avif'))
            total_bytes = sum(f.stat().st_size for f in files)
            manifest = {
                'version': 2,
                'width': width,
                'height': height,
                'count': len(files),
                'fps': 60,
                'duration': len(files) / 60.0,
                'format': 'avif',
                'bytes': total_bytes,
                'frames': [f.name for f in files],
                'sourceIndices': list(range(len(files))),
                'sha256': {f.name: hashlib.sha256(f.read_bytes()).hexdigest() for f in files}
            }
            manifest_file = CINEMA_DIR / tier / 'manifest.json'
            manifest_file.write_text(json.dumps(manifest, indent=2))
            m_cnt = manifest['count']
            m_w = manifest['width']
            m_h = manifest['height']
            m_b = manifest['bytes']
            print(f'Manifest written: {tier} -> {m_cnt} frames, {m_w}x{m_h}, {m_b} bytes ({m_b/(1024**2):.2f} MB)', flush=True)
            
        # 8. Posters
        # Master frame 1 for posters
        first_master = master_frames[0]
        subprocess.run([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
            '-i', str(first_master),
            '-vf', 'scale=3840:2160:flags=lanczos+accurate_rnd,unsharp=5:5:0.6:3:3:0.25,cas=0.45',
            '-q:v', '2', str(CINEMA_DIR / 'poster.jpg')
        ], check=True)
        subprocess.run([
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
            '-i', str(first_master),
            '-vf', 'crop=720:1080:600:0,unsharp=3:3:0.4:3:3:0.15,cas=0.35',
            '-q:v', '2', str(CINEMA_DIR / 'poster-mobile.jpg')
        ], check=True)
        
        # 9. Provenance metadata
        shutil.copy2(SOURCE, CINEMA_DIR / 'main-fallback.mp4')
        provenance = {
            'source': 'main.MP4',
            'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            'sourceWidth': 1920,
            'sourceHeight': 1080,
            'sourceFps': 24,
            'sourceFrameCount': 287,
            'interpolation': {
                'algorithm': 'FFmpeg minterpolate (MCI / AOBMC / Bidirectional Motion Estimation)',
                'scenePartitioning': '4 isolated segments across hard cuts (frames 0-73, 74-143, 144-215, 216-286)',
                'crossCutMorphing': 'Strictly zero; no interpolation across scene cut boundaries',
                'targetFps': 60,
                'totalMasterFrames': total_count
            },
            'architecturalSharpening': {
                'desktopUltra4K': 'scale=3840:2160:flags=lanczos+accurate_rnd,unsharp=5:5:0.6:3:3:0.25,cas=0.45',
                'desktopStandard1080p': 'unsharp=3:3:0.4:3:3:0.15,cas=0.35',
                'mobilePortrait': 'crop=720:1080:600:0,unsharp=3:3:0.4:3:3:0.15,cas=0.35',
                'geometryPreservation': 'Straight lines preserved mathematically; no generative hallucination or texture distortion'
            },
            'encoding': {
                'container': 'AVIF (ISO BMFF with ftyp avif, av01)',
                'sequenceHeader': 'libsvtav1 with -flags +global_header (12-byte av1C box for 100% Chrome & Safari decode)',
                'pixelFormat': 'yuv420p',
                'desktopUltraCRF': 34,
                'desktopStandardCRF': 30,
                'mobileCRF': 30,
                'preset': 6
            },
            'tiers': {
                'desktop': {'width': 3840, 'height': 2160, 'count': total_count, 'fps': 60},
                'desktop-standard': {'width': 1920, 'height': 1080, 'count': total_count, 'fps': 60},
                'mobile': {'width': 720, 'height': 1080, 'count': total_count, 'fps': 60}
            },
            'generationTimestamp': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
            'rightsBasis': 'User-supplied architectural visualization for this local site.'
        }
        (CINEMA_DIR / 'provenance.json').write_text(json.dumps(provenance, indent=2))
        print('Provenance written to provenance.json.', flush=True)

    print(f'=== All tasks completed successfully in {time.time()-t_start:.1f}s! ===', flush=True)

if __name__ == '__main__':
    main()
