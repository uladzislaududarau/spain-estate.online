/** Cached native H.264: at most one seek in flight, latest position wins. */
export class ScrollVideoPlayer {
 constructor(video,{progress=0}={}){
  this.video=video;this.progress=progress;this.active=true;this.disposed=false;this.seekTimes=[];this.seekStarted=0;
  video.muted=true;video.playsInline=true;video.preload='auto';
  this.present=()=>{if(this.disposed)return;if(this.seekStarted){this.seekTimes.push(performance.now()-this.seekStarted);this.seekTimes=this.seekTimes.slice(-120);this.seekStarted=0;}if(video.readyState>=2&&Math.abs(video.currentTime-this.target())<.06)video.dataset.painted='true';};
  this.unlock=()=>{if(this.unlocked||this.disposed)return;this.unlocked=true;video.play().then(()=>{video.pause();this.draw();}).catch(()=>{});};
  video.addEventListener('loadeddata',this.present);video.addEventListener('seeked',this.present);
  document.addEventListener('touchstart',this.unlock,{once:true,passive:true});
  document.addEventListener('pointerdown',this.unlock,{once:true,passive:true});
  if(video.readyState>=2)this.present();else if(video.networkState===0)video.load();
 }
 target(){const v=this.video;return Number.isFinite(v.duration)?Math.min(Math.max(0,v.duration-1/30),Math.round(this.progress*Math.round((v.duration-1/30)*30))/30):0;}
 setProgress(value){this.progress=Math.max(0,Math.min(1,value));}
 setActive(value){this.active=value;if(!value)this.video.pause();}
 resize(){}
 draw(){const v=this.video;if(this.disposed||!this.active||document.hidden||v.seeking||v.readyState<2||!Number.isFinite(v.duration))return;const target=this.target();if(Math.abs(v.currentTime-target)>1/60){this.seekStarted=performance.now();v.currentTime=target;}else this.present();}
 state(){const v=this.video;const sorted=[...this.seekTimes].sort((a,b)=>a-b);return {renderer:'native-cached-h264',progress:this.progress,currentTime:v.currentTime,targetTime:this.target(),duration:v.duration,width:v.videoWidth,height:v.videoHeight,seeking:v.seeking,seekMedianMs:sorted.length?sorted[Math.floor(sorted.length/2)]:null,seekCount:this.seekTimes.length,active:this.active,disposed:this.disposed};}
 dispose(){this.disposed=true;this.video.pause();this.video.removeAttribute('src');this.video.load();this.video.removeEventListener('loadeddata',this.present);this.video.removeEventListener('seeked',this.present);document.removeEventListener('touchstart',this.unlock);document.removeEventListener('pointerdown',this.unlock);}
}
