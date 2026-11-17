// Keyboard, mouse and touch, reduced to one small shape the world reads each
// step: a movement vector, a flare request, and the menu actions (confirm,
// pause, restart, mute). The canvas is letterboxed inside the window, so pointer
// positions are converted into the game's own 1280x720 field before anyone uses
// them.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas, view) {
  const keys = new Set();
  let pointer = { x: view.width / 2, y: view.height / 2, inside: false };
  let pointerDown = false;
  let queued = 0;

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / view.width, rect.height / view.height);
    const offsetX = rect.left + (rect.width - view.width * scale) / 2;
    const offsetY = rect.top + (rect.height - view.height * scale) / 2;
    return {
      x: (clientX - offsetX) / scale,
      y: (clientY - offsetY) / scale,
    };
  }

  function press(action) {
    queued |= action;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      press(ACTION_CONFIRM);
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      press(ACTION_PAUSE);
    } else if (event.code === 'KeyR') {
      press(ACTION_RESTART);
    } else if (event.code === 'KeyM') {
      press(ACTION_MUTE);
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    pointer = { ...toField(event.clientX, event.clientY), inside: true };
  });
  canvas.addEventListener('pointerdown', (event) => {
    pointer = { ...toField(event.clientX, event.clientY), inside: true };
    pointerDown = true;
    press(ACTION_CONFIRM);
  });
  window.addEventListener('pointerup', () => {
    pointerDown = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function direction() {
    let x = 0;
    let y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    // No keys held: steer toward the pointer when it is inside the field.
    if (x === 0 && y === 0 && pointer.inside) {
      return { x: pointer.x, y: pointer.y, pointer: true };
    }
    return { x, y, pointer: false };
  }

  return {
    direction,
    pointerDown() {
      return pointerDown;
    },
    flareKeyHeld() {
      return keys.has('Space');
    },
    pointer() {
      return pointer;
    },
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}
