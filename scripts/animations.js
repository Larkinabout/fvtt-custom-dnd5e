import { MODULE } from "./constants.js";
import { Logger } from "./utils.js";
import { COLOR_SPLIT_FS } from "./shaders/color-split.js";
import { FIRE_VS, FIRE_FS } from "./shaders/fire.js";
import { LIGHT_RAYS_VS, LIGHT_RAYS_FS } from "./shaders/light-rays.js";
import { SPLATTER_VS, SPLATTER_FS } from "./shaders/splatter.js";
import { WAVE_FS } from "./shaders/wave.js";

/* -------------------------------------------- */
/*  ANIMATIONS                                  */
/* -------------------------------------------- */

/**
 * Whether a socket is needed to reach any of the given user IDs.
 * @param {string[]} userIds
 * @returns {boolean}
 */
function requiresSocket(userIds) {
  return userIds.some(id => id !== game.user.id);
}

/* -------------------------------------------- */

/**
 * Local play animations by name.
 * @type {Record<string, Function>}
 */
const _playLocal = {};

/* -------------------------------------------- */

/**
 * Broadcast an animation to other targeted users when any of them are remote.
 * @param {string} type Animation name
 * @param {object} options
 */
function _broadcastAnimation(type, options) {
  const { userIds } = options;
  if ( userIds && requiresSocket(userIds) ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "animation", type, options });
  }
}

/* -------------------------------------------- */

/**
 * Whether this client is the target of an animation.
 * @param {string[]} [userIds]
 * @returns {boolean}
 */
function _isLocalTarget(userIds) {
  return !userIds || userIds.includes(game.user.id);
}

/* -------------------------------------------- */

/**
 * Play an animation locally.
 * @param {string} type Animation name
 * @param {object} options
 */
export function playLocalAnimation(type, options) {
  const render = _playLocal[type];
  if ( typeof render === "function" ) render(options);
}

/**
 * Parse hex color string to RGB floats array.
 * @param {string} hex
 * @returns {number[]}
 */
function parseHexColor(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  ];
}

/**
 * Compile a WebGL shader from source.
 * @param {WebGLRenderingContext} gl
 * @param {number} type
 * @param {string} source
 * @returns {WebGLShader}
 */
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

/* -------------------------------------------- */

/** Animation functions. */
export const animations = {};

/** Set of active animation handles. */
const _activeAnimations = new Set();

/** Maximum number of concurrent animations before auto-stopping. */
const MAX_CONCURRENT_ANIMATIONS = 10;

/** Timer ID for the stop-button delay. */
let _stopButtonTimer = null;

/** DOM reference to the stop button element. */
let _stopButtonElement = null;

/* -------------------------------------------- */

/**
 * Create a tracking handle, add it to the active set,
 * and start the 5-second stop-button timer if this is the first animation.
 * @returns {{ cancelled: boolean }}
 */
function _trackAnimation() {
  if ( _activeAnimations.size >= MAX_CONCURRENT_ANIMATIONS ) {
    Logger.error("Too many concurrent animations. Stopping all animations.");
    animations.stopAll();
  }
  const handle = { cancelled: false };
  _activeAnimations.add(handle);
  if ( _activeAnimations.size === 1 ) {
    _stopButtonTimer = setTimeout(_showStopButton, 5000);
  }
  return handle;
}

/* -------------------------------------------- */

/**
 * Remove a tracking handle from the active set.
 * Hide the stop button and clear the timer when no animations remain.
 * @param {{ cancelled: boolean }} handle
 */
function _untrackAnimation(handle) {
  _activeAnimations.delete(handle);
  if ( _activeAnimations.size === 0 ) _hideStopButton();
}

/* -------------------------------------------- */

/**
 * Active screen-wide effects.
 * @type {Map<string, object>}
 */
const _activeScreenEffects = new Map();

/* -------------------------------------------- */

/**
 * Run a screen effect instance.
 * @param {string} type Animation type
 * @param {object} state Instance state
 * @param {() => (Promise<void>|void)} run Bound effect runner
 * @returns {Promise<void>}
 */
function _runScreenEffect(type, state, run) {
  _activeScreenEffects.set(type, state);
  const cleanup = () => {
    if ( _activeScreenEffects.get(type) === state ) _activeScreenEffects.delete(type);
  };
  let promise;
  try {
    promise = Promise.resolve(run());
  } catch ( err ) {
    cleanup();
    throw err;
  }
  promise = promise.finally(cleanup);
  state.promise = promise;
  return promise;
}

/* -------------------------------------------- */

/**
 * Coalesce a screen effect with existing instances. If an instance of the given
 * type is already running, its parameters are refreshed and the promise is returned.
 * @param {string} type Animation type
 * @param {object} params
 * @param {(state: {params: object, startTime: number}) => (Promise<void>|void)} runner Effect runner
 * @returns {Promise<void>}
 */
function _coalesceScreenEffect(type, params, runner) {
  const existing = _activeScreenEffects.get(type);
  if ( existing ) {
    Object.assign(existing.params, params);
    return existing.promise;
  }
  const state = { params, startTime: performance.now() };
  return _runScreenEffect(type, state, () => runner(state));
}

/* -------------------------------------------- */

/**
 * Run a screen effect at most once concurrently. If an instance of the given
 * type is already active, the promise is returned and the call is dropped.
 * @param {string} type Animation type
 * @param {() => (Promise<void>|void)} runner
 * @returns {Promise<void>}
 */
function _singleScreenEffect(type, runner) {
  const existing = _activeScreenEffects.get(type);
  if ( existing ) return existing.promise;
  return _runScreenEffect(type, {}, runner);
}

/* -------------------------------------------- */

/**
 * Create and display the stop animations button.
 */
function _showStopButton() {
  if ( _stopButtonElement ) return;
  const btn = document.createElement("button");
  btn.setAttribute("data-custom-dnd5e", "stop-animations");
  btn.setAttribute("data-tooltip", game.i18n.localize("CUSTOM_DND5E.animation.stopAll"));
  btn.innerHTML = '<i class="fas fa-stop"></i>';
  btn.addEventListener("click", () => animations.stopAll());
  document.body.appendChild(btn);
  _stopButtonElement = btn;
}

/* -------------------------------------------- */

/**
 * Remove the stop animations button from the DOM and clear the timer.
 */
function _hideStopButton() {
  if ( _stopButtonTimer ) {
    clearTimeout(_stopButtonTimer);
    _stopButtonTimer = null;
  }
  if ( _stopButtonElement ) {
    const btn = _stopButtonElement;
    _stopButtonElement = null;
    btn.classList.add("fade-out");
    btn.addEventListener("animationend", () => btn.remove(), { once: true });
  }
}

/* -------------------------------------------- */

/**
 * Whether any animations are currently active.
 * @returns {boolean}
 */
animations.hasActive = function() {
  return _activeAnimations.size > 0;
};

/* -------------------------------------------- */

/**
 * Stop all running animations immediately.
 * @param {object} [options]
 * @param {boolean} [options.emit=false] Whether to emit a socket event to stop animations on other clients
 */
animations.stopAll = function({ emit = false } = {}) {
  for ( const handle of _activeAnimations ) handle.cancelled = true;
  _activeAnimations.clear();
  _activeScreenEffects.clear();

  if ( document.body ) {
    document.body.style.transform = "";
    document.body.style.filter = "";
  }

  CanvasAnimation.terminateAnimation("custom-dnd5e.shakeCanvas");
  CanvasAnimation.terminateAnimation("custom-dnd5e.flashCanvas.in");
  CanvasAnimation.terminateAnimation("custom-dnd5e.flashCanvas.out");

  for ( const el of document.querySelectorAll("[data-custom-dnd5e-animation]") ) {
    for ( const anim of el.getAnimations() ) anim.cancel();
  }

  _hideStopButton();

  if ( emit ) {
    game.socket.emit(`module.${MODULE.ID}`, { action: "stopAnimations" });
  }
};

/* -------------------------------------------- */

/**
 * Shake the canvas with decaying intensity.
 * @param {object} [options]
 * @param {number} [options.intensity=25]
 * @param {number} [options.duration=500]
 */
animations.shakeCanvas = async function({ intensity = 25, duration = 500 } = {}) {
  if ( !canvas?.stage ) return;
  const origin = { x: canvas.stage.pivot.x, y: canvas.stage.pivot.y };
  const scale = canvas.stage.scale.x || 1;
  const handle = _trackAnimation();

  await CanvasAnimation.animate([], {
    name: "custom-dnd5e.shakeCanvas",
    duration,
    ontick: (dt, animation) => {
      const progress = animation.time / duration;
      const decay = Math.pow(1 - progress, 2);
      const adjusted = intensity / scale;
      canvas.stage.pivot.x = origin.x + ((Math.random() - 0.5) * adjusted * decay);
      canvas.stage.pivot.y = origin.y + ((Math.random() - 0.5) * adjusted * decay);
    }
  });

  canvas.stage.pivot.set(origin.x, origin.y);
  _untrackAnimation(handle);
};

/* -------------------------------------------- */

/**
 * Flash the canvas with a color overlay.
 * Skipped when photosensitive mode is enabled.
 * @param {object} [options]
 * @param {number} [options.color=0xFF0000]
 * @param {number} [options.opacity=0.4]
 * @param {number} [options.duration=500]
 */
animations.flashCanvas = async function({ color = 0xFF0000, opacity = 0.4, duration = 500 } = {}) {
  if ( !canvas?.interface ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;

  const scale = canvas.stage.scale.x || 1;
  const { x: pivotX, y: pivotY } = canvas.stage.pivot;
  const w = canvas.app.screen.width / scale;
  const h = canvas.app.screen.height / scale;

  const flash = new PIXI.Graphics();
  flash.beginFill(color);
  flash.drawRect(pivotX - (w / 2), pivotY - (h / 2), w, h);
  flash.endFill();
  flash.alpha = 0;
  canvas.interface.addChild(flash);

  const fadeIn = duration * 0.2;
  const fadeOut = duration * 0.8;
  const handle = _trackAnimation();

  await CanvasAnimation.animate(
    [{ parent: flash, attribute: "alpha", to: opacity }],
    { duration: fadeIn, name: "custom-dnd5e.flashCanvas.in" }
  );
  if ( !handle.cancelled ) {
    await CanvasAnimation.animate(
      [{ parent: flash, attribute: "alpha", to: 0 }],
      { duration: fadeOut, name: "custom-dnd5e.flashCanvas.out" }
    );
  }

  canvas.interface.removeChild(flash);
  flash.destroy();
  _untrackAnimation(handle);
};

/* -------------------------------------------- */

/**
 * Shake the entire screen with decaying intensity.
 * @param {object} [options]
 * @param {number} [options.intensity=5]
 * @param {number} [options.duration=500]
 * @param {string[]} [options.userIds] Only play for these users
 * @returns {Promise<void>}
 */
_playLocal.shakeScreen = async function({ intensity = 5, duration = 500, userIds } = {}) {
  if ( !_isLocalTarget(userIds) ) return;

  return _coalesceScreenEffect("shakeScreen", { intensity, duration }, state => {
    const element = document.body;
    const handle = _trackAnimation();

    return new Promise(resolve => {
      /**
       * Animation frame handler.
       * @param {number} currentTime
       */
      function animate(currentTime) {
        const { intensity, duration } = state.params;
        const elapsed = currentTime - state.startTime;
        const progress = elapsed / duration;

        if ( progress >= 1 || handle.cancelled ) {
          element.style.transform = "";
          _untrackAnimation(handle);
          resolve();
          return;
        }

        const decayDuration = Math.min(duration, 1000);
        const decayProgress = Math.min(elapsed / decayDuration, 1);
        const decay = Math.pow(1 - decayProgress, 2);
        const x = (Math.random() - 0.5) * intensity * decay;
        const y = (Math.random() - 0.5) * intensity * decay;
        element.style.transform = `translate(${x}px, ${y}px)`;
        requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
    });
  });
};

/* -------------------------------------------- */

/**
 * Flash the entire screen with a color overlay.
 * Skipped when photosensitive mode is enabled.
 * @param {object} [options]
 * @param {string} [options.color="#ff0000"]
 * @param {number} [options.opacity=0.4]
 * @param {number} [options.fadeIn] Fade-in ms.
 * @param {number} [options.duration=500] Hold ms (or total when fadeIn/fadeOut omitted).
 * @param {number} [options.fadeOut] Fade-out ms.
 * @param {number} [options.zIndex=10000] CSS z-index for the overlay element.
 * @param {string[]} [options.userIds] Only play for these users.
 * @returns {Promise<void>}
 */
_playLocal.flashScreen = async function({ color = "#ff0000", opacity = 0.4, fadeIn, duration = 500, fadeOut, zIndex = 10000, userIds } = {}) {
  if ( !_isLocalTarget(userIds) ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;

  return _singleScreenEffect("flashScreen", async () => {
    const flash = document.createElement("div");
    flash.setAttribute("data-custom-dnd5e-animation", "");
    flash.style.cssText = `
      position: fixed;
      inset: 0;
      background: ${color};
      opacity: 0;
      pointer-events: none;
      z-index: ${zIndex};
    `;
    document.body.appendChild(flash);

    const explicitTiming = fadeIn !== undefined || fadeOut !== undefined;
    const fadeInMs = fadeIn ?? Math.min(duration * 0.2, 200);
    const fadeOutMs = fadeOut ?? Math.min(duration * 0.8, 800);
    const holdMs = explicitTiming ? duration : 0;
    const handle = _trackAnimation();

    try {
      await flash.animate(
        [{ opacity: 0 }, { opacity }],
        { duration: fadeInMs, fill: "forwards" }
      ).finished;
      if ( !handle.cancelled && holdMs > 0 ) {
        await flash.animate(
          [{ opacity }, { opacity }],
          { duration: holdMs, fill: "forwards" }
        ).finished;
      }
      if ( !handle.cancelled ) {
        await flash.animate(
          [{ opacity }, { opacity: 0 }],
          { duration: fadeOutMs, fill: "forwards" }
        ).finished;
      }
    } catch {
      // Animation was cancelled via stopAll
    } finally {
      flash.remove();
      _untrackAnimation(handle);
    }
  });
};

/* -------------------------------------------- */

/**
 * Blur the entire screen.
 * @param {object} [options]
 * @param {number} [options.intensity=5]
 * @param {number} [options.fadeIn] Fade-in ms.
 * @param {number} [options.duration=1500] Hold ms (or total when fadeIn/fadeOut omitted).
 * @param {number} [options.fadeOut] Fade-out ms. Default: min(duration × 0.5, 1000).
 * @param {string[]} [options.userIds] Only play for these users.
 * @returns {Promise<void>}
 */
_playLocal.blurScreen = async function({ intensity = 5, fadeIn, duration = 1500, fadeOut, userIds } = {}) {
  if ( !_isLocalTarget(userIds) ) return;

  return _coalesceScreenEffect("blurScreen", { intensity, fadeIn, duration, fadeOut }, state => {
    const element = document.body;
    const handle = _trackAnimation();

    return new Promise(resolve => {
      /**
       * Animation frame handler.
       * @param {number} currentTime
       */
      function animate(currentTime) {
        const { intensity, fadeIn, duration, fadeOut } = state.params;
        const explicitTiming = fadeIn !== undefined || fadeOut !== undefined;
        const fadeInMs = fadeIn ?? Math.min(duration * 0.5, 500);
        const fadeOutMs = fadeOut ?? Math.min(duration * 0.5, 1000);
        const holdMs = explicitTiming ? duration : 0;
        const totalMs = explicitTiming ? fadeInMs + holdMs + fadeOutMs : duration;
        const elapsed = currentTime - state.startTime;

        if ( elapsed >= totalMs || handle.cancelled ) {
          element.style.filter = "";
          _untrackAnimation(handle);
          resolve();
          return;
        }

        let env;
        if ( elapsed < fadeInMs ) env = elapsed / fadeInMs;
        else if ( elapsed > totalMs - fadeOutMs ) env = (totalMs - elapsed) / fadeOutMs;
        else env = 1.0;
        env = Math.max(0, Math.min(1, env));

        const blur = intensity * env;
        element.style.filter = `blur(${blur}px)`;
        requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
    });
  });
};

/* -------------------------------------------- */

/**
 * Blur the game canvas using a PIXI BlurFilter.
 * @param {object} [options]
 * @param {number} [options.intensity=5]
 * @param {number} [options.duration=1500]
 * @param {string[]} [options.userIds] Only play for these users
 */
_playLocal.blurCanvas = async function({ intensity = 5, duration = 1500, userIds } = {}) {
  if ( !_isLocalTarget(userIds) ) return;
  if ( typeof canvas === "undefined" || !canvas?.stage ) return;

  const filter = new PIXI.BlurFilter(0);

  if ( !canvas.stage.filterArea ) {
    canvas.stage.filterArea = canvas.app.renderer.screen;
  }

  const existing = canvas.stage.filters || [];
  canvas.stage.filters = [...existing, filter];

  const fadeIn = Math.min(duration * 0.5, 500);
  const fadeOut = Math.min(duration * 0.5, 1000);
  const startTime = performance.now();
  const handle = _trackAnimation();

  return new Promise(resolve => {
    /**
     * Animation frame handler.
     * @param {number} currentTime
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      if ( progress >= 1.0 || handle.cancelled ) {
        canvas.stage.filters = (canvas.stage.filters || []).filter(f => f !== filter);
        filter.destroy();
        _untrackAnimation(handle);
        resolve();
        return;
      }

      let env;
      if ( elapsed < fadeIn ) env = elapsed / fadeIn;
      else if ( elapsed > duration - fadeOut ) env = (duration - elapsed) / fadeOut;
      else env = 1.0;
      env = Math.max(0, Math.min(1, env));

      filter.blur = intensity * env;

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};

/* -------------------------------------------- */

/**
 * Sway the entire screen.
 * @param {object} [options]
 * @param {number} [options.intensity=2] Max rotation in degrees
 * @param {number} [options.duration=2000]
 * @param {number} [options.frequency=2] Oscillation cycles per second
 * @param {string[]} [options.userIds] Only play for these users
 * @returns {Promise<void>}
 */
_playLocal.swayScreen = async function({ intensity = 2, duration = 2000, frequency = 2, userIds } = {}) {
  if ( !_isLocalTarget(userIds) ) return;

  return _coalesceScreenEffect("swayScreen", { intensity, duration, frequency }, state => {
    const element = document.body;
    const handle = _trackAnimation();

    return new Promise(resolve => {
      /**
       * Animation frame handler.
       * @param {number} currentTime
       */
      function animate(currentTime) {
        const { intensity, duration, frequency } = state.params;
        const elapsed = currentTime - state.startTime;
        const progress = elapsed / duration;

        if ( progress >= 1 || handle.cancelled ) {
          element.style.transform = "";
          _untrackAnimation(handle);
          resolve();
          return;
        }

        const decayDuration = Math.min(duration, 2000);
        const decayProgress = Math.min(elapsed / decayDuration, 1);
        const decay = Math.pow(1 - decayProgress, 2);
        const angle = Math.sin(elapsed / 1000 * Math.PI * frequency) * intensity * decay;
        const x = Math.sin(elapsed / 1000 * Math.PI * frequency * 0.7) * intensity * 2 * decay;
        element.style.transform = `rotate(${angle}deg) translateX(${x}px)`;
        requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
    });
  });
};

/* -------------------------------------------- */

/**
 * Play a light rays screen effect.
 * @param {object} [options]
 * @param {string} [options.color="#fff5d6"]
 * @param {number} [options.rays=12]
 * @param {number} [options.duration=2500]
 * @param {number} [options.zIndex=10000] CSS z-index for the overlay element.
 * @param {string[]} [options.userIds] Only play for these users.
 * @returns {Promise<void>}
 */
_playLocal.lightRaysScreen = async function({ color = "#fff5d6", rays = 12, duration = 2500, zIndex = 10000, userIds } = {}) {
  if ( !_isLocalTarget(userIds) ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;

  return _singleScreenEffect("lightRaysScreen", () => {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: ${zIndex};
    `;
    document.body.appendChild(canvas);
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = canvas.getContext("webgl");
    if ( !gl ) {
      canvas.remove();
      return;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, LIGHT_RAYS_VS);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, LIGHT_RAYS_FS);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uFade = gl.getUniformLocation(program, "u_fade");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uColor = gl.getUniformLocation(program, "u_color");
    const uRays = gl.getUniformLocation(program, "u_rays");
    const uSeed = gl.getUniformLocation(program, "u_seed");

    const [r, g, b] = parseHexColor(color);

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform3f(uColor, r, g, b);
    gl.uniform1f(uRays, rays);
    gl.uniform1f(uSeed, Math.random() * 100.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const fadeIn = Math.min(duration * 0.3, 500);
    const fadeOut = Math.min(duration * 0.7, 1500);

    const startTime = performance.now();
    const handle = _trackAnimation();

    return new Promise(resolve => {
      /**
       * Animation frame handler.
       * @param {number} currentTime
       */
      function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1.0);

        if ( progress >= 1.0 || handle.cancelled ) {
          gl.deleteProgram(program);
          gl.deleteShader(vs);
          gl.deleteShader(fs);
          gl.deleteBuffer(buffer);
          canvas.remove();
          _untrackAnimation(handle);
          resolve();
          return;
        }

        let fade;
        if ( elapsed < fadeIn ) {
          fade = elapsed / fadeIn;
        } else if ( elapsed > duration - fadeOut ) {
          fade = (duration - elapsed) / fadeOut;
        } else {
          fade = 1.0;
        }
        fade = Math.max(0, Math.min(1, fade));

        gl.uniform1f(uTime, progress);
        gl.uniform1f(uFade, fade);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
    });
  });
};

/* -------------------------------------------- */

/**
 * Play a liquid splatter screen effect.
 * @param {object} [options]
 * @param {string} [options.color="#8b0000"]
 * @param {number} [options.density=10] Number of splat impacts (max 20)
 * @param {number} [options.duration=3500]
 * @param {number} [options.fluidity=1.0] Drip fluidity 0 (frozen) to 2 (watery)
 * @param {number} [options.zIndex=10000] CSS z-index for the overlay element
 * @param {string[]} [options.userIds] Only play for these users
 * @returns {Promise<void>}
 */
_playLocal.splatterScreen = async function({ color = "#8b0000", density = 10, duration = 3500, fluidity = 1.0, zIndex = 10000, userIds } = {}) {
  if ( !_isLocalTarget(userIds) ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;

  return _singleScreenEffect("splatterScreen", () => {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: ${zIndex};
    `;
    document.body.appendChild(canvas);
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = canvas.getContext("webgl");
    if ( !gl ) {
      canvas.remove();
      return;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, SPLATTER_VS);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, SPLATTER_FS);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uFade = gl.getUniformLocation(program, "u_fade");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uColor = gl.getUniformLocation(program, "u_color");
    const uSeed = gl.getUniformLocation(program, "u_seed");
    const uDensity = gl.getUniformLocation(program, "u_density");
    const uFluidity = gl.getUniformLocation(program, "u_fluidity");

    const [r, g, b] = parseHexColor(color);

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform3f(uColor, r, g, b);
    gl.uniform1f(uSeed, Math.random() * 100.0);
    gl.uniform1f(uDensity, Math.max(1, Math.min(20, density)));
    gl.uniform1f(uFluidity, Math.max(0, Math.min(2, fluidity)));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const fadeOut = Math.min(duration * 0.6, 2000);

    const startTime = performance.now();
    const handle = _trackAnimation();

    return new Promise(resolve => {
      /**
       * Animation frame handler.
       * @param {number} currentTime
       */
      function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1.0);

        if ( progress >= 1.0 || handle.cancelled ) {
          gl.deleteProgram(program);
          gl.deleteShader(vs);
          gl.deleteShader(fs);
          gl.deleteBuffer(buffer);
          canvas.remove();
          _untrackAnimation(handle);
          resolve();
          return;
        }

        const fade = elapsed > duration - fadeOut
          ? Math.max(0, (duration - elapsed) / fadeOut)
          : 1.0;

        gl.uniform1f(uTime, elapsed / 1000);
        gl.uniform1f(uFade, fade);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
    });
  });
};

/* -------------------------------------------- */

/**
 * Play a color-split screen effect.
 * @param {object} [options]
 * @param {string[]} [options.colors=["#ff0000","#00ff00","#0000ff"]] Up to three hex colors
 * @param {number} [options.intensity=25] Maximum pixel offset
 * @param {number} [options.duration=4000]
 * @param {string[]} [options.userIds] Only play for these users
 */
_playLocal.colorSplitCanvas = async function({ colors = ["#ff0000", "#00ff00", "#0000ff"], intensity = 25, duration = 4000, userIds } = {}) {
  if ( !_isLocalTarget(userIds) ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;
  if ( typeof canvas === "undefined" || !canvas?.stage ) return;

  const rgb = colors.slice(0, 3).map(parseHexColor);
  while ( rgb.length < 3 ) rgb.push(rgb.length === 1 ? [0, 1, 0] : [0, 0, 1]);

  const filter = new PIXI.Filter(undefined, COLOR_SPLIT_FS, {
    u_offset0: new Float32Array([0, 0]),
    u_offset1: new Float32Array([0, 0]),
    u_offset2: new Float32Array([0, 0]),
    u_color0: new Float32Array(rgb[0]),
    u_color1: new Float32Array(rgb[1]),
    u_color2: new Float32Array(rgb[2]),
    u_env: 0
  });
  filter.padding = intensity;

  if ( !canvas.stage.filterArea ) {
    canvas.stage.filterArea = canvas.app.renderer.screen;
  }

  const existing = canvas.stage.filters || [];
  canvas.stage.filters = [...existing, filter];

  const arcs = [
    { fx: 1.0, fy: 1.3, px: 0, py: 0 },
    { fx: 1.7, fy: 0.9, px: 2.094, py: 1.047 },
    { fx: 0.8, fy: 1.6, px: 4.189, py: 3.142 }
  ];

  const startTime = performance.now();
  const handle = _trackAnimation();

  return new Promise(resolve => {
    /**
     * Animation frame handler.
     * @param {number} currentTime
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      if ( progress >= 1.0 || handle.cancelled ) {
        canvas.stage.filters = (canvas.stage.filters || []).filter(f => f !== filter);
        filter.destroy();
        _untrackAnimation(handle);
        resolve();
        return;
      }

      const env = Math.sin(progress * Math.PI);
      const amp = intensity * env;
      const t = progress * Math.PI * 2 * 1.5;

      for ( let i = 0; i < 3; i++ ) {
        const arc = arcs[i];
        filter.uniforms[`u_offset${i}`][0] = Math.cos((t * arc.fx) + arc.px) * amp;
        filter.uniforms[`u_offset${i}`][1] = Math.sin((t * arc.fy) + arc.py) * amp;
      }

      filter.uniforms.u_env = env;

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};

/* -------------------------------------------- */

/**
 * Play a vignette effect to darken edges of screen.
 * @param {object} [options]
 * @param {number} [options.intensity=0.8]
 * @param {number} [options.duration=2000]
 * @param {number} [options.zIndex=10000] CSS z-index for the overlay element.
 * @param {string[]} [options.userIds] Only play for these users.
 * @returns {Promise<void>}
 */
_playLocal.vignetteScreen = async function({ intensity = 0.8, duration = 2000, zIndex = 10000, userIds } = {}) {
  if ( !_isLocalTarget(userIds) ) return;

  return _singleScreenEffect("vignetteScreen", () => {
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: ${zIndex};
    `;
    document.body.appendChild(overlay);

    const fadeIn = Math.min(duration * 0.5, 500);
    const fadeOut = Math.min(duration * 0.5, 1000);
    const startTime = performance.now();
    const handle = _trackAnimation();

    return new Promise(resolve => {
      /**
       * Animation frame handler.
       * @param {number} currentTime
       */
      function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = elapsed / duration;

        if ( progress >= 1 || handle.cancelled ) {
          overlay.remove();
          _untrackAnimation(handle);
          resolve();
          return;
        }

        let env;
        if ( elapsed < fadeIn ) env = elapsed / fadeIn;
        else if ( elapsed > duration - fadeOut ) env = (duration - elapsed) / fadeOut;
        else env = 1.0;
        env = Math.max(0, Math.min(1, env));

        const amount = env * intensity;
        const innerRadius = 50 - (amount * 30);
        const outerRadius = 80 - (amount * 20);
        const edgeOpacity = Math.min(amount * 1.5, 1);
        overlay.style.background = `radial-gradient(circle at center, transparent ${innerRadius}%, rgba(0,0,0,${amount}) ${outerRadius}%, rgba(0,0,0,${edgeOpacity}) 100%)`;
        requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
    });
  });
};

/* -------------------------------------------- */

/**
 * Play a fire screen effect with flames, floating embers, sparks, and smoke.
 * @param {object} [options]
 * @param {string} [options.color="#ff6600"] Base colour as a CSS hex string.
 * @param {number} [options.intensity=4] Overall intensity (1–10).
 * @param {number} [options.sparkFrequency=2] Base spark frequency (1–10).
 * @param {number} [options.smokeOpacity=0.4] Smoke layer opacity (0–1).
 * @param {number} [options.duration=5000] Total duration in milliseconds.
 * @param {number} [options.fadeIn] Fade-in duration in ms.
 * @param {number} [options.fadeOut] Fade-out duration in ms.
 * @param {number} [options.zIndex=10000] CSS z-index for the overlay element.
 * @param {string[]} [options.userIds] Only play for these users.
 * @returns {Promise<void>}
 */
_playLocal.fireScreen = async function({
  color = "#ff6600", intensity = 4, sparkFrequency = 2,
  smokeOpacity = 0.4, duration = 5000, fadeIn, fadeOut, zIndex = 10000, userIds
} = {}) {
  if ( !_isLocalTarget(userIds) ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;

  return _singleScreenEffect("fireScreen", () => {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: ${zIndex};
    `;
    document.body.appendChild(canvas);
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const gl = canvas.getContext("webgl");
    if ( !gl ) {
      canvas.remove();
      return;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, FIRE_VS);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FIRE_FS);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uFade = gl.getUniformLocation(program, "u_fade");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uColor = gl.getUniformLocation(program, "u_color");
    const uSeed = gl.getUniformLocation(program, "u_seed");
    const uIntensity = gl.getUniformLocation(program, "u_intensity");
    const uSparkFrequency = gl.getUniformLocation(program, "u_sparkFrequency");
    const uSmokeOpacity = gl.getUniformLocation(program, "u_smokeOpacity");

    const [r, g, b] = parseHexColor(color);

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform3f(uColor, r, g, b);
    gl.uniform1f(uSeed, Math.random() * 100.0);
    gl.uniform1f(uIntensity, (Math.max(1, Math.min(10, intensity)) - 1) / 3);
    gl.uniform1f(uSparkFrequency, Math.max(1, Math.min(10, sparkFrequency)) / 10);
    gl.uniform1f(uSmokeOpacity, Math.max(0, Math.min(1, smokeOpacity)));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    fadeIn = fadeIn ?? Math.min(duration * 0.15, 500);
    fadeOut = fadeOut ?? Math.min(duration * 0.4, 2000);

    const startTime = performance.now();
    const handle = _trackAnimation();

    return new Promise(resolve => {
      /**
       * Animation frame handler.
       * @param {number} currentTime
       */
      function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1.0);

        if ( progress >= 1.0 || handle.cancelled ) {
          gl.deleteProgram(program);
          gl.deleteShader(vs);
          gl.deleteShader(fs);
          gl.deleteBuffer(buffer);
          canvas.remove();
          _untrackAnimation(handle);
          resolve();
          return;
        }

        let fade;
        if ( elapsed < fadeIn ) {
          fade = elapsed / fadeIn;
        } else if ( elapsed > duration - fadeOut ) {
          fade = (duration - elapsed) / fadeOut;
        } else {
          fade = 1.0;
        }
        fade = Math.max(0, Math.min(1, fade));

        gl.uniform1f(uTime, elapsed / 1000);
        gl.uniform1f(uFade, fade);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
    });
  });
};

/* -------------------------------------------- */

/**
 * Play a wave distortion screen effect.
 * @param {object} [options]
 * @param {number} [options.intensity=30] Maximum displacement in pixels.
 * @param {number} [options.speed=1] Animation speed multiplier.
 * @param {number} [options.duration=4000]
 * @param {string[]} [options.userIds] Only play for these users.
 */
_playLocal.waveCanvas = async function({ intensity = 30, speed = 1, duration = 4000, userIds } = {}) {
  if ( !_isLocalTarget(userIds) ) return;
  if ( game.settings.get("core", "photosensitiveMode") ) return;
  if ( typeof canvas === "undefined" || !canvas?.stage ) return;

  const filter = new PIXI.Filter(undefined, WAVE_FS, {
    u_time: 0,
    u_intensity: 0
  });
  filter.padding = intensity;

  if ( !canvas.stage.filterArea ) {
    canvas.stage.filterArea = canvas.app.renderer.screen;
  }

  const existing = canvas.stage.filters || [];
  canvas.stage.filters = [...existing, filter];

  const startTime = performance.now();
  const handle = _trackAnimation();

  return new Promise(resolve => {
    /**
     * Animation frame handler.
     * @param {number} currentTime
     */
    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      if ( progress >= 1.0 || handle.cancelled ) {
        canvas.stage.filters = (canvas.stage.filters || []).filter(f => f !== filter);
        filter.destroy();
        _untrackAnimation(handle);
        resolve();
        return;
      }

      const sine = Math.sin(progress * Math.PI);
      const env = sine * sine;

      filter.uniforms.u_time = (elapsed / 1000) * speed;
      filter.uniforms.u_intensity = intensity * env;

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  });
};

/* -------------------------------------------- */

// Public API.
// Build each animation function to broadcast to remote targets, then render locally.
for ( const type of Object.keys(_playLocal) ) {
  animations[type] = function(options = {}) {
    _broadcastAnimation(type, options);
    return _playLocal[type](options);
  };
}
