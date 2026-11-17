/** Paused, all-intra video: native decoding, one seek in flight, latest scroll target wins. */
export class ScrollVideoPlayer {
  constructor(video) {
    this.video=video;this.progress=0;this.active=true;this.disposed=false;
    this.present=()=>{if(!this.disposed&&video.readyState>=2)video.dataset.painted='true';};
    video.muted=true;video.preload='auto';
    video.addEventListener('loadeddata',this.present);video.addEventListener('seeked',this.present);
    video.load();
  }
  setProgress(value){this.progress=Math.max(0,Math.min(1,value));}
  setActive(value){this.active=value;if(!value)this.video.pause();}
  resize(){}
  draw(){
    const v=this.video;
    if(this.disposed||!this.active||document.hidden||v.seeking||v.readyState<1||!Number.isFinite(v.duration))return;
    const target=this.progress*Math.max(0,v.duration-1/24);
    if(Math.abs(v.currentTime-target)>1/48)v.currentTime=target;
  }
  state(){const v=this.video;return {renderer:'native-intra-video',progress:this.progress,currentTime:v.currentTime,targetTime:this.progress*Math.max(0,(v.duration||0)-1/24),duration:v.duration,width:v.videoWidth,height:v.videoHeight,seeking:v.seeking,active:this.active,disposed:this.disposed};}
  dispose(){this.disposed=true;this.video.pause();this.video.preload='none';this.video.removeEventListener('loadeddata',this.present);this.video.removeEventListener('seeked',this.present);}
}
