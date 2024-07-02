"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const LOG_CONFIG = __importStar(require("./config/log_config.json"));
const Logger_1 = require("./util/Logger");
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
        const logLevel = Logger_1.LogLevel[LOG_CONFIG.log_level];
        this.logger = new Logger_1.Logger(logLevel, LOG_CONFIG.classes_to_log, LOG_CONFIG.destination);
        let parser = new rspql_1.RSPQLParser();
        let parsed_query = parser.parse(query);
        parsed_query.s2r.forEach((window) => {
            let windowImpl = new s2r_1.CSPARQLWindow(window.window_name, window.width, window.slide, s2r_1.ReportStrategy.OnWindowClose, s2r_1.Tick.TimeDriven, 0, LOG_CONFIG.max_delay);
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
                if (data.len() > 0) {
                    this.logger.info(`Received window content for time ${data.last_time_changed()}`, `RSPEngine`);
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
                    this.logger.info(`Starting Window Query Processing for the window time ${data.last_time_changed()} with window size ${data.len()}`, `RSPEngine`);
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
                        this.logger.info(`Ended Comunica Binding Stream for window time ${data.last_time_changed()} with window size ${data.len()}`, `RSPEngine`);
                    });
                    yield bindingsStream;
                }
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
