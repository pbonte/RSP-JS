import { CSPARQLWindow, QuadContainer, ReportStrategy, Tick } from "./operators/s2r";
import { R2ROperator } from "./operators/r2r";
import { EventEmitter } from "events";
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode } = DataFactory;
// @ts-ignore
import { Quad } from 'n3';
import { RSPQLParser, WindowDefinition } from "./rspql";

export type binding_with_timestamp = {
    bindings: any,
    timestamp_from: number,
    timestamp_to: number
}

/**
 * Class for the RDF Stream.
 */
export class RDFStream {
    name: string;
    emitter: EventEmitter;

    /**
     * Constructor for the RDFStream.
     * @param {string} name - The name of the stream.
     * @param {CSPARQLWindow} window - The window for the stream.
     */
    constructor(name: string, window: CSPARQLWindow) {
        this.name = name;
        const EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
        this.emitter.on('data', (quadcontainer: QuadContainer) => {
            // @ts-ignore
            quadcontainer.elements._graph = namedNode(window.name);
            // @ts-ignore
            window.add(quadcontainer.elements, quadcontainer.last_time_changed());
        });
    }

    /**
     * Add the event to the stream.
     * @param {Set<Quad>} event - The event to add to the stream.
     * @param {number} ts - The timestamp of the event.
     * @returns {void} - Nothing.
     */
    add(event: Set<Quad>, ts: number) {
        this.emitter.emit('data', new QuadContainer(event, ts));
    }
}

/**
 * Class for the RSP Engine.
 */
export class RSPEngine {
    queries: Map<string, {
        windows: Array<CSPARQLWindow>,
        streams: Map<string, RDFStream>,
        r2r: R2ROperator,
    }>

    /**
     * Constructor for the RSPEngine.
     */
    constructor() {
        this.queries = new Map<string, {
            windows: Array<CSPARQLWindow>,
            streams: Map<string, RDFStream>,
            r2r: R2ROperator,
        }>();
    }

    /**
     * Add the query to the engine.
     * @param {string} query - The query to add to the engine.
     * @returns {void} - Nothing.
     */
    public addQuery(query: string) {
        const windows = new Array<CSPARQLWindow>();
        const streams = new Map<string, RDFStream>();
        const parser = new RSPQLParser();
        const parsed_query = parser.parse(query);
        parsed_query.s2r.forEach((window: WindowDefinition) => {
            const window_implementation = new CSPARQLWindow(window.window_name, window.width, window.slide, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0);
            windows.push(window_implementation);
            const stream = new RDFStream(window.stream_name, window_implementation);
            streams.set(window.stream_name, stream);
        });
        const r2r = new R2ROperator(parsed_query.sparql);
        this.queries.set(query, { windows, streams, r2r });
    }

    /**
     * Remove the query from the engine.
     * @param {string} query - The query to remove from the engine.
     * @returns {void} - Nothing.
     */
    public removeQuery(query: string) {
        this.queries.delete(query);
    }

    /**
     * Register the query to the engine.
     * @param {string} query - The query added to the engine.
     * @returns {EventEmitter | null} - The emitter for the query.
     */
    public register(query: string) {
        const query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return null;
        }

        const { windows, r2r } = query_resources;
        const emitter = new EventEmitter();

        windows.forEach((window) => {
            window.subscribe("RStream", async (data: QuadContainer) => {
                console.log(`Receievd window content`, data);
                for (const window_iterator of windows) {
                    if (window_iterator != window) {
                        const current_window_data = window_iterator.getContent(data.last_time_changed());
                        if (current_window_data) {
                            current_window_data.elements.forEach((quad) => {
                                data.add(quad, data.last_time_changed());
                            })
                        }
                    }
                }                
                const binding_stream = await r2r.execute(data);
                binding_stream.on('data', (binding: any) => {                    
                    const binding_with_timestamp: binding_with_timestamp = {
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

    /**
     * Get the stream from the query.
     * @param {string} query - The query added to the engine.
     * @param {string} stream_name - The stream name.
     * @returns {RDFStream | undefined} - The stream from the query.
     */
    public get_stream(query: string, stream_name: string) {
        const query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return;
        }

        return query_resources.streams.get(stream_name);
    }

    /**
     * Add static data to the RSP Engine.
     * @param {string} query - The query added to the engine.
     * @param {Quad} static_data - The static data to add to the RSP Engine.
     */
    public add_static_data(query: string, static_data: Quad) {
        const query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return;
        }
        query_resources.r2r.addStaticData(static_data);
    }

    /** 
     * Get all the streams in the query.
     * @param {string} query - The query added to the engine.
     * @returns {string[] | undefined } - The streams in the query.
     */
    public get_all_streams(query: string) : string[] | undefined{
        const query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return;
        }

        const streams: string[] = [];
        query_resources.streams.forEach((stream) => {
            streams.push(stream.name);
        })

        return streams;
    }
}