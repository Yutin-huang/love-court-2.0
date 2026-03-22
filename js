function scaleToFitMobile() {
  const baseWidth = 375;
  const baseHeight = 667;
  const scaleX = window.innerWidth / baseWidth;
  const scaleY = window.innerHeight / baseHeight;
  const scale = Math.min(scaleX, scaleY);

  document.querySelector('.mobile-inner').style.transform = `scale(${scale})`;
}

window.addEventListener('resize', scaleToFitMobile);
window.addEventListener('load', scaleToFitMobile);
