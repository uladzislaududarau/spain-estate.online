/** Bounded photographic frame renderer. High-clarity bicubic rasterization. */
export class ScrollCinematicSequence {
  constructor(canvas, manifest, base, {mobile=false,fit='cover',focalX=.5,focalY=.5,startIndex=48,onState=()=>{}}={}) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});this.manifest=manifest;this.base=base;
    this.mobile=mobile;this.fit=fit;this.focalX=focalX;this.focalY=focalY;this.startIndex=Math.floor(startIndex/ (mobile?2:1));this.onState=onState;
    this.cache=new Map();this.pending=new Map();this.failed=new Set();this.desired=0;this.rendered=-1;this.progress=0;this.active=true;this.disposed=false;this.dirty=true;
    this.cap=mobile?16*1024**2:32*1024**2;this.maxEntries=Math.max(4,Math.floor(this.cap/(manifest.width*manifest.height*4)));this.drawTimes=[];this.maxObservedBytes=0;
    this.resize();this.loadNearby();
  }
  sourceIndex(i){return (this.startIndex+i)%this.manifest.count;}
  resize(){
    if(this.disposed)return;
    const {width,height}=this.canvas.getBoundingClientRect();this.w=width;this.h=height;
    const dpr=Math.min(devicePixelRatio||1,1.5,Math.sqrt((this.mobile?1200000:2000000)/Math.max(1,width*height)));
    this.canvas.width=Math.max(1,Math.round(width*dpr));this.canvas.height=Math.max(1,Math.round(height*dpr));
    this.ctx?.setTransform(dpr,0,0,dpr,0,0);
    if(this.ctx){this.ctx.imageSmoothingEnabled=true;this.ctx.imageSmoothingQuality='high';}
    this.dirty=true;
  }
  setProgress(p){this.progress=Math.min(1,Math.max(0,p));const next=Math.round(this.progress*(this.manifest.count-1));if(next!==this.desired){this.desired=next;this.dirty=true;for(const [i,c] of this.pending)if(Math.abs(i-next)>12)c.abort();}this.loadNearby();}
  setActive(value){if(this.disposed)return;this.active=value;if(!value)for(const c of this.pending.values())c.abort();else{this.dirty=true;this.loadNearby();}}
  loadNearby(){
    if(this.disposed||!this.active||document.hidden)return;
    const targets=[this.desired,this.desired+1,this.desired-1,this.desired+2,this.desired-2,this.desired+3,this.desired-3,this.desired+4,this.desired-4];
    for(const i of targets.slice(0,this.maxEntries)){
      if(this.pending.size>=4)break;
      if(i<0||i>=this.manifest.count||this.cache.has(i)||this.pending.has(i)||this.failed.has(i))continue;
      this.load(i);
    }
  }
  async load(i){
    const controller=new AbortController();this.pending.set(i,controller);let bitmap;
    try{
      const response=await fetch(this.base+this.manifest.frames[this.sourceIndex(i)],{signal:controller.signal});if(!response.ok)throw new Error('frame_http');
      const blob=await response.blob();
      if(typeof createImageBitmap==='function') bitmap=await createImageBitmap(blob);
      else {const url=URL.createObjectURL(blob);try{bitmap=new Image();bitmap.src=url;await bitmap.decode();}finally{URL.revokeObjectURL(url);}}
      if(this.disposed||controller.signal.aborted||!this.active){this.release(bitmap);return;}
      if(bitmap.width!==this.manifest.width||bitmap.height!==this.manifest.height)throw new Error('dimensions');
      // Evict before admission; retain current target preferentially.
      while(this.cache.size>=this.maxEntries){const farthest=[...this.cache.keys()].sort((a,b)=>Math.abs(b-this.desired)-Math.abs(a-this.desired))[0];this.release(this.cache.get(farthest));this.cache.delete(farthest);}
      this.cache.set(i,bitmap);bitmap=undefined;this.maxObservedBytes=Math.max(this.maxObservedBytes,this.cache.size*this.manifest.width*this.manifest.height*4);this.dirty=true;
    }catch(error){if(error.name!=='AbortError'&&!controller.signal.aborted&&!this.disposed)this.failed.add(i);this.release(bitmap);}
    finally{this.pending.delete(i);if(!this.disposed)this.loadNearby();}
  }
  release(bitmap){if(!bitmap)return;if(typeof bitmap.close==='function')bitmap.close();else bitmap.src='';}
  draw(){
    if(this.disposed||!this.active||document.hidden||!this.ctx||!this.dirty)return;
    let i=this.cache.has(this.desired)?this.desired:[...this.cache.keys()].sort((a,b)=>Math.abs(a-this.desired)-Math.abs(b-this.desired))[0];
    if(i===undefined)return;
    if(i===this.rendered&&!this.dirty)return;
    const bitmap=this.cache.get(i);const start=performance.now();
    const scale=this.fit==='contain'?Math.min(this.w/bitmap.width,this.h/bitmap.height):Math.max(this.w/bitmap.width,this.h/bitmap.height);
    const width=bitmap.width*scale,height=bitmap.height*scale;
    const dx=Math.round((this.w-width)*this.focalX);
    const dy=Math.round((this.h-height)*this.focalY);
    const dw=Math.round(width);
    const dh=Math.round(height);
    if(this.fit==='contain'){this.ctx.fillStyle='#0b1320';this.ctx.fillRect(0,0,this.w,this.h);}
    this.ctx.imageSmoothingEnabled=true;
    this.ctx.imageSmoothingQuality='high';
    this.ctx.drawImage(bitmap,dx,dy,dw,dh);
    this.canvas.dataset.painted='true';this.rendered=i;this.dirty=false;this.drawTimes.push(performance.now()-start);if(this.drawTimes.length>600)this.drawTimes.shift();this.onState(this.state());
  }
  state(){return {renderer:'canvas-avif',progress:this.progress,count:this.manifest.count,requested:this.desired,rendered:this.rendered,sourceFrame:this.rendered<0?null:this.sourceIndex(this.rendered),residentBytes:this.cache.size*this.manifest.width*this.manifest.height*4,maxResidentBytes:this.maxObservedBytes,cacheCap:this.cap,backingBytes:this.canvas.width*this.canvas.height*4,pending:this.pending.size,failures:[...this.failed],active:this.active,disposed:this.disposed,drawP95:this.drawTimes.length?[...this.drawTimes].sort((a,b)=>a-b)[Math.floor((this.drawTimes.length-1)*.95)]:null};}
  dispose(){if(this.disposed)return;this.disposed=true;for(const c of this.pending.values())c.abort();for(const bitmap of this.cache.values())this.release(bitmap);this.cache.clear();this.canvas.width=1;this.canvas.height=1;delete this.canvas.dataset.painted;}
}
