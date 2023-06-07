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
    constructor(query) {
        this.windows = new Array();
        this.streams = new Map();
        let parser = new rspql_1.RSPQLParser();
        let parsed_query = parser.parse(query);
        parsed_query.s2r.forEach((window) => {
            let windowImpl = new s2r_1.CSPARQLWindow(window.window_name, window.width, window.slide, s2r_1.ReportStrategy.OnWindowClose, s2r_1.Tick.TimeDriven, 0);
            this.windows.push(windowImpl);
            let stream = new RDFStream(window.stream_name, windowImpl);
            this.streams.set(window.stream_name, stream);
        });
        this.r2r = new r2r_1.R2ROperator(parsed_query.sparql);
    }
    register() {
        let EventEmitter = require('events').EventEmitter;
        let emitter = new EventEmitter();
        this.windows.forEach((window) => {
            window.subscribe("RStream", (data) => __awaiter(this, void 0, void 0, function* () {
                console.log('Received window content', data);
                // iterate over all the windows
                for (let windowIt of this.windows) {
                    // filter out the current triggering one
                    if (windowIt != window) {
                        let currentWindowData = windowIt.getContent(data.last_time_changed());
                        if (currentWindowData) {
                            // add the content of the other windows to the quad container
                            currentWindowData.elements.forEach((q) => data.add(q, data.last_time_changed()));
                        }
                    }
                }
                let bindingsStream = yield this.r2r.execute(data);
                bindingsStream.on('data', (binding) => {
                    let object_with_timestamp = {
                        bindings: binding,
                        timestamp_from: window.t0,
                        timestamp_to: window.t0 + window.slide
                    };
                    window.t0 += window.slide;
                    emitter.emit("RStream", object_with_timestamp);
                });
                bindingsStream.on('end', () => {
                    console.log("Ended stream");
                });
                yield bindingsStream;
            }));
        });
        return emitter;
    }
    getStream(stream_name) {
        return this.streams.get(stream_name);
    }
    addStaticData(static_data) {
        this.r2r.addStaticData(static_data);
    }
    get_all_streams() {
        let streams = [];
        this.streams.forEach((stream) => {
            streams.push(stream.name);
        });
        return streams;
    }
}
exports.RSPEngine = RSPEngine;
