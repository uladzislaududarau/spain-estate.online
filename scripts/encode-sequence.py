#!/usr/bin/env python3
"""Reproducible AVIF export; requires local FFmpeg with libsvtav1. No installs."""
import argparse,subprocess,json,hashlib,tempfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
p=argparse.ArgumentParser();p.add_argument('source',type=Path);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
if a.out.exists():p.error('Output must be a new directory; preserve existing export.')
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(a.source)]));stream=next(s for s in probe['streams'] if s['codec_type']=='video')
if int(stream['width'])!=1280 or int(stream['height'])!=720:p.error('This authored crop expects the supplied 1280×720 source. Recompose before changing dimensions.')
a.out.mkdir(parents=True)
for tier in ['desktop','mobile']:(a.out/tier).mkdir()
with tempfile.TemporaryDirectory(prefix='estate-frames-') as tmp:
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(a.source),'-an','-fps_mode','passthrough',str(Path(tmp)/'frame_%05d.png')],check=True)
    frames=sorted(Path(tmp).glob('*.png'))
    def encode(job):
        tier,index,frame=job;target=a.out/tier/f'frame_{index:05d}.avif'
        cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(frame),'-frames:v','1']
        if tier=='mobile':cmd+=['-vf','crop=480:720:440:0,cas=0.2']
        else:cmd+=['-vf','cas=0.2']
        cmd+=['-c:v','libsvtav1','-crf','25' if tier=='desktop' else '28','-preset','4','-svtav1-params','lp=2:tune=0','-pix_fmt','yuv420p','-f','avif',str(target)]
        subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    jobs=[(tier,i,f) for tier,step in [('desktop',1),('mobile',2)] for i,f in enumerate(frames[::step],1)]
    with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(encode,jobs))
    for tier,width,height,step in [('desktop',1280,720,1),('mobile',480,720,2)]:
        paths=sorted((a.out/tier).glob('*.avif'));manifest={'version':1,'format':'avif','width':width,'height':height,'count':len(paths),'fps':24/step,'duration':len(frames)/24,'bytes':sum(f.stat().st_size for f in paths),'frames':[f.name for f in paths],'sourceIndices':list(range(0,len(frames),step)),'sha256':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in paths}}
        (a.out/tier/'manifest.json').write_text(json.dumps(manifest,indent=2));print(tier,len(paths),manifest['bytes'])
(a.out/'provenance.json').write_text(json.dumps({'source':a.source.name,'sha256':hashlib.sha256(a.source.read_bytes()).hexdigest(),'probe':probe,'use':'User-supplied architectural illustration for local preview; identified listing and public reuse rights not independently verified.','editorialOrder':'Runtime starts at source frame48, continues to end then first48. All source frames retained; not a continuous physical camera.'},indent=2))
for name,seconds in [('poster',2),('terrace',6.5),('interior',8.5)]:subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',str(seconds),'-i',str(a.source),'-frames:v','1','-q:v','2',str(a.out/f'{name}.jpg')],check=True)
