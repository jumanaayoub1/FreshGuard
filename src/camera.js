import { fitCanvas } from './overlay.js';

let stream = null;
let raf = null;
let lastSample = 0;

export async function listVideoDevices(selectEl) {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter(d => d.kind === 'videoinput');
  selectEl.innerHTML = '';
  cams.forEach((d, i) => {
    const opt = document.createElement('option');
    opt.value = d.deviceId;
    opt.textContent = d.label || `Camera ${i + 1}`;
    selectEl.appendChild(opt);
  });
  return cams.length;
}

/**
 * Start the camera stream.
 * @param {HTMLVideoElement} video
 * @param {HTMLCanvasElement} overlay
 * @param {HTMLSelectElement} deviceSelect
 * @param {(sampleCtx:CanvasRenderingContext2D)=>Promise<void>|void} onSample  called ~every sampleMs with a 256x256 crop ctx
 * @param {number} sampleMs  throttling interval (default 400ms)
 */
export async function startCamera(video, overlay, deviceSelect, onSample, sampleMs = 400) {
  await stopCamera(); // clean up any existing

  const constraints = {
    audio: false,
    video: deviceSelect.value
      ? { deviceId: { exact: deviceSelect.value } }
      : {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
  };

  stream = await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject = stream;
  await video.play();

  fitCanvas(overlay);
  lastSample = 0;

  // render loop
  const ctx = overlay.getContext('2d', { willReadFrequently: true });
  const S = 256; // crop size for sampling

  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!video.videoWidth) return;

    // draw a guide ring
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    const r = Math.min(overlay.width, overlay.height) * 0.3;
    ctx.strokeStyle = 'rgba(0,255,255,.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(overlay.width / 2, overlay.height / 2, r, 0, Math.PI * 2);
    ctx.stroke();

    // throttled sampling
    if (!lastSample || ts - lastSample > sampleMs) {
      lastSample = ts;

      const tmp = document.createElement('canvas');
      tmp.width = S; tmp.height = S;
      const tctx = tmp.getContext('2d', { willReadFrequently: true });

      const vw = video.videoWidth, vh = video.videoHeight;
      const minSide = Math.min(vw, vh);
      const sx = (vw - minSide) / 2;
      const sy = (vh - minSide) / 2;
      tctx.drawImage(video, sx, sy, minSide, minSide, 0, 0, S, S);

      onSample?.(tctx); // hand off the 256x256 crop context
    }
  }
  raf = requestAnimationFrame(loop);
}

export async function stopCamera() {
  if (raf) cancelAnimationFrame(raf), (raf = null);
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
}
