"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSPEngine = exports.RDFStream = void 0;
const s2r_1 = require("./operators/s2r");
const r2r_1 = require("./operators/r2r");
const events_1 = require("events");
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const rspql_1 = require("./rspql");
class RDFStream {
    constructor(name, window) {
        this.name = name;
        let EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
        this.emitter.on('data', (quadcontainer) => {
            // @ts-ignore
            quadcontainer.elements._graph = namedNode(window.name);
            // @ts-ignore
            window.add(quadcontainer.elements, quadcontainer.last_time_changed());
        });
    }
    add(event, ts) {
        this.emitter.emit('data', new s2r_1.QuadContainer(event, ts));
    }
}
exports.RDFStream = RDFStream;
class RSPEngine {
    constructor() {
        this.queries = new Map();
    }
    addQuery(query) {
        let windows = new Array();
        let streams = new Map();
        const parser = new rspql_1.RSPQLParser();
        const parsed_query = parser.parse(query);
        parsed_query.s2r.forEach((window) => {
            let window_implementation = new s2r_1.CSPARQLWindow(window.window_name, window.width, window.slide, s2r_1.ReportStrategy.OnWindowClose, s2r_1.Tick.TimeDriven, 0);
            windows.push(window_implementation);
            let stream = new RDFStream(window.stream_name, window_implementation);
            streams.set(window.stream_name, stream);
        });
        let r2r = new r2r_1.R2ROperator(parsed_query.sparql);
        this.queries.set(query, { windows, streams, r2r });
    }
    removeQuery(query) {
        this.queries.delete(query);
    }
    register(query) {
        let query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return null;
        }
        let { windows, streams, r2r } = query_resources;
        let emitter = new events_1.EventEmitter();
        windows.forEach((window) => {
            window.subscribe("RStream", (data) => __awaiter(this, void 0, void 0, function* () {
                console.log(`Receievd window content`, data);
                for (let window_iterator of windows) {
                    if (window_iterator != window) {
                        let current_window_data = window_iterator.getContent(data.last_time_changed());
                        if (current_window_data) {
                            current_window_data.elements.forEach((quad) => {
                                data.add(quad, data.last_time_changed());
                            });
                        }
                    }
                }
                let binding_stream = yield r2r.execute(data);
                binding_stream.on('data', (binding) => {
                    let binding_with_timestamp = {
                        bindings: binding,
                        timestamp_from: window.t0,
                        timestamp_to: window.t0 + window.width
                    };
                    window.t0 += window.slide;
                    emitter.emit('RStream', binding_with_timestamp);
                });
                binding_stream.on('end', () => {
                    console.log(`End of the stream`);
                });
                yield binding_stream;
            }));
        });
        return emitter;
    }
    get_stream(query, stream_name) {
        let query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return;
        }
        return query_resources.streams.get(stream_name);
    }
    add_static_data(query, static_data) {
        let query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return;
        }
        query_resources.r2r.addStaticData(static_data);
    }
    get_all_streams(query) {
        let query_resources = this.queries.get(query);
        if (!query_resources) {
            console.log(`The query ${query} is not registered in the engine`);
            return;
        }
        let streams = [];
        query_resources.streams.forEach((stream) => {
            streams.push(stream.name);
        });
        return streams;
    }
}
exports.RSPEngine = RSPEngine;
