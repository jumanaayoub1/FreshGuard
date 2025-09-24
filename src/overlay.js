export function fitCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
  
  export function setStatus(text, el) {
    el.innerHTML = text;
  }
  