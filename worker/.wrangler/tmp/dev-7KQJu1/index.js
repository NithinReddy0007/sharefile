var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// .wrangler/tmp/bundle-xE9koe/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/crypto.ts
function generateRoomId() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return `${result.slice(0, 4)}-${result.slice(4)}`;
}
__name(generateRoomId, "generateRoomId");
function generatePasscode() {
  const chars = "0123456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
__name(generatePasscode, "generatePasscode");
function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateSalt, "generateSalt");
async function hashPasscode(passcode, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${passcode.trim()}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPasscode, "hashPasscode");
async function verifyPasscode(passcode, salt, storedHash) {
  const computedHash = await hashPasscode(passcode, salt);
  if (computedHash.length !== storedHash.length)
    return false;
  let diff = 0;
  for (let i = 0; i < computedHash.length; i++) {
    diff |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}
__name(verifyPasscode, "verifyPasscode");

// src/index.ts
var ipRateLimits = /* @__PURE__ */ new Map();
function checkRateLimit(ip, limit = 60, windowMs = 6e4) {
  const now = Date.now();
  const entry = ipRateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) {
    return false;
  }
  entry.count++;
  return true;
}
__name(checkRateLimit, "checkRateLimit");
function handleCors(request, env2) {
  const headers = new Headers();
  const origin = request.headers.get("Origin") || "*";
  const allowed = env2.ALLOWED_ORIGIN || "*";
  if (allowed === "*" || allowed.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else {
    headers.set("Access-Control-Allow-Origin", allowed);
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Room-Passcode, Range");
  headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Disposition, ETag");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}
__name(handleCors, "handleCors");
function jsonResponse(data, status = 200, corsHeaders) {
  const headers = corsHeaders ? new Headers(corsHeaders) : new Headers();
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}
__name(jsonResponse, "jsonResponse");
async function cleanupExpiredRooms(env2) {
  const now = Math.floor(Date.now() / 1e3);
  const expiredRooms = await env2.DB.prepare(
    `SELECT id FROM rooms WHERE expires_at <= ? OR status = 'expired' LIMIT 50`
  ).bind(now).all();
  let deletedRoomsCount = 0;
  let deletedFilesCount = 0;
  if (!expiredRooms.results || expiredRooms.results.length === 0) {
    return { deletedRooms: 0, deletedFiles: 0 };
  }
  for (const room of expiredRooms.results) {
    const files = await env2.DB.prepare(
      `SELECT id, storage_key FROM files WHERE room_id = ?`
    ).bind(room.id).all();
    if (files.results && files.results.length > 0) {
      const keys = files.results.map((f) => f.storage_key);
      try {
        await env2.BUCKET.delete(keys);
        deletedFilesCount += keys.length;
      } catch (err) {
        console.error(`Failed to delete R2 files for room ${room.id}:`, err);
      }
    }
    await env2.DB.batch([
      env2.DB.prepare(`DELETE FROM files WHERE room_id = ?`).bind(room.id),
      env2.DB.prepare(`DELETE FROM rooms WHERE id = ?`).bind(room.id)
    ]);
    deletedRoomsCount++;
  }
  return { deletedRooms: deletedRoomsCount, deletedFiles: deletedFilesCount };
}
__name(cleanupExpiredRooms, "cleanupExpiredRooms");
var src_default = {
  /**
   * Cloudflare Cron Trigger (Scheduled cleanup)
   */
  async scheduled(event, env2, ctx) {
    ctx.waitUntil(cleanupExpiredRooms(env2));
  },
  /**
   * HTTP Fetch Handler
   */
  async fetch(request, env2, ctx) {
    const corsHeaders = handleCors(request, env2);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";
    if (!checkRateLimit(ip, 120, 6e4)) {
      return jsonResponse({ success: false, error: "Rate limit exceeded. Please wait a moment." }, 429, corsHeaders);
    }
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "");
    try {
      if (path === "" || path === "/api/health") {
        return jsonResponse({
          success: true,
          status: "healthy",
          service: "Qshare API",
          timestamp: Math.floor(Date.now() / 1e3)
        }, 200, corsHeaders);
      }
      if (path === "/api/cleanup" && request.method === "POST") {
        const result = await cleanupExpiredRooms(env2);
        return jsonResponse({ success: true, ...result }, 200, corsHeaders);
      }
      if (path === "/api/rooms" && request.method === "POST") {
        const now2 = Math.floor(Date.now() / 1e3);
        const ttl = Number(env2.ROOM_TTL_SECONDS || 1800);
        const expiresAt = now2 + ttl;
        const roomId2 = generateRoomId();
        const passcode = generatePasscode();
        const salt = generateSalt();
        const hash = await hashPasscode(passcode, salt);
        await env2.DB.prepare(
          `INSERT INTO rooms (id, passcode_hash, passcode_salt, created_at, expires_at, total_size_bytes, status)
           VALUES (?, ?, ?, ?, ?, 0, 'active')`
        ).bind(roomId2, hash, salt, now2, expiresAt).run();
        return jsonResponse({
          success: true,
          data: {
            roomId: roomId2,
            passcode,
            createdAt: now2,
            expiresAt,
            maxFileSizeBytes: Number(env2.MAX_FILE_SIZE_BYTES || 524288e3),
            // 500 MB
            maxRoomSizeBytes: Number(env2.MAX_ROOM_SIZE_BYTES || 1073741824)
            // 1 GB
          }
        }, 201, corsHeaders);
      }
      const roomMatch = path.match(/^\/api\/rooms\/([^/]+)(.*)$/);
      if (!roomMatch) {
        return jsonResponse({ success: false, error: "Route not found" }, 404, corsHeaders);
      }
      const roomId = decodeURIComponent(roomMatch[1]).toUpperCase();
      const subPath = roomMatch[2];
      const passcodeHeader = request.headers.get("X-Room-Passcode");
      const authHeader = request.headers.get("Authorization");
      const queryPasscode = url.searchParams.get("passcode");
      const clientPasscode = passcodeHeader || queryPasscode || (authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null);
      if (!clientPasscode) {
        return jsonResponse({ success: false, error: "Missing room passcode" }, 401, corsHeaders);
      }
      const room = await env2.DB.prepare(
        `SELECT * FROM rooms WHERE id = ?`
      ).bind(roomId).first();
      if (!room) {
        return jsonResponse({ success: false, error: "Room not found" }, 404, corsHeaders);
      }
      const now = Math.floor(Date.now() / 1e3);
      if (room.expires_at <= now || room.status !== "active") {
        if (room.status === "active") {
          await env2.DB.prepare(`UPDATE rooms SET status = 'expired' WHERE id = ?`).bind(roomId).run();
        }
        return jsonResponse({ success: false, error: "Room has expired. Files are no longer accessible." }, 410, corsHeaders);
      }
      const isAuthorized = await verifyPasscode(clientPasscode, room.passcode_salt, room.passcode_hash);
      if (!isAuthorized) {
        return jsonResponse({ success: false, error: "Invalid room passcode" }, 403, corsHeaders);
      }
      const maxFileSizeBytes = Number(env2.MAX_FILE_SIZE_BYTES || 524288e3);
      const maxRoomSizeBytes = Number(env2.MAX_ROOM_SIZE_BYTES || 1073741824);
      if (subPath === "" && request.method === "GET") {
        const files = await env2.DB.prepare(
          `SELECT id, filename, size_bytes, content_type, status, uploaded_at, created_at 
           FROM files WHERE room_id = ? AND status = 'uploaded'`
        ).bind(roomId).all();
        return jsonResponse({
          success: true,
          data: {
            roomId: room.id,
            createdAt: room.created_at,
            expiresAt: room.expires_at,
            totalSizeBytes: room.total_size_bytes,
            maxFileSizeBytes,
            maxRoomSizeBytes,
            files: files.results || []
          }
        }, 200, corsHeaders);
      }
      if (subPath === "/files" && request.method === "POST") {
        const body = await request.json();
        const filename = (body.filename || "unnamed-file").trim();
        const sizeBytes = Number(body.sizeBytes);
        const contentType = body.contentType || "application/octet-stream";
        if (!sizeBytes || sizeBytes <= 0) {
          return jsonResponse({ success: false, error: "Invalid file size" }, 400, corsHeaders);
        }
        if (sizeBytes > maxFileSizeBytes) {
          return jsonResponse({
            success: false,
            error: `File exceeds maximum allowed size of ${Math.round(maxFileSizeBytes / (1024 * 1024))}MB`
          }, 400, corsHeaders);
        }
        if (room.total_size_bytes + sizeBytes > maxRoomSizeBytes) {
          return jsonResponse({
            success: false,
            error: `Upload would exceed remaining room capacity (${Math.round((maxRoomSizeBytes - room.total_size_bytes) / (1024 * 1024))}MB remaining)`
          }, 400, corsHeaders);
        }
        const fileId = crypto.randomUUID();
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storageKey = `rooms/${roomId}/${fileId}_${safeName}`;
        let uploadId = null;
        if (sizeBytes > 50 * 1024 * 1024) {
          const multipart = await env2.BUCKET.createMultipartUpload(storageKey, {
            httpMetadata: { contentType }
          });
          uploadId = multipart.uploadId;
        }
        await env2.DB.prepare(
          `INSERT INTO files (id, room_id, filename, size_bytes, content_type, storage_key, status, upload_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
        ).bind(fileId, roomId, filename, sizeBytes, contentType, storageKey, uploadId, now).run();
        return jsonResponse({
          success: true,
          data: {
            fileId,
            filename,
            sizeBytes,
            uploadId,
            storageKey,
            isMultipart: !!uploadId
          }
        }, 201, corsHeaders);
      }
      const fileMatch = subPath.match(/^\/files\/([^/]+)(\/.*)?$/);
      if (fileMatch) {
        const fileId = fileMatch[1];
        const action = fileMatch[2] || "";
        const file = await env2.DB.prepare(
          `SELECT * FROM files WHERE id = ? AND room_id = ?`
        ).bind(fileId, roomId).first();
        if (!file) {
          return jsonResponse({ success: false, error: "File record not found" }, 404, corsHeaders);
        }
        if (action === "" && request.method === "PUT") {
          if (!request.body) {
            return jsonResponse({ success: false, error: "Missing request body" }, 400, corsHeaders);
          }
          await env2.BUCKET.put(file.storage_key, request.body, {
            httpMetadata: {
              contentType: file.content_type
            },
            customMetadata: {
              roomId,
              filename: file.filename
            }
          });
          await env2.DB.batch([
            env2.DB.prepare(
              `UPDATE files SET status = 'uploaded', uploaded_at = ? WHERE id = ?`
            ).bind(now, fileId),
            env2.DB.prepare(
              `UPDATE rooms SET total_size_bytes = total_size_bytes + ? WHERE id = ?`
            ).bind(file.size_bytes, roomId)
          ]);
          return jsonResponse({ success: true, message: "File uploaded successfully" }, 200, corsHeaders);
        }
        if (action === "/part" && request.method === "PUT") {
          const partNumber = Number(url.searchParams.get("partNumber"));
          if (!partNumber || !file.upload_id) {
            return jsonResponse({ success: false, error: "Invalid multipart upload or partNumber" }, 400, corsHeaders);
          }
          if (!request.body) {
            return jsonResponse({ success: false, error: "Missing part body" }, 400, corsHeaders);
          }
          const multipart = env2.BUCKET.resumeMultipartUpload(file.storage_key, file.upload_id);
          const uploadedPart = await multipart.uploadPart(partNumber, request.body);
          return jsonResponse({
            success: true,
            partNumber,
            etag: uploadedPart.etag
          }, 200, corsHeaders);
        }
        if (action === "/complete" && request.method === "POST") {
          if (!file.upload_id) {
            return jsonResponse({ success: false, error: "File is not a multipart upload" }, 400, corsHeaders);
          }
          const body = await request.json();
          if (!body.parts || !Array.isArray(body.parts)) {
            return jsonResponse({ success: false, error: "Missing parts array" }, 400, corsHeaders);
          }
          const multipart = env2.BUCKET.resumeMultipartUpload(file.storage_key, file.upload_id);
          await multipart.complete(body.parts);
          await env2.DB.batch([
            env2.DB.prepare(
              `UPDATE files SET status = 'uploaded', uploaded_at = ? WHERE id = ?`
            ).bind(now, fileId),
            env2.DB.prepare(
              `UPDATE rooms SET total_size_bytes = total_size_bytes + ? WHERE id = ?`
            ).bind(file.size_bytes, roomId)
          ]);
          return jsonResponse({ success: true, message: "Multipart file completed successfully" }, 200, corsHeaders);
        }
        if (action === "/abort" && request.method === "POST") {
          if (file.upload_id) {
            const multipart = env2.BUCKET.resumeMultipartUpload(file.storage_key, file.upload_id);
            await multipart.abort();
          }
          await env2.DB.prepare(`DELETE FROM files WHERE id = ?`).bind(fileId).run();
          return jsonResponse({ success: true, message: "Upload aborted" }, 200, corsHeaders);
        }
        if (action === "/download" && request.method === "GET") {
          if (file.status !== "uploaded") {
            return jsonResponse({ success: false, error: "File is not yet available for download" }, 400, corsHeaders);
          }
          const rangeHeader = request.headers.get("Range");
          let range = void 0;
          if (rangeHeader) {
            const match = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
            if (match) {
              const start = parseInt(match[1], 10);
              const end = match[2] ? parseInt(match[2], 10) : void 0;
              range = {
                offset: start,
                length: end !== void 0 ? end - start + 1 : void 0
              };
            }
          }
          const r2Object = await env2.BUCKET.get(file.storage_key, {
            range
          });
          if (!r2Object) {
            return jsonResponse({ success: false, error: "File not found in storage" }, 404, corsHeaders);
          }
          const responseHeaders = new Headers(corsHeaders);
          responseHeaders.set("Content-Type", file.content_type || "application/octet-stream");
          const encodedFilename = encodeURIComponent(file.filename);
          responseHeaders.set("Content-Disposition", `attachment; filename="${file.filename.replace(/"/g, "")}"; filename*=UTF-8''${encodedFilename}`);
          responseHeaders.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
          if ("range" in r2Object && r2Object.range) {
            const r = r2Object.range;
            responseHeaders.set("Content-Range", `bytes ${r.offset}-${r.offset + r.length - 1}/${file.size_bytes}`);
            responseHeaders.set("Content-Length", r.length.toString());
            return new Response(r2Object.body, {
              status: 206,
              headers: responseHeaders
            });
          }
          responseHeaders.set("Content-Length", r2Object.size.toString());
          return new Response(r2Object.body, {
            status: 200,
            headers: responseHeaders
          });
        }
      }
      return jsonResponse({ success: false, error: "Endpoint not found" }, 404, corsHeaders);
    } catch (err) {
      console.error("Unhandled worker error:", err);
      return jsonResponse({
        success: false,
        error: err?.message || "Internal server error"
      }, 500, corsHeaders);
    }
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-xE9koe/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-xE9koe/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  cleanupExpiredRooms,
  middleware_loader_entry_default as default,
  handleCors,
  jsonResponse
};
//# sourceMappingURL=index.js.map
