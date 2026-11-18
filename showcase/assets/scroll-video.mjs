/** One paused native decoder. Scroll owns the target, including during a seek. */
export class ScrollVideoPlayer {
  constructor(video, { src, progress = 0 }) {
    this.video = video;
    this.progress = progress;
    this.active = false;
    this.disposed = false;
    this.seekTimes = [];
    this.seekStarted = null;
    this.events = new AbortController();
    const options = { signal: this.events.signal };

    const onReady = () => this.draw();
    video.addEventListener('loadedmetadata', onReady, options);
    video.addEventListener('loadeddata', onReady, options);
    video.addEventListener('seeked', () => {
      if (this.seekStarted !== null) {
        this.seekTimes.push(performance.now() - this.seekStarted);
        if (this.seekTimes.length > 120) this.seekTimes.shift();
        this.seekStarted = null;
      }
      this.draw();
    }, options);
    video.addEventListener('error', () => { delete video.dataset.painted; }, options);

    // Some mobile media policies defer decoding until the first user gesture.
    const unlock = () => {
      if (!this.active || video.readyState >= 2 || video.seeking) return;
      video.play().then(() => {
        if (this.disposed) return;
        video.pause();
        this.draw();
      }).catch(() => {});
    };
    document.addEventListener('pointerdown', unlock, { ...options, once: true, passive: true });

    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    this.src = src;
  }

  target() {
    const { duration } = this.video;
    if (!Number.isFinite(duration)) return 0;
    const lastFrame = Math.max(0, Math.round(duration * 30) - 1);
    return Math.round(this.progress * lastFrame) / 30;
  }

  setProgress(value) {
    this.progress = Math.max(0, Math.min(1, value));
    this.draw();
  }

  setActive(value) {
    this.active = value;
    if (value && !this.video.hasAttribute('src')) this.video.src = this.src;
    this.draw();
  }

  draw() {
    const video = this.video;
    if (this.disposed || !this.active || document.hidden || video.seeking ||
        video.readyState < 1 || !Number.isFinite(video.duration)) return;
    const target = this.target();
    if (Math.abs(video.currentTime - target) > 1 / 60) {
      this.seekStarted = performance.now();
      video.currentTime = target;
    } else if (video.readyState >= 2 && !video.dataset.painted) {
      video.dataset.painted = 'true';
    }
  }

  state() {
    const v = this.video;
    const sorted = [...this.seekTimes].sort((a, b) => a - b);
    return { renderer: 'native-streaming-h264', progress: this.progress,
      currentTime: v.currentTime, targetTime: this.target(), duration: v.duration,
      width: v.videoWidth, height: v.videoHeight, seeking: v.seeking,
      seekMedianMs: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
      seekCount: sorted.length, active: this.active, disposed: this.disposed };
  }

  dispose() {
    this.disposed = true;
    this.events.abort();
    this.video.pause();
    delete this.video.dataset.painted;
    this.video.removeAttribute('src');
    this.video.load();
  }
}
