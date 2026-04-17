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
const winSound = document.getElementById('winSound');
const bgMusic = document.getElementById('bgMusic');
const claimCode = document.getElementById('claimCode');

const baseCanvas = document.getElementById('baseCanvas');
const baseCtx = baseCanvas ? baseCanvas.getContext('2d') : null;

// ============================================
// HOW TO SET PROBABILITIES (CHANCES):
// The 'chance' number is the relative weight. 
// If you want ANGPAO $77 to appear 1 out of 100 times, 
// give it chance: 1, and the others a total of 99.
// If chance: 0, it will never be selected.
// ============================================
const isDevMode = new URLSearchParams(window.location.search).get('dev') === 'true';

const prizes = [
  { id: 1, text: 'ANGPAO $3.77 🧧', chance: 50 },
  { id: 2, text: 'DEPOSIT BONUS 40% 🧧', chance: 30 },
  { id: 3, text: 'ANGPAO $7.77 🧧', chance: 10 },
  { id: 4, text: 'ANGPAO $17.77 🧧', chance: 5 },
  { id: 5, text: 'REVIVE BONUS 50% 🧧', chance: 4 },
  { id: 6, text: 'ANGPAO $77 🧧', chance: 1 }   // Example: 1% chance if total is 100
];

// Context attributes for drawing
let isDrawing = false;
let revealed = false;
let scratchDisabled = localStorage.getItem('scratched') === 'yes' && !isDevMode;
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
  if (weighted.length === 0) return prizes[0]; // fallback
  const index = weighted[Math.floor(Math.random() * weighted.length)];
  return prizes[index];
}

// Security: Hide the prize from the DOM using Base64 Storage and Base Canvas Drawing
let selectedPrize;
try {
  const saved = localStorage.getItem('lb7_prize_data');
  selectedPrize = saved ? JSON.parse(decodeURIComponent(atob(saved))) : getRandomPrize();
} catch (e) {
  selectedPrize = getRandomPrize();
}
localStorage.setItem('lb7_prize_data', btoa(encodeURIComponent(JSON.stringify(selectedPrize))));

if (isDevMode) {
  console.log("🛠️ DEV MODE ENABLED");
  console.log("Secretly rolled prize:", selectedPrize.text, "(ID: " + selectedPrize.id + ")");
}

// Draw the prize secretly on the bottom canvas instead of text in HTML
function drawPrizeToCanvas() {
  if (!baseCtx) return;
  
  // Fill gradient
  let grad = baseCtx.createLinearGradient(0, 0, 0, baseCanvas.height);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#f0f0f0');
  baseCtx.fillStyle = grad;
  baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
  
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = "https://static.vecteezy.com/system/resources/thumbnails/053/236/126/small_2x/paper-pack-reward-angpao-chinese-icon-png.png";
  img.onload = () => {
    const imgWidth = 60;
    const imgHeight = 60;
    baseCtx.drawImage(img, (baseCanvas.width - imgWidth) / 2, 20, imgWidth, imgHeight);
    
    // Draw Text
    baseCtx.font = 'bold 18px Outfit, sans-serif';
    baseCtx.fillStyle = '#b81717';
    baseCtx.textAlign = 'center';
    baseCtx.fillText(selectedPrize.text, baseCanvas.width / 2, 110);
  };
}

drawPrizeToCanvas();

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
  popupPrizeImage.src = "https://static.vecteezy.com/system/resources/thumbnails/053/236/126/small_2x/paper-pack-reward-angpao-chinese-icon-png.png";
  popup.style.display = 'flex';

  // Stop background music
  bgMusic.pause();
  bgMusic.currentTime = 0;
  bgMusicStarted = false;

  // Play win sound
  winSound.play().catch(err => console.warn("Win sound failed:", err));

  // Determine fixed code based on prize ID for anti-fraud
  const n1 = Math.floor(Math.random() * 10);
  const n2 = Math.floor(Math.random() * 10);
  const n3 = Math.floor(Math.random() * 10);
  const n4 = prize.id % 10;
  const n5 = Math.floor(Math.random() * 10);
  const n6 = (n1 + n2 + n3 + n4 + n5) % 10;
  const code = `LB${n1}${n2}${n3}${n4}${n5}${n6}`;
  
  if (isDevMode) {
     console.log("Generated Ticket:", code);
     console.log("Verification Logic -> 4th digit is ID:", n4, " | Last digit is Modulo:", n6);
  }
  claimCode.value = code;
  
  canvas.style.pointerEvents = 'none';
  localStorage.setItem('scratched', 'yes');

  // No DOM elements to reveal, already handled by clearing canvas
}

document.getElementById('popupClose').onclick = () => {
  if (isDevMode) {
    // In Dev mode, allow closing the popup and resetting
    popup.style.display = 'none'; 
    localStorage.removeItem('scratched');
    localStorage.removeItem('lb7_prize_data');
    location.reload();
  }
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
    localStorage.removeItem('lb7_prize_data');
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
