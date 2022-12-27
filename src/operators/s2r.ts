import {EventEmitter} from "events";

const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;

// @ts-ignore
import {Quad} from 'n3';


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

export class WindowDefinition{
    open: number;
    close: number;
    constructor(open: number, close: number) {
        this.open = open;
        this.close = close;
    }

    getDefinition() {
        return "["+this.open+","+this.close+")";
    }
    hasCode(){
        return 0;
    }
}


export class QuadContainer{
    elements: Set<Quad>;
    last_time_stamp_changed: number;
    constructor(elements: Set<Quad>, ts: number) {
        this.elements = elements;
        this.last_time_stamp_changed = ts;
    }

    len() {
        return this.elements.size;
    }
    add(quad: Quad){
        this.elements.add(quad);
    }

    last_time_changed() {
        return this.last_time_stamp_changed;
    }

}

export class CSPARQLWindow {
    width: number;
    slide: number;
    time: number;
    t0: number;
    active_windows: Map<WindowDefinition, QuadContainer>;
    report: ReportStrategy;
    tick: Tick;
    emitter: EventEmitter;
    constructor(width: number, slide: number, report: ReportStrategy, tick: Tick, start_time : number) {
        this.width = width;
        this.slide = slide;
        this.report = report;
        this.tick = tick;
        this.time = start_time;
        this.t0 = start_time;
        this.active_windows = new Map<WindowDefinition, QuadContainer>();
        var EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
    }

    add(e: Quad, timestamp: number) {
        console.debug("Received element (" + e + "," + timestamp + ")");
        var toEvict = new Set<WindowDefinition>();
        var t_e = timestamp;

        if (this.time > t_e) {
            console.error("OUT OF ORDER NOT HANDLED");
        }

        this.scope(t_e);

        for ( var w of this.active_windows.keys()){
            console.debug("Processing Window [" + w.open + "," + w.close + ") for element (" + e + "," + timestamp + ")");
                if (w.open <= t_e && t_e < w.close ){
                    console.debug("Adding element [" + e + "] to Window [" + w.open + "," + w.close + ")");
                    var temp_window = this.active_windows.get(w);
                    if(temp_window){
                        temp_window.add(e);
                    }
                } else if (t_e > w.close ){
                    console.debug("Scheduling for Eviction [" + w.open + "," + w.close + ")");
                    toEvict.add(w);
                }
        }
        var max_window = null;
        var max_time = 0;
        this.active_windows.forEach((value: QuadContainer,window:WindowDefinition)=> {
            if(this.compute_report(window,value, timestamp)){
                if(window.close > max_time){
                    max_time = window.close;
                    max_window = window;
                }
            }
        });
        if(max_window){
            if(this.tick == Tick.TimeDriven){
                if(timestamp > this.time){
                    this.time = timestamp;
                    this.emitter.emit('RStream', this.active_windows.get(max_window));
                    // @ts-ignore
                    console.log("Window ["+ max_window.open + "," + max_window.close + ") triggers. Content: " + this.active_windows.get(max_window));
                }
            }
        }

        for(var w of toEvict){
            console.debug("Evicting [" + w.open + "," + w.close + ")");
            this.active_windows.delete(w);
        }

    }
    //TODO add other reportinig policies
    compute_report(w: WindowDefinition, content: QuadContainer, timestamp: number){
        if(this.report == ReportStrategy.OnWindowClose) {
            return w.close < timestamp;
        }
        return false;

    }

    scope(t_e:number){
        var c_sup =  Math.ceil(( Math.abs(t_e - this.t0) / this.slide)) * this.slide;
        var o_i = c_sup - this.width;
        console.debug("Calculating the Windows to Open. First one opens at [" + o_i + "] and closes at [" + c_sup + "]");
        do {
            console.debug("Computing Window [" + o_i + "," + (o_i + this.width) + ") if absent");
            computeWindowIfAbsent(this.active_windows, new WindowDefinition(o_i, o_i + this.width), ()=>new QuadContainer(new Set<Quad>(),0));
            o_i += this.slide;

        } while (o_i <= t_e);

    }

    subscribe(output: 'RStream'|'IStream'|'DStream', call_back: (data: QuadContainer) => void) {
        this.emitter.on(output,call_back);
    }
}
function computeWindowIfAbsent(map: Map<WindowDefinition, QuadContainer>, key: WindowDefinition, mappingFunction: (key: WindowDefinition) => QuadContainer) {
    let val = map.get(key);
    let found = false;
    for (let w of map.keys()){
        if (w.open == key.open && w.close == key.close){
            found = true;
            break;
        }
    }
    if (!found) {
        val = mappingFunction(key);
        map.set(key, val);
    }

}