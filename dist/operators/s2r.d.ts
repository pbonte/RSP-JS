/// <reference types="node" />
/// <reference types="node" />
import { EventEmitter } from "events";
import { Quad } from 'n3';
export declare enum ReportStrategy {
    NonEmptyContent = 0,
    OnContentChange = 1,
    OnWindowClose = 2,
    Periodic = 3
}
export declare enum Tick {
    TimeDriven = 0,
    TupleDriven = 1,
    BatchDriven = 2
}
export declare class WindowInstance {
    open: number;
    close: number;
    constructor(open: number, close: number);
    getDefinition(): string;
    hasCode(): number;
}
export declare class QuadContainer {
    elements: Set<Quad>;
    last_time_stamp_changed: number;
    constructor(elements: Set<Quad>, ts: number);
    len(): number;
    add(quad: Quad, ts: number): void;
    last_time_changed(): number;
}
export declare class CSPARQLWindow {
    width: number;
    slide: number;
    time: number;
    t0: number;
    active_windows: Map<WindowInstance, QuadContainer>;
    report: ReportStrategy;
    tick: Tick;
    emitter: EventEmitter;
    interval_id: NodeJS.Timeout;
    name: string;
    private late_buffer;
    private max_delay;
    constructor(name: string, width: number, slide: number, report: ReportStrategy, tick: Tick, start_time: number, max_delay: number);
    getContent(timestamp: number): QuadContainer | undefined;
    add(e: Quad, timestamp: number): void;
    process_event(e: Quad, t_e: number, toEvict: Set<WindowInstance>): void;
    emit_on_trigger(t_e: number): void;
    compute_report(w: WindowInstance, content: QuadContainer, timestamp: number): boolean;
    scope(t_e: number): void;
    subscribe(output: 'RStream' | 'IStream' | 'DStream', call_back: (data: QuadContainer) => void): void;
    process_late_elements(): void;
    set_current_time(t: number): void;
}
