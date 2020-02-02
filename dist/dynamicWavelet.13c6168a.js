// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"../node_modules/comlink/dist/esm/comlink.mjs":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.expose = expose;
exports.proxy = proxy;
exports.transfer = transfer;
exports.windowEndpoint = windowEndpoint;
exports.wrap = wrap;
exports.transferHandlers = exports.releaseProxy = exports.proxyMarker = exports.createEndpoint = void 0;

/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const proxyMarker = Symbol("Comlink.proxy");
exports.proxyMarker = proxyMarker;
const createEndpoint = Symbol("Comlink.endpoint");
exports.createEndpoint = createEndpoint;
const releaseProxy = Symbol("Comlink.releaseProxy");
exports.releaseProxy = releaseProxy;
const throwSet = new WeakSet();
const transferHandlers = new Map([["proxy", {
  canHandle: obj => obj && obj[proxyMarker],

  serialize(obj) {
    const {
      port1,
      port2
    } = new MessageChannel();
    expose(obj, port1);
    return [port2, [port2]];
  },

  deserialize: port => {
    port.start();
    return wrap(port);
  }
}], ["throw", {
  canHandle: obj => throwSet.has(obj),

  serialize(obj) {
    const isError = obj instanceof Error;
    let serialized = obj;

    if (isError) {
      serialized = {
        isError,
        message: obj.message,
        stack: obj.stack
      };
    }

    return [serialized, []];
  },

  deserialize(obj) {
    if (obj.isError) {
      throw Object.assign(new Error(), obj);
    }

    throw obj;
  }

}]]);
exports.transferHandlers = transferHandlers;

function expose(obj, ep = self) {
  ep.addEventListener("message", function callback(ev) {
    if (!ev || !ev.data) {
      return;
    }

    const {
      id,
      type,
      path
    } = Object.assign({
      path: []
    }, ev.data);
    const argumentList = (ev.data.argumentList || []).map(fromWireValue);
    let returnValue;

    try {
      const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
      const rawValue = path.reduce((obj, prop) => obj[prop], obj);

      switch (type) {
        case 0
        /* GET */
        :
          {
            returnValue = rawValue;
          }
          break;

        case 1
        /* SET */
        :
          {
            parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
            returnValue = true;
          }
          break;

        case 2
        /* APPLY */
        :
          {
            returnValue = rawValue.apply(parent, argumentList);
          }
          break;

        case 3
        /* CONSTRUCT */
        :
          {
            const value = new rawValue(...argumentList);
            returnValue = proxy(value);
          }
          break;

        case 4
        /* ENDPOINT */
        :
          {
            const {
              port1,
              port2
            } = new MessageChannel();
            expose(obj, port2);
            returnValue = transfer(port1, [port1]);
          }
          break;

        case 5
        /* RELEASE */
        :
          {
            returnValue = undefined;
          }
          break;
      }
    } catch (e) {
      returnValue = e;
      throwSet.add(e);
    }

    Promise.resolve(returnValue).catch(e => {
      throwSet.add(e);
      return e;
    }).then(returnValue => {
      const [wireValue, transferables] = toWireValue(returnValue);
      ep.postMessage(Object.assign(Object.assign({}, wireValue), {
        id
      }), transferables);

      if (type === 5
      /* RELEASE */
      ) {
          // detach and deactive after sending release response above.
          ep.removeEventListener("message", callback);
          closeEndPoint(ep);
        }
    });
  });

  if (ep.start) {
    ep.start();
  }
}

function isMessagePort(endpoint) {
  return endpoint.constructor.name === "MessagePort";
}

function closeEndPoint(endpoint) {
  if (isMessagePort(endpoint)) endpoint.close();
}

function wrap(ep, target) {
  return createProxy(ep, [], target);
}

function throwIfProxyReleased(isReleased) {
  if (isReleased) {
    throw new Error("Proxy has been released and is not useable");
  }
}

function createProxy(ep, path = [], target = function () {}) {
  let isProxyReleased = false;
  const proxy = new Proxy(target, {
    get(_target, prop) {
      throwIfProxyReleased(isProxyReleased);

      if (prop === releaseProxy) {
        return () => {
          return requestResponseMessage(ep, {
            type: 5
            /* RELEASE */
            ,
            path: path.map(p => p.toString())
          }).then(() => {
            closeEndPoint(ep);
            isProxyReleased = true;
          });
        };
      }

      if (prop === "then") {
        if (path.length === 0) {
          return {
            then: () => proxy
          };
        }

        const r = requestResponseMessage(ep, {
          type: 0
          /* GET */
          ,
          path: path.map(p => p.toString())
        }).then(fromWireValue);
        return r.then.bind(r);
      }

      return createProxy(ep, [...path, prop]);
    },

    set(_target, prop, rawValue) {
      throwIfProxyReleased(isProxyReleased); // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
      // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯

      const [value, transferables] = toWireValue(rawValue);
      return requestResponseMessage(ep, {
        type: 1
        /* SET */
        ,
        path: [...path, prop].map(p => p.toString()),
        value
      }, transferables).then(fromWireValue);
    },

    apply(_target, _thisArg, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const last = path[path.length - 1];

      if (last === createEndpoint) {
        return requestResponseMessage(ep, {
          type: 4
          /* ENDPOINT */

        }).then(fromWireValue);
      } // We just pretend that `bind()` didn’t happen.


      if (last === "bind") {
        return createProxy(ep, path.slice(0, -1));
      }

      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: 2
        /* APPLY */
        ,
        path: path.map(p => p.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    },

    construct(_target, rawArgumentList) {
      throwIfProxyReleased(isProxyReleased);
      const [argumentList, transferables] = processArguments(rawArgumentList);
      return requestResponseMessage(ep, {
        type: 3
        /* CONSTRUCT */
        ,
        path: path.map(p => p.toString()),
        argumentList
      }, transferables).then(fromWireValue);
    }

  });
  return proxy;
}

function myFlat(arr) {
  return Array.prototype.concat.apply([], arr);
}

function processArguments(argumentList) {
  const processed = argumentList.map(toWireValue);
  return [processed.map(v => v[0]), myFlat(processed.map(v => v[1]))];
}

const transferCache = new WeakMap();

function transfer(obj, transfers) {
  transferCache.set(obj, transfers);
  return obj;
}

function proxy(obj) {
  return Object.assign(obj, {
    [proxyMarker]: true
  });
}

function windowEndpoint(w, context = self, targetOrigin = "*") {
  return {
    postMessage: (msg, transferables) => w.postMessage(msg, targetOrigin, transferables),
    addEventListener: context.addEventListener.bind(context),
    removeEventListener: context.removeEventListener.bind(context)
  };
}

function toWireValue(value) {
  for (const [name, handler] of transferHandlers) {
    if (handler.canHandle(value)) {
      const [serializedValue, transferables] = handler.serialize(value);
      return [{
        type: 3
        /* HANDLER */
        ,
        name,
        value: serializedValue
      }, transferables];
    }
  }

  return [{
    type: 0
    /* RAW */
    ,
    value
  }, transferCache.get(value) || []];
}

function fromWireValue(value) {
  switch (value.type) {
    case 3
    /* HANDLER */
    :
      return transferHandlers.get(value.name).deserialize(value.value);

    case 0
    /* RAW */
    :
      return value.value;
  }
}

function requestResponseMessage(ep, msg, transfers) {
  return new Promise(resolve => {
    const id = generateUUID();
    ep.addEventListener("message", function l(ev) {
      if (!ev.data || !ev.data.id || ev.data.id !== id) {
        return;
      }

      ep.removeEventListener("message", l);
      resolve(ev.data);
    });

    if (ep.start) {
      ep.start();
    }

    ep.postMessage(Object.assign({
      id
    }, msg), transfers);
  });
}

function generateUUID() {
  return new Array(4).fill(0).map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16)).join("-");
}
},{}],"dynamicWavelet.js":[function(require,module,exports) {
"use strict";

var Comlink = _interopRequireWildcard(require("comlink"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const DEFAULT_SAMPLE_RATE = 44100;
const MAX_FLWT_LEVELS = 6;
const MAX_F = 3000;
const DIFFERENCE_LEVELS_N = 3;
const MAXIMA_THRESHOLD_RATIO = 0.75;

function detectDynamicWavelet(float32AudioBuffer, config = {}) {
  const sampleRate = config.sampleRate || DEFAULT_SAMPLE_RATE;
  const mins = [];
  const maxs = [];
  const bufferLength = float32AudioBuffer.length;
  let freq = null;
  let theDC = 0;
  let minValue = 0;
  let maxValue = 0; // Compute max amplitude, amplitude threshold, and the DC.

  for (let i = 0; i < bufferLength; i++) {
    const sample = float32AudioBuffer[i];
    theDC = theDC + sample;
    maxValue = Math.max(maxValue, sample);
    minValue = Math.min(minValue, sample);
  }

  theDC /= bufferLength;
  minValue -= theDC;
  maxValue -= theDC;
  const amplitudeMax = maxValue > -1 * minValue ? maxValue : -1 * minValue;
  const amplitudeThreshold = amplitudeMax * MAXIMA_THRESHOLD_RATIO; // levels, start without downsampling...

  let curLevel = 0;
  let curModeDistance = -1;
  let curSamNb = float32AudioBuffer.length;
  let delta, nbMaxs, nbMins; // Search:

  while (true) {
    delta = ~~(sampleRate / (Math.pow(2, curLevel) * MAX_F));
    if (curSamNb < 2) break;
    let dv;
    let previousDV = -1000;
    let lastMinIndex = -1000000;
    let lastMaxIndex = -1000000;
    let findMax = false;
    let findMin = false;
    nbMins = 0;
    nbMaxs = 0;

    for (let i = 2; i < curSamNb; i++) {
      const si = float32AudioBuffer[i] - theDC;
      const si1 = float32AudioBuffer[i - 1] - theDC;
      if (si1 <= 0 && si > 0) findMax = true;
      if (si1 >= 0 && si < 0) findMin = true; // min or max ?

      dv = si - si1;

      if (previousDV > -1000) {
        if (findMin && previousDV < 0 && dv >= 0) {
          // minimum
          if (Math.abs(si) >= amplitudeThreshold) {
            if (i > lastMinIndex + delta) {
              mins[nbMins++] = i;
              lastMinIndex = i;
              findMin = false;
            }
          }
        }

        if (findMax && previousDV > 0 && dv <= 0) {
          // maximum
          if (Math.abs(si) >= amplitudeThreshold) {
            if (i > lastMaxIndex + delta) {
              maxs[nbMaxs++] = i;
              lastMaxIndex = i;
              findMax = false;
            }
          }
        }
      }

      previousDV = dv;
    }

    if (nbMins === 0 && nbMaxs === 0) {
      // No best distance found!
      break;
    }

    let d;
    const distances = [];

    for (let i = 0; i < curSamNb; i++) {
      distances[i] = 0;
    }

    for (let i = 0; i < nbMins; i++) {
      for (let j = 1; j < DIFFERENCE_LEVELS_N; j++) {
        if (i + j < nbMins) {
          d = Math.abs(mins[i] - mins[i + j]);
          distances[d] += 1;
        }
      }
    }

    let bestDistance = -1;
    let bestValue = -1;

    for (let i = 0; i < curSamNb; i++) {
      let summed = 0;

      for (let j = -1 * delta; j <= delta; j++) {
        if (i + j >= 0 && i + j < curSamNb) {
          summed += distances[i + j];
        }
      }

      if (summed === bestValue) {
        if (i === 2 * bestDistance) {
          bestDistance = i;
        }
      } else if (summed > bestValue) {
        bestValue = summed;
        bestDistance = i;
      }
    } // averaging


    let distAvg = 0;
    let nbDists = 0;

    for (let j = -delta; j <= delta; j++) {
      if (bestDistance + j >= 0 && bestDistance + j < bufferLength) {
        const nbDist = distances[bestDistance + j];

        if (nbDist > 0) {
          nbDists += nbDist;
          distAvg += (bestDistance + j) * nbDist;
        }
      }
    } // This is our mode distance.


    distAvg /= nbDists; // Continue the levels?

    if (curModeDistance > -1) {
      if (Math.abs(distAvg * 2 - curModeDistance) <= 2 * delta) {
        // two consecutive similar mode distances : ok !
        freq = sampleRate / (Math.pow(2, curLevel - 1) * curModeDistance);
        break;
      }
    } // not similar, continue next level;


    curModeDistance = distAvg;
    curLevel++;

    if (curLevel >= MAX_FLWT_LEVELS || curSamNb < 2) {
      break;
    } //do not modify original audio buffer, make a copy buffer, if
    //downsampling is needed (only once).


    let newFloat32AudioBuffer = float32AudioBuffer.subarray(0);

    if (curSamNb === distances.length) {
      newFloat32AudioBuffer = new Float32Array(curSamNb / 2);
    }

    for (let i = 0; i < curSamNb / 2; i++) {
      newFloat32AudioBuffer[i] = (float32AudioBuffer[2 * i] + float32AudioBuffer[2 * i + 1]) / 2;
    }

    float32AudioBuffer = newFloat32AudioBuffer;
    curSamNb /= 2;
  }

  return freq;
}

const obj = {
  detectDynamicWavelet
};
Comlink.expose(obj);
},{"comlink":"../node_modules/comlink/dist/esm/comlink.mjs"}],"../node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "57443" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["../node_modules/parcel-bundler/src/builtins/hmr-runtime.js","dynamicWavelet.js"], null)
//# sourceMappingURL=/dynamicWavelet.13c6168a.js.map