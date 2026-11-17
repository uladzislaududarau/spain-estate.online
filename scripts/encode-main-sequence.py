#!/usr/bin/env python3
"""Export the user-supplied Full HD clip as independent browser-decodable AVIF frames."""
import concurrent.futures,hashlib,json,subprocess,tempfile,shutil
from pathlib import Path
root=Path(__file__).resolve().parent.parent
source=root/'main.MP4';out=root/'showcase/assets/cinema-main'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(source)]))
v=next(s for s in probe['streams'] if s['codec_type']=='video')
if (v['width'],v['height'])!=(1920,1080):raise SystemExit('Recompose the phone crop for a different source size.')
for tier in ['desktop','mobile']:(out/tier).mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='estate-main-frames-') as temp:
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(source),'-an','-fps_mode','passthrough',str(Path(temp)/'frame_%05d.png')],check=True)
 frames=sorted(Path(temp).glob('*.png'));print(f'Decoded {len(frames)} source frames',flush=True)
 jobs=[(tier,index,frame) for index,frame in enumerate(frames,1) for tier in ['desktop','mobile']]
 def encode(job):
  tier,index,frame=job;target=out/tier/f'frame_{index:05d}.avif'
  cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(frame),'-frames:v','1']
  if tier=='mobile':cmd+=['-vf','crop=720:1080:600:0']
  cmd+=['-flags','+global_header','-c:v','libsvtav1','-crf','26' if tier=='desktop' else '27','-preset','6','-svtav1-params','lp=2:tune=0','-pix_fmt','yuv420p',str(target)]
  subprocess.run(cmd,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for i,_ in enumerate(pool.map(encode,jobs),1):
   if i%80==0:print(f'Encoded {i}/{len(jobs)} tier frames',flush=True)
 for tier,width in [('desktop',1920),('mobile',720)]:
  files=sorted((out/tier).glob('*.avif'))
  manifest={'version':2,'width':width,'height':1080,'count':len(files),'fps':24,'duration':len(frames)/24,'format':'avif','bytes':sum(f.stat().st_size for f in files),'frames':[f.name for f in files],'sourceIndices':list(range(len(frames))),'sha256':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in files}}
  (out/tier/'manifest.json').write_text(json.dumps(manifest,indent=2));print(tier,manifest['count'],manifest['bytes'],flush=True)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(frames[0]),'-frames:v','1','-q:v','2',str(out/'poster.jpg')],check=True)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(frames[0]),'-vf','crop=720:1080:600:0','-frames:v','1','-q:v','2',str(out/'poster-mobile.jpg')],check=True)
 shutil.copy2(source,out/'main-fallback.mp4')
 (out/'provenance.json').write_text(json.dumps({'source':'main.MP4','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceWidth':1920,'sourceHeight':1080,'fps':24,'count':len(frames),'editorialOrder':'Original full clip, all frames in order, no modulo wrap or interpolation.','encoding':'AVIF SVT-AV1 preset6, global_header, yuv420p; desktopCRF26/mobileCRF27. No upscale/sharpening.','mobileCrop':'720:1080:600:0','rightsBasis':'User-supplied architectural visualization for this local site; no identified listing claim.'},indent=2))
