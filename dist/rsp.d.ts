/// <reference types="node" />
import { CSPARQLWindow } from "./operators/s2r";
import { EventEmitter } from "events";
import { Quad } from 'n3';
export type binding_with_timestamp = {
    bindings: any;
    timestamp_from: number;
    timestamp_to: number;
};
export declare class RDFStream {
    name: string;
    emitter: EventEmitter;
    constructor(name: string, window: CSPARQLWindow);
    add(event: Set<Quad>, ts: number): void;
}
export declare class RSPEngine {
    windows: Array<CSPARQLWindow>;
    streams: Map<string, RDFStream>;
    private r2r;
    constructor(query: string);
    register(): any;
    getStream(stream_name: string): RDFStream | undefined;
    addStaticData(static_data: Quad): void;
    get_all_streams(): string[];
    get_all_windows(): CSPARQLWindow[];
}
