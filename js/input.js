/**
 * input.js — Captura de teclado suave y sin repetición automática
 */

const keys = new Set();
let _firePressedThisFrame = false;
let _restartPressedThisFrame = false;
let _fireWasDown = false;

export function initInput() {
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (!keys.has(key)) {
      if (key === ' ' || key === 'z') _firePressedThisFrame = true;
      if (key === 'enter') _restartPressedThisFrame = true;
    }
    keys.add(key);

    // Evitar scroll con teclas de dirección y espacio
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.toLowerCase());
  });

  // Limpiar si la ventana pierde foco
  window.addEventListener('blur', () => keys.clear());
}

/**
 * Llamar al inicio de cada frame para preparar el estado de disparo
 */
export function pollInput() {
  // _firePressedThisFrame y _restartPressedThisFrame ya se setean en keydown
}

/**
 * Llamar al FINAL de cada frame para consumir los eventos one-shot
 */
export function consumeFrameInput() {
  _firePressedThisFrame = false;
  _restartPressedThisFrame = false;
}

export function isDown(key) {
  return keys.has(key.toLowerCase());
}

export function isForward() {
  return keys.has('arrowup') || keys.has('w');
}

export function isBackward() {
  return keys.has('arrowdown') || keys.has('s');
}

export function isTurnLeft() {
  return keys.has('arrowleft') || keys.has('a');
}

export function isTurnRight() {
  return keys.has('arrowright') || keys.has('d');
}

export function isFirePressed() {
  return _firePressedThisFrame;
}

export function isRestartPressed() {
  return _restartPressedThisFrame;
}
