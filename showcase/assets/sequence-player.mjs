/** Scroll position selects an exact frame; bounded nearby decode keeps reverse scrolling ready. */
export class ScrollCinematicSequence {
  constructor(canvas,manifest,base,{mobile=false,onFatal=()=>{}}={}){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    if(!this.ctx)throw new Error('canvas_unavailable');
    this.manifest=manifest;this.base=base;this.mobile=mobile;this.onFatal=onFatal;
    this.cache=new Map();this.blobs=new Map();this.pending=new Map();this.failed=new Set();
    const is4K=manifest.width>=3840;
    this.cap=(mobile?48:(is4K?224:96))*1024**2;this.blobCap=(mobile?16:(is4K?64:32))*1024**2;
    this.frameBytes=manifest.width*manifest.height*4;
    this.maxEntries=Math.max(2,Math.floor(this.cap/this.frameBytes));
    this.parallel=mobile?2:4;this.blobBytes=0;this.maxObservedBytes=0;this.drawTimes=[];
    this.progress=0;this.desired=0;this.rendered=-1;this.direction=1;this.active=true;this.disposed=false;this.dirty=true;this.fatal=false;
    this.resize();this.pump();
  }
  targets(){
    const result=[this.desired];
    for(let distance=1;result.length<this.maxEntries&&distance<this.manifest.count;distance++){
      for(const sign of [this.direction,-this.direction]){
        const i=this.desired+distance*sign;
        if(i>=0&&i<this.manifest.count)result.push(i);
        if(result.length>=this.maxEntries)break;
      }
    }
    return result;
  }
  setProgress(p){
    this.progress=Math.min(1,Math.max(0,p));const next=Math.round(this.progress*(this.manifest.count-1));
    if(next===this.desired)return;
    this.direction=Math.sign(next-this.desired)||this.direction;this.desired=next;this.dirty=true;
    for(const [i,controller] of this.pending)if(Math.abs(i-next)>this.maxEntries)controller.abort();
    this.pump();
  }
  setActive(value){
    if(this.disposed)return;this.active=value;
    if(!value)for(const controller of this.pending.values())controller.abort();
    else{this.dirty=true;this.pump();}
  }
  resize(){
    if(this.disposed)return;
    const {width,height}=this.canvas.getBoundingClientRect();this.w=width;this.h=height;
    const budget=this.mobile?1200000:2000000;
    this.dpr=Math.min(devicePixelRatio||1,2,Math.sqrt(budget/Math.max(1,width*height)));
    const w=Math.max(1,Math.round(width*this.dpr)),h=Math.max(1,Math.round(height*this.dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.ctx.imageSmoothingEnabled=true;this.ctx.imageSmoothingQuality='high';this.dirty=true;this.resized=true;
  }
  rememberBlob(i,blob){
    if(this.blobs.has(i)){this.blobBytes-=this.blobs.get(i).size;this.blobs.delete(i);}
    this.blobs.set(i,blob);this.blobBytes+=blob.size;
    while(this.blobBytes>this.blobCap){const oldest=this.blobs.keys().next().value;this.blobBytes-=this.blobs.get(oldest).size;this.blobs.delete(oldest);}
  }
  pump(){
    if(this.disposed||!this.active||document.hidden)return;
    for(const i of this.targets()){
      if(this.pending.size>=this.parallel)break;
      if(this.cache.has(i)||this.pending.has(i)||this.failed.has(i))continue;
      this.load(i);
    }
  }
  async load(i){
    const controller=new AbortController();this.pending.set(i,controller);let bitmap;
    try{
      let blob=this.blobs.get(i);
      if(!blob){
        const response=await fetch(this.base+this.manifest.frames[i],{signal:controller.signal});
        if(!response.ok)throw new Error(`frame_http_${response.status}`);
        blob=await response.blob();
      }
      if(this.disposed||controller.signal.aborted||!this.active)return;
      this.rememberBlob(i,blob);
      // A rapid jump may make this compressed frame useful later, but not worth decoding now.
      if(!this.targets().includes(i))return;
      if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(blob);
      else{
        const url=URL.createObjectURL(blob);try{bitmap=new Image();bitmap.src=url;await bitmap.decode();}finally{URL.revokeObjectURL(url);}
      }
      if(this.disposed||controller.signal.aborted||!this.active||!this.targets().includes(i)){this.release(bitmap);return;}
      if(bitmap.width!==this.manifest.width||bitmap.height!==this.manifest.height)throw new Error('frame_dimensions');
      while(this.cache.size>=this.maxEntries){
        const farthest=[...this.cache.keys()].sort((a,b)=>Math.abs(b-this.desired)-Math.abs(a-this.desired))[0];
        this.release(this.cache.get(farthest));this.cache.delete(farthest);
      }
      this.cache.set(i,bitmap);bitmap=undefined;this.dirty=true;
      this.maxObservedBytes=Math.max(this.maxObservedBytes,this.cache.size*this.frameBytes);
    }catch(error){
      this.release(bitmap);
      if(!controller.signal.aborted&&!this.disposed){
        this.failed.add(i);
        if(this.rendered<0&&i===this.desired&&!this.fatal){this.fatal=true;this.onFatal(error);}
      }
    }finally{this.pending.delete(i);if(!this.disposed)this.pump();}
  }
  release(bitmap){if(bitmap?.close)bitmap.close();else if(bitmap)bitmap.src='';}
  draw(){
    if(this.disposed||!this.active||document.hidden||!this.dirty)return;
    let index=this.cache.has(this.desired)?this.desired:undefined;
    if(index===undefined){
      // Keep the last valid image; never paint an obsolete frame on the wrong side of motion.
      const candidates=[...this.cache.keys()].filter(i=>this.rendered<0||(i-this.rendered)*(this.desired-this.rendered)>=0&&Math.abs(i-this.rendered)<=Math.abs(this.desired-this.rendered));
      index=candidates.sort((a,b)=>Math.abs(a-this.desired)-Math.abs(b-this.desired))[0];
    }
    if(index===undefined)return;
    if(index===this.rendered&&!this.resized){this.dirty=false;return;}
    const bitmap=this.cache.get(index);const start=performance.now();
    const scale=Math.max(this.w/bitmap.width,this.h/bitmap.height),w=bitmap.width*scale,h=bitmap.height*scale;
    this.ctx.drawImage(bitmap,(this.w-w)/2,(this.h-h)/2,w,h);
    this.canvas.dataset.painted='true';this.rendered=index;this.dirty=false;this.resized=false;
    this.drawTimes.push(performance.now()-start);if(this.drawTimes.length>500)this.drawTimes.shift();
  }
  state(){return {renderer:'canvas-avif-fullhd',progress:this.progress,count:this.manifest.count,requested:this.desired,rendered:this.rendered,width:this.manifest.width,height:this.manifest.height,residentBytes:this.cache.size*this.frameBytes,maxResidentBytes:this.maxObservedBytes,cacheCap:this.cap,compressedBytes:this.blobBytes,compressedCap:this.blobCap,backingBytes:this.canvas.width*this.canvas.height*4,pending:this.pending.size,failures:[...this.failed],active:this.active,disposed:this.disposed};}
  dispose(){this.disposed=true;for(const controller of this.pending.values())controller.abort();for(const bitmap of this.cache.values())this.release(bitmap);this.cache.clear();this.blobs.clear();this.blobBytes=0;this.canvas.width=1;this.canvas.height=1;delete this.canvas.dataset.painted;}
}
