from pathlib import Path
import subprocess,json,concurrent.futures
root=Path(__file__).resolve().parents[1]/'showcase/assets/cinema-main'
indices=sorted(set(round(i*700/47) for i in range(48)))
def encode(job):
 folder,source,width,height,index=job
 output=root/'preview'/folder/f'frame_{index:05}.avif';output.parent.mkdir(parents=True,exist_ok=True)
 subprocess.run(['ffmpeg','-v','error','-i',str(root/source/f'frame_{index+1:05}.avif'),'-frames:v','1','-vf',f'scale={width}:{height}:flags=lanczos','-c:v','libsvtav1','-preset','8','-crf','36','-svtav1-params','lp=1','-pix_fmt','yuv420p','-y',str(output)],check=True,stderr=subprocess.DEVNULL)
 return output.stat().st_size
for folder,source,width,height in [('mobile','mobile',480,720),('desktop','desktop-standard',960,540)]:
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:sizes=list(pool.map(encode,[(folder,source,width,height,i) for i in indices]))
 manifest={'width':width,'height':height,'bytes':sum(sizes),'frames':[{'index':i,'file':f'frame_{i:05}.avif'} for i in indices]}
 (root/'preview'/folder/'manifest.json').write_text(json.dumps(manifest))
 print(folder,sum(sizes),flush=True)
