const frame = document.getElementById('viewportFrame');
const frameIframe = document.getElementById('previewFrame');
const stageCanvas = document.getElementById('stageCanvas');
const presetGrid = document.getElementById('presetGrid');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const applyCustomButton = document.getElementById('applyCustom');
const swapViewportButton = document.getElementById('swapViewport');
const autoFitToggle = document.getElementById('autoFitToggle');
const zoomRange = document.getElementById('zoomRange');
const reloadFrameButton = document.getElementById('reloadFrame');
const viewportLabel = document.getElementById('viewportLabel');
const breakpointLabel = document.getElementById('breakpointLabel');
const scaleLabel = document.getElementById('scaleLabel');
const toolbarPill = document.getElementById('toolbarPill');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const state = {
  width: 1440,
  height: 900,
  autoFit: true,
  manualScale: 1
};

function getBreakpoint(width) {
  if (width <= 520) return 'Mobile XS';
  if (width <= 820) return 'Mobile';
  if (width <= 1180) return 'Tablet';
  return 'Desktop';
}

function fitFrame() {
  if (!frame || !stageCanvas) return;

  const canvasRect = stageCanvas.getBoundingClientRect();
  const paddingX = 56;
  const paddingY = 72;
  const availableWidth = Math.max(canvasRect.width - paddingX, 240);
  const availableHeight = Math.max(canvasRect.height - paddingY, 320);
  const fitScale = Math.min(availableWidth / state.width, availableHeight / state.height, 1);
  const scale = state.autoFit ? fitScale : state.manualScale;

  frame.style.setProperty('--frame-width', `${state.width}px`);
  frame.style.setProperty('--frame-height', `${state.height}px`);
  frame.style.setProperty('--frame-scale', scale.toFixed(3));

  viewportLabel.textContent = `${state.width} × ${state.height}`;
  breakpointLabel.textContent = getBreakpoint(state.width);
  toolbarPill.textContent = getBreakpoint(state.width);
  scaleLabel.textContent = `${Math.round(scale * 100)}%`;
  zoomRange.value = String(Math.round(scale * 100));
}

function updateInputs() {
  widthInput.value = String(state.width);
  heightInput.value = String(state.height);
}

function setViewport(width, height) {
  state.width = clamp(Number(width) || 390, 280, 2560);
  state.height = clamp(Number(height) || 844, 480, 1800);
  updateInputs();
  fitFrame();
}

function setActivePreset(button) {
  presetGrid.querySelectorAll('.preset-button').forEach((node) => {
    node.classList.toggle('is-active', node === button);
  });
}

presetGrid.addEventListener('click', (event) => {
  const button = event.target.closest('.preset-button');
  if (!button) return;

  state.autoFit = true;
  autoFitToggle.checked = true;
  setActivePreset(button);
  setViewport(button.dataset.width, button.dataset.height);
});

applyCustomButton.addEventListener('click', () => {
  presetGrid.querySelectorAll('.preset-button').forEach((node) => node.classList.remove('is-active'));
  setViewport(widthInput.value, heightInput.value);
});

swapViewportButton.addEventListener('click', () => {
  const nextWidth = state.height;
  const nextHeight = state.width;
  presetGrid.querySelectorAll('.preset-button').forEach((node) => node.classList.remove('is-active'));
  setViewport(nextWidth, nextHeight);
});

autoFitToggle.addEventListener('change', () => {
  state.autoFit = autoFitToggle.checked;
  if (!state.autoFit) {
    state.manualScale = clamp(Number(zoomRange.value) / 100, 0.35, 1);
  }
  fitFrame();
});

zoomRange.addEventListener('input', () => {
  const scale = clamp(Number(zoomRange.value) / 100, 0.35, 1);
  state.manualScale = scale;
  if (!state.autoFit) {
    fitFrame();
  } else {
    scaleLabel.textContent = `${Math.round(scale * 100)}%`;
  }
});

reloadFrameButton.addEventListener('click', () => {
  const nextSrc = `./index.html?playground-preview=${Date.now()}`;
  frameIframe.src = nextSrc;
});

window.addEventListener('resize', fitFrame);

setViewport(state.width, state.height);
