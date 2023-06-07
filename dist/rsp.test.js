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
const rsp_1 = require("./rsp");
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, defaultGraph, quad } = DataFactory;
function generate_data(num_events, rdfStreams) {
    for (let i = 0; i < num_events; i++) {
        rdfStreams.forEach((stream) => {
            const stream_element = quad(namedNode('https://rsp.js/test_subject_' + i), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph());
            stream.add(stream_element, i);
        });
    }
}
function generate_data2(num_events, rdfStream) {
    for (let i = 0; i < num_events; i++) {
        const stream_element = quad(namedNode('https://rsp.js/test_subject_' + i), namedNode('http://rsp.js/test_property2'), namedNode('http://rsp.js/test_object2'), defaultGraph());
        rdfStream.add(stream_element, i);
    }
}
test('rsp_consumer_test', () => __awaiter(void 0, void 0, void 0, function* () {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s ?p ?o}
    }`;
    let rspEngine = new rsp_1.RSPEngine(query);
    let stream = rspEngine.getStream("https://rsp.js/stream1");
    let emitter = rspEngine.register();
    let results = new Array();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log("received results");
        results.push(object.bindings.toString());
    });
    if (stream) {
        generate_data(10, [stream]);
    }
    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    yield sleep(2000);
    expect(results.length).toBe(2 + 4 + 6 + 8);
    console.log(results);
}));
test('rsp_multiple_same_window_test', () => __awaiter(void 0, void 0, void 0, function* () {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    FROM NAMED WINDOW :w2 ON STREAM :stream2 [RANGE 10 STEP 2]

    WHERE{
        WINDOW :w1 { ?s ?p ?o}
        WINDOW :w2 { ?s ?p ?o}
    }`;
    let rspEngine = new rsp_1.RSPEngine(query);
    let stream1 = rspEngine.getStream("https://rsp.js/stream1");
    let stream2 = rspEngine.getStream("https://rsp.js/stream2");
    let emitter = rspEngine.register();
    let results = new Array();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log("received results");
        results.push(object.bindings.toString());
    });
    if (stream1 && stream2) {
        generate_data(10, [stream1, stream2]);
    }
    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    yield sleep(1000);
    expect(results.length).toBe(2 * (2 + 4 + 6 + 8));
    console.log(results);
}));
test('rsp_multiple_difff_window_test', () => __awaiter(void 0, void 0, void 0, function* () {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    FROM NAMED WINDOW :w2 ON STREAM :stream2 [RANGE 20 STEP 10]

    WHERE{
        WINDOW :w1 { ?s ?p ?o}
        WINDOW :w2 { ?s ?p2 ?o2}
    }`;
    let rspEngine = new rsp_1.RSPEngine(query);
    let stream1 = rspEngine.getStream("https://rsp.js/stream1");
    let stream2 = rspEngine.getStream("https://rsp.js/stream2");
    let emitter = rspEngine.register();
    let results = new Array();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log("received results");
        results.push(object.bindings.toString());
    });
    if (stream1 && stream2) {
        for (let i = 0; i < 10; i++) {
            const stream_element = quad(namedNode('https://rsp.js/test_subject_' + i), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph());
            stream1.add(stream_element, i);
            const stream_element2 = quad(namedNode('https://rsp.js/test_subject_' + i), namedNode('http://rsp.js/test_property2'), namedNode('http://rsp.js/test_object2'), defaultGraph());
            stream2.add(stream_element2, i);
        }
    }
    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    yield sleep(2000);
    expect(results.length).toBe(2 + 4 + 6 + 8);
    console.log(results);
}));
test('rsp_static_plus_window_test', () => __awaiter(void 0, void 0, void 0, function* () {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]

    WHERE{
        ?o :hasInfo :someInfo.
        WINDOW :w1 { ?s ?p ?o}
    }`;
    let rspEngine = new rsp_1.RSPEngine(query);
    const static_data = quad(namedNode('http://rsp.js/test_object'), namedNode('https://rsp.js/hasInfo'), namedNode('https://rsp.js/someInfo'), defaultGraph());
    rspEngine.addStaticData(static_data);
    let stream1 = rspEngine.getStream("https://rsp.js/stream1");
    let emitter = rspEngine.register();
    let results = new Array();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log("received results");
        results.push(object.bindings.toString());
    });
    if (stream1) {
        generate_data(10, [stream1]);
    }
    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    yield sleep(1000);
    expect(results.length).toBe(2 + 4 + 6 + 8);
    console.log(results);
}));
test('test_get_all_streams', () => {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]

    WHERE{
        ?o :hasInfo :someInfo.
        WINDOW :w1 { ?s ?p ?o}
    }`;
    let rspEngine = new rsp_1.RSPEngine(query);
    let streams_registered = rspEngine.get_all_streams();
    expect(streams_registered.length).toBe(1);
    expect(streams_registered[0]).toBe("https://rsp.js/stream1");
});
