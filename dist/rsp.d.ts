/// <reference types="node" />
import { CSPARQLWindow } from "./operators/s2r";
import { R2ROperator } from "./operators/r2r";
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
    queries: Map<string, {
        windows: Array<CSPARQLWindow>;
        streams: Map<string, RDFStream>;
        r2r: R2ROperator;
    }>;
    constructor();
    addQuery(query: string): void;
    removeQuery(query: string): void;
    register(query: string): EventEmitter | null;
    get_stream(query: string, stream_name: string): RDFStream | undefined;
    add_static_data(query: string, static_data: Quad): void;
    get_all_streams(query: string): string[] | undefined;
}
