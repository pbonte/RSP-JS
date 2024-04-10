import { EventEmitter } from "events";
// @ts-ignore
import { Quad } from 'n3';

    /*
    * Enum for the Report Strategy.
    */
export enum ReportStrategy {
    NonEmptyContent,
    OnContentChange,
    OnWindowClose,
    Periodic
}
export enum Tick {
    TimeDriven,
    TupleDriven,
    BatchDriven,
}

/**
 * Class for the Window Instance.
 */
export class WindowInstance {
    open: number;
    close: number;
    /**
     * Constructor for the Window Instance.
     * @param {number} open - Open time of the window.
     * @param {close} close - Close time of the window.
     */
    constructor(open: number, close: number) {
        this.open = open;
        this.close = close;
    }

    /**
     * Returns the definition.
     * @returns {string} - The definition.
     */
    getDefinition() {
        return "[" + this.open + "," + this.close + ")";
    }
    /**
     * Returns the code.
     * @returns {number} - The code.
     */
    hasCode() {
        return 0;
    }
}


/**
 * Class for the Quad Container.
 */
export class QuadContainer {
    elements: Set<Quad>;
    last_time_stamp_changed: number;
    /** 
     * Constructor for the Quad Container.
     * @param {Set<Quad>} elements - Elements in the container.
     * @param {number} ts - Timestamp.
     * @class
     */
    constructor(elements: Set<Quad>, ts: number) {
        this.elements = elements;
        this.last_time_stamp_changed = ts;
    }

    /**
     * Get the length of the container.
     * @returns {number} - The length of the container.
     */
    len() {
        return this.elements.size;
    }
    /**
     * Add the quad to the container.
     * @param {Quad} quad - The quad to add.
     * @param {number} ts - The timestamp.
     * @returns {void} - Nothing.
     */
    add(quad: Quad, ts: number) {
        this.elements.add(quad);
        this.last_time_stamp_changed = ts;
    }

    /**
     * Get the last time the container was changed.
     * @returns {number} - The last time the container was changed.
     */
    last_time_changed() {
        return this.last_time_stamp_changed;
    }

}

/**
 * Class for the CSPARQL Window.
 */
export class CSPARQLWindow {
    width: number;
    slide: number;
    time: number;
    t0: number;
    active_windows: Map<WindowInstance, QuadContainer>;
    report: ReportStrategy;
    tick: Tick;
    emitter: EventEmitter;
    name: string;
    /**
     * Constructor for the CSPARQL Window.
     * @param {string} name - The name of the window.
     * @param {number} width - The width of the window.
     * @param {number} slide - The slide of the window.
     * @param {ReportStrategy} report - The report strategy.
     * @param {Tick} tick - The tick.
     * @param {number} start_time - The start time.
     */
    constructor(name: string, width: number, slide: number, report: ReportStrategy, tick: Tick, start_time: number) {
        this.name = name;
        this.width = width;
        this.slide = slide;
        this.report = report;
        this.tick = tick;
        this.time = start_time;
        this.t0 = start_time;
        this.active_windows = new Map<WindowInstance, QuadContainer>();
        const EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
    }
    /**
     * Get content of the window.
     * @param {number} timestamp - The timestamp.
     * @returns {QuadContainer|undefined} - The quad container.
     */
    getContent(timestamp: number): QuadContainer | undefined {
        let max_window = null;
        let max_time = Number.MAX_SAFE_INTEGER;
        this.active_windows.forEach((value: QuadContainer, window: WindowInstance) => {
            if (window.open <= timestamp && timestamp <= window.close) {
                if (window.close < max_time) {
                    max_time = window.close;
                    max_window = window;
                }
            }
        });
        if (max_window) {
            return this.active_windows.get(max_window);
        } else {
            return undefined;
        }
    }

    /**
     * Add the stream element to the window.
     * @param {Quad} e - The quad.
     * @param {number} timestamp - The timestamp.
     * @returns {void} - Nothing.
     */
    add(e: Quad, timestamp: number) {
        console.debug("Window " + this.name + " Received element (" + e + "," + timestamp + ")");
        const toEvict = new Set<WindowInstance>();
        const t_e = timestamp;

        if (this.time > t_e) {
            console.error("OUT OF ORDER NOT HANDLED");
        }

        this.scope(t_e);

        for (const w of this.active_windows.keys()) {
            console.debug("Processing Window " + this.name + " [" + w.open + "," + w.close + ") for element (" + e + "," + timestamp + ")");
            if (w.open <= t_e && t_e < w.close) {
                console.debug("Adding element [" + e + "] to Window [" + w.open + "," + w.close + ")");
                const temp_window = this.active_windows.get(w);
                if (temp_window) {
                    temp_window.add(e, timestamp);
                }
            } else if (t_e > w.close) {
                console.debug("Scheduling for Eviction [" + w.open + "," + w.close + ")");
                toEvict.add(w);
            }
        }
        let max_window = null;
        let max_time = 0;
        this.active_windows.forEach((value: QuadContainer, window: WindowInstance) => {
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

        for (const w of toEvict) {
            console.debug("Evicting [" + w.open + "," + w.close + ")");
            this.active_windows.delete(w);
        }

    }
    /**
     * Compute the report.
     * @param {WindowInstance} w - The window instance.
     * @param {QuadContainer} content - The quad container.
     * @param {number} timestamp - The timestamp.
     * @returns {boolean} - The boolean.
     */
    compute_report(w: WindowInstance, content: QuadContainer, timestamp: number) {
        if (this.report == ReportStrategy.OnWindowClose) {
            return w.close < timestamp;
        }
        return false;

    }

    /**
     * Scope the window.
     * @param {number} t_e - The timestamp.
     * @returns {void} - Nothing.
     */
    scope(t_e: number) {
        const c_sup = Math.ceil((Math.abs(t_e - this.t0) / this.slide)) * this.slide;
        let o_i = c_sup - this.width;
        console.debug("Calculating the Windows to Open. First one opens at [" + o_i + "] and closes at [" + c_sup + "]");
        do {
            console.debug("Computing Window [" + o_i + "," + (o_i + this.width) + ") if absent");
            computeWindowIfAbsent(this.active_windows, new WindowInstance(o_i, o_i + this.width), () => new QuadContainer(new Set<Quad>(), 0));
            o_i += this.slide;

        } while (o_i <= t_e);

    }

    /**
     * Subscribe to the output stream.
     * @param {'RStream'|'IStream'|'DStream'} output - The output stream.
     * @param {(data: QuadContainer) => void} call_back - The callback function.
     * @returns {void} - Nothing.
     */
    subscribe(output: 'RStream' | 'IStream' | 'DStream', call_back: (data: QuadContainer) => void) {
        this.emitter.on(output, call_back);
    }
}
/**
 * Compute the window if absent.
 * @param {Map<WindowInstance, QuadContainer>} map - The map of windows.
 * @param {WindowInstance} key - The window instance.
 * @param {Function} mappingFunction - The mapping function.
 */
function computeWindowIfAbsent(map: Map<WindowInstance, QuadContainer>, key: WindowInstance, mappingFunction: (key: WindowInstance) => QuadContainer) {
    let val = map.get(key);
    let found = false;
    for (const w of map.keys()) {
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
