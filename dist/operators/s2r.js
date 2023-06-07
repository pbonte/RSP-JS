"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSPARQLWindow = exports.QuadContainer = exports.WindowInstance = exports.Tick = exports.ReportStrategy = void 0;
var ReportStrategy;
(function (ReportStrategy) {
    ReportStrategy[ReportStrategy["NonEmptyContent"] = 0] = "NonEmptyContent";
    ReportStrategy[ReportStrategy["OnContentChange"] = 1] = "OnContentChange";
    ReportStrategy[ReportStrategy["OnWindowClose"] = 2] = "OnWindowClose";
    ReportStrategy[ReportStrategy["Periodic"] = 3] = "Periodic";
})(ReportStrategy = exports.ReportStrategy || (exports.ReportStrategy = {}));
var Tick;
(function (Tick) {
    Tick[Tick["TimeDriven"] = 0] = "TimeDriven";
    Tick[Tick["TupleDriven"] = 1] = "TupleDriven";
    Tick[Tick["BatchDriven"] = 2] = "BatchDriven";
})(Tick = exports.Tick || (exports.Tick = {}));
class WindowInstance {
    constructor(open, close) {
        this.open = open;
        this.close = close;
    }
    getDefinition() {
        return "[" + this.open + "," + this.close + ")";
    }
    hasCode() {
        return 0;
    }
}
exports.WindowInstance = WindowInstance;
class QuadContainer {
    constructor(elements, ts) {
        this.elements = elements;
        this.last_time_stamp_changed = ts;
    }
    len() {
        return this.elements.size;
    }
    add(quad, ts) {
        this.elements.add(quad);
        this.last_time_stamp_changed = ts;
    }
    last_time_changed() {
        return this.last_time_stamp_changed;
    }
}
exports.QuadContainer = QuadContainer;
class CSPARQLWindow {
    constructor(name, width, slide, report, tick, start_time) {
        this.name = name;
        this.width = width;
        this.slide = slide;
        this.report = report;
        this.tick = tick;
        this.time = start_time;
        this.t0 = start_time;
        this.active_windows = new Map();
        let EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
    }
    getContent(timestamp) {
        let max_window = null;
        let max_time = Number.MAX_SAFE_INTEGER;
        this.active_windows.forEach((value, window) => {
            if (window.open <= timestamp && timestamp <= window.close) {
                if (window.close < max_time) {
                    max_time = window.close;
                    max_window = window;
                }
            }
        });
        if (max_window) {
            return this.active_windows.get(max_window);
        }
        else {
            return undefined;
        }
    }
    add(e, timestamp) {
        console.debug("Window " + this.name + " Received element (" + e + "," + timestamp + ")");
        let toEvict = new Set();
        let t_e = timestamp;
        if (this.time > t_e) {
            console.error("OUT OF ORDER NOT HANDLED");
        }
        this.scope(t_e);
        for (let w of this.active_windows.keys()) {
            console.debug("Processing Window " + this.name + " [" + w.open + "," + w.close + ") for element (" + e + "," + timestamp + ")");
            if (w.open <= t_e && t_e < w.close) {
                console.debug("Adding element [" + e + "] to Window [" + w.open + "," + w.close + ")");
                let temp_window = this.active_windows.get(w);
                if (temp_window) {
                    temp_window.add(e, timestamp);
                }
            }
            else if (t_e > w.close) {
                console.debug("Scheduling for Eviction [" + w.open + "," + w.close + ")");
                toEvict.add(w);
            }
        }
        let max_window = null;
        let max_time = 0;
        this.active_windows.forEach((value, window) => {
            if (this.compute_report(window, value, timestamp)) {
                if (window.close > max_time) {
                    max_time = window.close;
                    max_window = window;
                }
            }
        });
        if (max_window) {
            if (this.tick == Tick.TimeDriven) {
                if (timestamp > this.time) {
                    this.time = timestamp;
                    this.emitter.emit('RStream', this.active_windows.get(max_window));
                    // @ts-ignore
                    console.log("Window [" + max_window.open + "," + max_window.close + ") triggers. Content: " + this.active_windows.get(max_window));
                }
            }
        }
        for (let w of toEvict) {
            console.debug("Evicting [" + w.open + "," + w.close + ")");
            this.active_windows.delete(w);
        }
    }
    compute_report(w, content, timestamp) {
        if (this.report == ReportStrategy.OnWindowClose) {
            return w.close < timestamp;
        }
        return false;
    }
    scope(t_e) {
        let c_sup = Math.ceil((Math.abs(t_e - this.t0) / this.slide)) * this.slide;
        let o_i = c_sup - this.width;
        console.debug("Calculating the Windows to Open. First one opens at [" + o_i + "] and closes at [" + c_sup + "]");
        do {
            console.debug("Computing Window [" + o_i + "," + (o_i + this.width) + ") if absent");
            computeWindowIfAbsent(this.active_windows, new WindowInstance(o_i, o_i + this.width), () => new QuadContainer(new Set(), 0));
            o_i += this.slide;
        } while (o_i <= t_e);
    }
    subscribe(output, call_back) {
        this.emitter.on(output, call_back);
    }
}
exports.CSPARQLWindow = CSPARQLWindow;
function computeWindowIfAbsent(map, key, mappingFunction) {
    let val = map.get(key);
    let found = false;
    for (let w of map.keys()) {
        if (w.open == key.open && w.close == key.close) {
            found = true;
            break;
        }
    }
    if (!found) {
        val = mappingFunction(key);
        map.set(key, val);
    }
}
