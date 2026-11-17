from pathlib import Path
from PIL import Image
import subprocess,concurrent.futures
root=Path(__file__).resolve().parents[1]/'showcase/assets/cinema-main'
def encode(spec):
 folder,name,width,height,crf=spec
 command=['ffmpeg','-v','error','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{width}x{height}','-framerate','30','-i','pipe:0','-an','-vf','scale=out_color_matrix=bt709:out_range=tv,format=yuv420p','-c:v','libx264','-preset','fast','-crf',str(crf),'-g','12','-keyint_min','12','-sc_threshold','0','-bf','0','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart','-threads','3','-y',str(root/name)]
 process=subprocess.Popen(command,stdin=subprocess.PIPE)
 try:
  for index in range(1,702,2):
   with Image.open(root/folder/f'frame_{index:05}.avif') as frame:process.stdin.write(frame.convert('RGB').resize((width,height),Image.Resampling.LANCZOS).tobytes())
 finally:process.stdin.close()
 if process.wait():raise RuntimeError('encode_failed')
 print(name,(root/name).stat().st_size,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(encode,[('mobile','scroll-mobile.mp4',720,1080,28),('desktop-standard','scroll-desktop.mp4',1600,900,25)]))
