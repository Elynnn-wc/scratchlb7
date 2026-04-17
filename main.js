const canvas = document.getElementById('scratchCanvas');
const ctx = canvas.getContext('2d');
const isTouchDevice = 'ontouchstart' in window;
const moveEvent = isTouchDevice ? 'touchmove' : 'mousemove';
const downEvent = isTouchDevice ? 'touchstart' : 'mousedown';
const upEvent = isTouchDevice ? 'touchend' : 'mouseup';

const resetBtn = document.getElementById('resetBtn');
const popup = document.getElementById('popupOverlay');
const popupPrizeText = document.getElementById('popupPrizeText');
const popupPrizeImage = document.getElementById('popupPrizeImage');
const prizeImage = document.getElementById('prizeImage');
const prizeText = document.getElementById('prizeText');
const winSound = document.getElementById('winSound');
const bgMusic = document.getElementById('bgMusic');
const claimCode = document.getElementById('claimCode');

const prizes = [
  { text: 'ANGPAO $3.77 🧧', chance: 0 },
  { text: 'DEPOSIT BONUS 40% 🧧', chance: 0 },
  { text: 'ANGPAO $7.77 🧧', chance: 0 },
  { text: 'ANGPAO $17.77 🧧', chance: 0 },
  { text: 'REVIVE BONUS 50% 🧧', chance: 0 },
  { text: 'ANGPAO $77 🧧', chance: 100 }
];

// Context attributes for drawing
let isDrawing = false;
let revealed = false;
let scratchDisabled = localStorage.getItem('scratched') === 'yes';
let resetTap = 0;
let lastCheckTime = 0;

// Prevent background music looping endlessly
let bgMusicStarted = false;
bgMusic.loop = false;

function getRandomPrize() {
  const weighted = [];
  prizes.forEach((p, i) => {
    for (let j = 0; j < p.chance; j++) weighted.push(i);
  });
  const index = weighted[Math.floor(Math.random() * weighted.length)];
  return prizes[index];
}

const selectedPrize = JSON.parse(localStorage.getItem('scratchPrize')) || getRandomPrize();
prizeText.innerHTML = `<strong>${selectedPrize.text}</strong>`;
localStorage.setItem('scratchPrize', JSON.stringify(selectedPrize));

function copyCode() {
  claimCode.select();
  document.execCommand('copy');
  
  // Visual feedback
  const copyBtn = document.querySelector('.copy-btn');
  const ogText = copyBtn.innerText;
  copyBtn.innerText = 'Copied!';
  setTimeout(() => copyBtn.innerText = ogText, 2000);
}

function showPopup(prize) {
  popupPrizeText.innerHTML = `<strong>${prize.text}</strong>`;
  popupPrizeImage.src = prizeImage.src;
  popup.style.display = 'flex';

  // Stop background music
  bgMusic.pause();
  bgMusic.currentTime = 0;
  bgMusicStarted = false;

  // Play win sound
  winSound.play().catch(err => console.warn("Win sound failed:", err));

  const code = 'LB' + Math.floor(100000 + Math.random() * 900000);
  claimCode.value = code;
  
  canvas.style.pointerEvents = 'none';
  localStorage.setItem('scratched', 'yes');

  const prizeLayer = document.getElementById('prizeLayer');
  if (prizeLayer) {
    prizeLayer.classList.add('revealed');
  }
}

document.getElementById('popupClose').onclick = () => {
  // Original request: Do not allow closing (so user is forced to screenshot).
  // popup.style.display = 'none'; 
};

function initCanvas() {
  // Use a nice metallic/dark gray for the scratch cover
  ctx.fillStyle = '#2c2d30';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some text or pattern on the scratch off layer
  ctx.fillStyle = '#aaaaac';
  ctx.font = '18px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2);
  
  if (scratchDisabled) canvas.style.pointerEvents = 'none';
}

function handleScratch(e) {
  if (scratchDisabled || revealed) return;
  if (!isDrawing) return;
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 36; // Thick stroke for erasing
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  if (ctx.lastX !== undefined && ctx.lastY !== undefined) {
    ctx.moveTo(ctx.lastX, ctx.lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
  } else {
    // Just click/touch without move
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.lastX = x;
  ctx.lastY = y;

  // Throttle performance check every 150ms
  const now = Date.now();
  if (now - lastCheckTime > 150) {
    lastCheckTime = now;
    // Uses requestAnimationFrame to not block the main JS thread
    requestAnimationFrame(checkPercentage);
  }
}

function checkPercentage() {
  if (revealed) return;
  
  const width = canvas.width;
  const height = canvas.height;
  const pixels = ctx.getImageData(0, 0, width, height);
  const data = pixels.data;
  
  let count = 0;
  let totalValidPixels = 0;
  
  // Stride of 16 means checking every 4th pixel, vastly improving performance on mobile
  for (let i = 0; i < data.length; i += 16) {
    totalValidPixels++;
    if (data[i + 3] === 0) {
      count++;
    }
  }
  
  const percentage = (count / totalValidPixels) * 100;
  if (percentage > 50 && !revealed) {
    revealed = true;
    
    // Clear remaining canvas to fully reveal
    ctx.clearRect(0, 0, width, height);
    
    // Short delay before popup
    setTimeout(() => {
        showPopup(selectedPrize);
    }, 400); 
  }
}

// Event Listeners
canvas.addEventListener(downEvent, (e) => {
  if (scratchDisabled) return;
  isDrawing = true;
  ctx.lastX = undefined;
  ctx.lastY = undefined;
  startBgMusicOnce();
  handleScratch(e);
});

canvas.addEventListener(upEvent, () => {
  isDrawing = false;
  // Also check percentage on mouse up in case they scratched fast and lifted quickly
  if (!revealed) checkPercentage();
});

canvas.addEventListener(moveEvent, handleScratch);
// Also stop drawing if mouse leaves canvas
canvas.addEventListener('mouseleave', () => isDrawing = false);

// Secret Reset
document.getElementById('secretResetArea').addEventListener('click', () => {
  resetTap++;
  if (resetTap >= 5) {
    localStorage.removeItem('scratched');
    localStorage.removeItem('scratchPrize');
    location.reload();
  }
});

// BG Music Handler
function startBgMusicOnce() {
  if (!bgMusicStarted && !scratchDisabled) {
    bgMusic.play().catch(err => console.warn("BG music play failed:", err));
    bgMusicStarted = true;
  }
}

document.addEventListener('click', startBgMusicOnce, { once: true });

// Prevent Context Menu & Selection
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());

// Initialize
initCanvas();
