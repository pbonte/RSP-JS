import {EventEmitter} from "events";
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

export class WindowInstance {
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
    add(quad: Quad, ts: number){
        this.elements.add(quad);
        this.last_time_stamp_changed = ts;
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
    active_windows: Map<WindowInstance, QuadContainer>;
    report: ReportStrategy;
    tick: Tick;
    emitter: EventEmitter;
    name: string;
    constructor(name:string, width: number, slide: number, report: ReportStrategy, tick: Tick, start_time : number) {
        this.name = name;
        this.width = width;
        this.slide = slide;
        this.report = report;
        this.tick = tick;
        this.time = start_time;
        this.t0 = start_time;
        this.active_windows = new Map<WindowInstance, QuadContainer>();
        let EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
    }
    getContent(timestamp: number): QuadContainer | undefined{
        let max_window = null;
        let max_time = Number.MAX_SAFE_INTEGER;
        this.active_windows.forEach((value: QuadContainer,window:WindowInstance)=> {
            if(window.open <= timestamp && timestamp <= window.close){
                if(window.close < max_time){
                    max_time = window.close;
                    max_window = window;
                }
            }
        });
        if(max_window){
            return this.active_windows.get(max_window);
        }else{
            return undefined;
        }
    }


    add(e: Quad, timestamp: number) {
        console.debug("Window " + this.name+ " Received element (" + e + "," + timestamp + ")");
        let toEvict = new Set<WindowInstance>();
        let t_e = timestamp;

        if (this.time > t_e) {
            console.error("OUT OF ORDER NOT HANDLED");
        }

        this.scope(t_e);

        for ( let w of this.active_windows.keys()){
            console.debug("Processing Window " + this.name+ " [" + w.open + "," + w.close + ") for element (" + e + "," + timestamp + ")");
                if (w.open <= t_e && t_e < w.close ){
                    console.debug("Adding element [" + e + "] to Window [" + w.open + "," + w.close + ")");
                    let temp_window = this.active_windows.get(w);
                    if(temp_window){
                        temp_window.add(e, timestamp);
                    }
                } else if (t_e > w.close ){
                    console.debug("Scheduling for Eviction [" + w.open + "," + w.close + ")");
                    toEvict.add(w);
                }
        }
        let max_window = null;
        let max_time = 0;
        this.active_windows.forEach((value: QuadContainer,window:WindowInstance)=> {
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
                    let container_with_bounds: container_with_bounds = {
                        data: this.active_windows.get(max_window),
                    // @ts-ignore
                        from : max_window.open,
                        // @ts-ignore
                        to: max_window.close
                    }            
                    // this.emitter.emit('RStream', this.active_windows.get(max_window));      
                    this.emitter.emit('RStream', container_with_bounds);              
                    // @ts-ignore
                    console.log("Window ["+ max_window.open + "," + max_window.close + ") triggers. Content: " + this.active_windows.get(max_window));
                }
            }
        }

        for(let w of toEvict){
            console.debug("Evicting [" + w.open + "," + w.close + ")");
            this.active_windows.delete(w);
        }

    }
    compute_report(w: WindowInstance, content: QuadContainer, timestamp: number){
        if(this.report == ReportStrategy.OnWindowClose) {
            return w.close < timestamp;
        }
        return false;

    }

    scope(t_e:number){
        let c_sup =  Math.ceil(( Math.abs(t_e - this.t0) / this.slide)) * this.slide;
        let o_i = c_sup - this.width;
        console.debug("Calculating the Windows to Open. First one opens at [" + o_i + "] and closes at [" + c_sup + "]");
        do {
            console.debug("Computing Window [" + o_i + "," + (o_i + this.width) + ") if absent");
            computeWindowIfAbsent(this.active_windows, new WindowInstance(o_i, o_i + this.width), ()=>new QuadContainer(new Set<Quad>(),0));
            o_i += this.slide;

        } while (o_i <= t_e);

    }

    subscribe(output: 'RStream'|'IStream'|'DStream', call_back: (data: container_with_bounds) => void) {
        this.emitter.on(output,call_back);
    }
}
function computeWindowIfAbsent(map: Map<WindowInstance, QuadContainer>, key: WindowInstance, mappingFunction: (key: WindowInstance) => QuadContainer) {
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

export type container_with_bounds = {
    data : QuadContainer | undefined,
    from : number,
    to: number
}
