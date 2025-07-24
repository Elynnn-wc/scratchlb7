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
  { text: 'ANGPAO $3 🧧', chance: 0 },
  { text: 'ANGPAO $5 🧧', chance: 0 },
  { text: 'ANGPAO $8 🧧', chance: 80 },
  { text: 'ANGPAO $12 🧧', chance: 20 },
  { text: 'ANGPAO $68 🧧', chance: 0 },
  { text: 'ANGPAO $88 🧧', chance: 0 }
];

// 防止重复播放背景音乐
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
}

function showPopup(prize) {
  popupPrizeText.innerHTML = `<strong>${prize.text}</strong>`;
  popupPrizeImage.src = prizeImage.src;
  popup.style.display = 'flex';

  // 停止背景音乐
  bgMusic.pause();
  bgMusic.currentTime = 0;
  bgMusicStarted = false;

  // 播放中奖音效
  winSound.play().catch(err => console.warn("Win sound failed:", err));

  const code = 'RB' + Math.floor(100000 + Math.random() * 900000);
  claimCode.value = code;
  claimCode.style.color = '#111';
  canvas.style.pointerEvents = 'none';
  localStorage.setItem('scratched', 'yes');

  const prizeLayer = document.getElementById('prizeLayer');
  if (prizeLayer) {
    prizeLayer.classList.add('revealed');
  }
}

document.getElementById('popupClose').onclick = () => {
  // 不允许关闭
};

let isDrawing = false;
let revealed = false;
let scratchDisabled = localStorage.getItem('scratched') === 'yes';
let resetTap = 0;

function handleScratch(e) {
  if (scratchDisabled || revealed) return;
  if (!isDrawing) return;
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let count = 0;
  for (let i = 0; i < pixels.data.length; i += 4) {
    if (pixels.data[i + 3] === 0) count++;
  }
  const percentage = count / (canvas.width * canvas.height) * 100;
  if (percentage > 50 && !revealed) {
    revealed = true;
    showPopup(selectedPrize);
  }
}

canvas.addEventListener(downEvent, () => {
  if (scratchDisabled) return;
  isDrawing = true;
});
canvas.addEventListener(upEvent, () => isDrawing = false);
canvas.addEventListener(moveEvent, handleScratch);

document.getElementById('secretResetArea').addEventListener('click', () => {
  resetTap++;
  if (resetTap >= 5) {
    localStorage.removeItem('scratched');
    localStorage.removeItem('scratchPrize');
    location.reload();
  }
});

function initCanvas() {
  ctx.fillStyle = '#999';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (scratchDisabled) canvas.style.pointerEvents = 'none';
}

initCanvas();

// 背景音乐只播放一次（按钮或点击页面）
function startBgMusicOnce() {
  if (!bgMusicStarted) {
    bgMusic.play().catch(err => console.warn("BG music play failed:", err));
    bgMusicStarted = true;
  }
}

const startButton = document.getElementById('startButton');
if (startButton) {
  startButton.addEventListener('click', startBgMusicOnce, { once: true });
} else {
  document.addEventListener('click', startBgMusicOnce, { once: true });
}
// 防止右键菜单
document.addEventListener('contextmenu', e => {
  e.preventDefault();
});

// 防止选中拖动
document.addEventListener('selectstart', e => {
  e.preventDefault();
});
