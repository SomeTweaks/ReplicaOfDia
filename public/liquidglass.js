(function () {
  function mountLiquidGlass() {
    if (document.getElementById('lg-svg-defs')) return;

    const w = 340, h = 520, bezel = 28;
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(w, h);
    const data = img.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = Math.min(x, w - 1 - x);
        const dy = Math.min(y, h - 1 - y);
        const edge = Math.min(dx, dy);
        let nx = 0, ny = 0;
        if (edge < bezel) {
          const t = 1 - edge / bezel;
          const force = Math.sin(t * Math.PI * 0.5);
          if (dx < dy) nx = (x < w / 2 ? -1 : 1) * force;
          else ny = (y < h / 2 ? -1 : 1) * force;
        }
        const i = (y * w + x) * 4;
        data[i] = Math.round((nx * 0.5 + 0.5) * 255);
        data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        data[i + 2] = 128;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const svg = document.createElementNS('http://w3.org', 'svg');
    svg.id = 'lg-svg-defs';
    svg.setAttribute('style', 'position:fixed;width:0;height:0;pointer-events:none');
    svg.innerHTML = `<defs><filter id="ios-liquid-glass" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
      <feImage href="${cv.toDataURL()}" result="dispMap" preserveAspectRatio="none"/>
      <feDisplacementMap in="SourceGraphic" in2="dispMap" scale="34" xChannelSelector="R" yChannelSelector="G" result="refracted"/>
      <feGaussianBlur in="refracted" stdDeviation="14" result="blurred"/>
      <feColorMatrix in="blurred" type="saturate" values="1.45"/>
    </filter></defs>`;
    document.body.appendChild(svg);

    const style = document.createElement('style');
    style.textContent = `
      .card {
        backdrop-filter: url(#ios-liquid-glass) blur(16px) saturate(1.4) !important;
        -webkit-backdrop-filter: blur(22px) saturate(1.4) !important;
        background: rgba(255, 255, 255, 0.28) !important;
        border: 1.5px solid rgba(255, 255, 255, 0.85) !important;
        box-shadow: 0 24px 48px -22px rgba(10, 30, 45, 0.45),
                    inset 0 2px 3px rgba(255, 255, 255, 0.95),
                    inset 0 -3px 6px rgba(255, 255, 255, 0.4) !important;
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountLiquidGlass);
  else mountLiquidGlass();
})();
