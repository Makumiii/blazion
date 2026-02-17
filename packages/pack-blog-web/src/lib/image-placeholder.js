function svgToDataUrl(svg) {
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const DEFAULT_BLUR_DATA_URL = svgToDataUrl(`
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='#d8d6cf' />
      <stop offset='100%' stop-color='#b9b6ab' />
    </linearGradient>
  </defs>
  <rect width='16' height='9' fill='url(#g)' />
  <rect width='16' height='9' fill='rgba(0,0,0,0.05)' />
</svg>
`);
