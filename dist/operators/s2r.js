"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSPARQLWindow = exports.QuadContainer = exports.WindowInstance = exports.Tick = exports.ReportStrategy = void 0;
const events_1 = require("events");
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
    is_same(other_window) {
        return this.open == other_window.open && this.close == other_window.close;
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
    constructor(name, width, slide, report, tick, start_time, max_delay) {
        this.name = name;
        this.width = width;
        this.slide = slide;
        this.report = report;
        this.tick = tick;
        this.time = start_time;
        this.t0 = start_time;
        this.active_windows = new Map();
        this.emitter = new events_1.EventEmitter();
        this.max_delay = max_delay;
        this.late_buffer = new Map();
        this.interval_id = setInterval(() => { this.process_late_elements(); }, this.slide);
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
        var _a;
        console.debug("Window " + this.name + " Received element (" + e + "," + timestamp + ")");
        let toEvict = new Set();
        let t_e = timestamp;
        if (this.time > t_e) {
            if (this.time - t_e > this.max_delay) {
                console.error("Late element [" + e + "] with timestamp [" + t_e + "] is out of the allowed delay [" + this.max_delay + "]");
                return;
            }
            else {
                console.warn("Late element [" + e + "] with timestamp [" + t_e + "] is being buffered for out of order processing");
                if (!this.late_buffer.has(t_e)) {
                    this.late_buffer.set(t_e, new Set());
                }
                (_a = this.late_buffer.get(t_e)) === null || _a === void 0 ? void 0 : _a.add(e);
                return;
            }
        }
        this.process_event(e, t_e, toEvict);
        for (let w of toEvict) {
            console.debug("Evicting [" + w.open + "," + w.close + ")");
            this.active_windows.delete(w);
        }
    }
    process_event(e, t_e, toEvict) {
        this.scope(t_e);
        for (let w of this.active_windows.keys()) {
            if (w.open <= t_e && t_e < w.close) {
                let temp_window = this.active_windows.get(w);
                if (temp_window) {
                    temp_window.add(e, t_e);
                }
            }
            else if (t_e > w.close) {
                toEvict.add(w);
            }
        }
        this.emit_on_trigger(t_e);
    }
    emit_on_trigger(t_e) {
        let max_window = null;
        let max_time = 0;
        this.active_windows.forEach((value, window) => {
            if (this.compute_report(window, value, t_e)) {
                if (window.close > max_time) {
                    max_time = window.close;
                    max_window = window;
                }
            }
        });
        if (max_window) {
            if (this.tick == Tick.TimeDriven) {
                if (t_e > this.time) {
                    this.time = t_e;
                    this.emitter.emit('RStream', this.active_windows.get(max_window));
                    // @ts-ignore
                    console.log("Window [" + max_window.open + "," + max_window.close + ") triggers. Content: " + this.active_windows.get(max_window));
                }
            }
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
        do {
            computeWindowIfAbsent(this.active_windows, new WindowInstance(o_i, o_i + this.width), () => new QuadContainer(new Set(), 0));
            o_i += this.slide;
        } while (o_i <= t_e);
    }
    subscribe(output, call_back) {
        this.emitter.on(output, call_back);
    }
    process_late_elements() {
        this.late_buffer.forEach((elements, timestamp) => {
            elements.forEach((element) => {
                let to_evict = new Set();
                this.process_event(element, timestamp, to_evict);
                for (let w of to_evict) {
                    console.debug("Evicting [" + w.open + "," + w.close + ")");
                    this.active_windows.delete(w);
                }
            });
        });
        this.late_buffer.clear();
    }
    set_current_time(t) {
        this.time = t;
    }
}
exports.CSPARQLWindow = CSPARQLWindow;
function computeWindowIfAbsent(map, key, mappingFunction) {
    let val = map.get(key);
    let found = false;
    for (let w of map.keys()) {
        if (w.is_same(key)) {
            found = true;
            val = map.get(w);
            break;
        }
    }
    if (!found) {
        val = mappingFunction(key);
        map.set(key, val);
    }
    return val;
}
