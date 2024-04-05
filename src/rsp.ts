import { CSPARQLWindow, QuadContainer, ReportStrategy, Tick } from "./operators/s2r";
import { R2ROperator } from "./operators/r2r";
import { EventEmitter } from "events";
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
// @ts-ignore
import { Quad } from 'n3';
import { RSPQLParser, WindowDefinition } from "./rspql";

export type binding_with_timestamp = {
    bindings: any,
    timestamp_from: number,
    timestamp_to: number
}

export class RDFStream {
    name: string;
    emitter: EventEmitter;

    constructor(name: string, window: CSPARQLWindow) {
        this.name = name;
        let EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
        this.emitter.on('data', (quadcontainer: QuadContainer) => {
            // @ts-ignore
            quadcontainer.elements._graph = namedNode(window.name);
            // @ts-ignore
            window.add(quadcontainer.elements, quadcontainer.last_time_changed());
        });
    }

    add(event: Set<Quad>, ts: number) {
        this.emitter.emit('data', new QuadContainer(event, ts));
    }
}

export class RSPEngine {
    queries: Map<string, {
        windows: Array<CSPARQLWindow>,
        streams: Map<string, RDFStream>,
        r2r: R2ROperator,
    }>

    constructor() {
        this.queries = new Map<string, {
            windows: Array<CSPARQLWindow>,
            streams: Map<string, RDFStream>,
            r2r: R2ROperator,
        }>();
    }

    public addQuery(query: string) {
        let windows = new Array<CSPARQLWindow>();
        let streams = new Map<string, RDFStream>();
        const parser = new RSPQLParser();
        const parsed_query = parser.parse(query);
        parsed_query.s2r.forEach((window: WindowDefinition) => {
            let window_implementation = new CSPARQLWindow(window.window_name, window.width, window.slide, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0);
            windows.push(window_implementation);
            let stream = new RDFStream(window.stream_name, window_implementation);
            streams.set(window.stream_name, stream);
        });
        let r2r = new R2ROperator(parsed_query.sparql);
        this.queries.set(query, { windows, streams, r2r });
    }

    public removeQuery(query: string) {
        this.queries.delete(query);
    }

    public register(query: string) {
        let query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return false;
        }

        let { windows, streams, r2r } = query_resources;
        let emitter = new EventEmitter();

        windows.forEach((window) => {
            window.subscribe("RStream", async (data: QuadContainer) => {
                console.log(`Receievd window content`, data);
                for (let window_iterator of windows) {
                    if (window_iterator != window) {
                        let current_window_data = window_iterator.getContent(data.last_time_changed());
                        if (current_window_data) {
                            current_window_data.elements.forEach((quad) => {
                                data.add(quad, data.last_time_changed());
                            })
                        }
                    }
                }
                let binding_stream = await r2r.execute(data);
                binding_stream.on('data', (binding: any) => {
                    let binding_with_timestamp: binding_with_timestamp = {
                        bindings: binding,
                        timestamp_from: window.t0,
                        timestamp_to: window.t0 + window.width
                    }
                    window.t0 += window.slide;
                    emitter.emit('RStream', binding_with_timestamp);
                });
                binding_stream.on('end', () => {
                    console.log(`End of the stream`);
                });
                await binding_stream;
            });
        });
        return emitter;
    }

    public get_stream(query: string, stream_name: string) {
        let query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return;
        }

        return query_resources.streams.get(stream_name);
    }

    public add_static_data(query: string, static_data: Quad) {
        let query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return;
        }
        query_resources.r2r.addStaticData(static_data);
    }

    public get_all_streams(query: string){
        let query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return;
        }

        let streams: string[] = [];
        query_resources.streams.forEach((stream) => {
            streams.push(stream.name);
        })

        return streams;
    }
}