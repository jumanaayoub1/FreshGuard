import { listVideoDevices, startCamera, stopCamera } from './camera.js';
import { fitCanvas, setStatus } from './overlay.js';
import { analyzeBrightness } from './sampler.js';

const video = document.getElementById('video');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const snapBtn = document.getElementById('snapBtn');
const deviceSelect = document.getElementById('deviceSelect');
const statusEl = document.getElementById('status');

const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
if (!hasMedia) {
  setStatus('getUserMedia not supported by this browser.', statusEl);
}

window.addEventListener('resize', () => fitCanvas(overlay));
fitCanvas(overlay); // initial

// populate devices (labels appear after first permission in some browsers)
listVideoDevices(deviceSelect).catch(() => { /* ignore pre-permission errors */ });

// keep list fresh when devices change
navigator.mediaDevices.addEventListener?.('devicechange', () => listVideoDevices(deviceSelect));

async function handleStart() {
  startBtn.disabled = true;
  try {
    await startCamera(video, overlay, deviceSelect, (sampleCtx) => {
      const brightness = analyzeBrightness(sampleCtx);
      const msg = `Brightness ~ ${(brightness * 100).toFixed(0)}% ` +
        (brightness < 0.25 ? '<span style="color:#ffb86b">Low light</span>' : '<span style="color:#a6e3a1">OK</span>');
      setStatus(msg, statusEl);
      // 👉 later: run TFJS here or POST the crop to your backend
    }, 400);

    stopBtn.disabled = false;
    snapBtn.disabled = false;
  } catch (e) {
    setStatus('Error starting camera: ' + (e.message || e.name), statusEl);
    startBtn.disabled = false;
  }
}

function handleStop() {
  stopCamera();
  stopBtn.disabled = true;
  snapBtn.disabled = true;
  startBtn.disabled = false;
  setStatus('Stopped.', statusEl);
}

function handleCapture() {
  if (!video.videoWidth) return;
  const S = 512;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const cctx = c.getContext('2d');
  const vw = video.videoWidth, vh = video.videoHeight;
  const minSide = Math.min(vw, vh);
  const sx = (vw - minSide) / 2, sy = (vh - minSide) / 2;
  cctx.drawImage(video, sx, sy, minSide, minSide, 0, 0, S, S);
  const a = document.createElement('a');
  a.download = `frame-${Date.now()}.jpg`;
  a.href = c.toDataURL('image/jpeg', 0.9);
  a.click();
}

startBtn.addEventListener('click', handleStart);
stopBtn.addEventListener('click', handleStop);
deviceSelect.addEventListener('change', handleStart);
snapBtn.addEventListener('click', handleCapture);
