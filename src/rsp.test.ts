import {RSPEngine} from "./rsp";
import {EventEmitter} from "events";
const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;

function generate_data(num_events: number, rspEngine: RSPEngine) {
    for (let i = 0; i < num_events; i++) {
        const stream_element = quad(
            namedNode('https://rsp.js/test_subject_' + i),
            namedNode('http://rsp.js/test_property'),
            namedNode('http://rsp.js/test_object'),
            defaultGraph(),
        );
        rspEngine.add(stream_element, i);
    }
}
test('basic again', async () => {

    var rspEngine = new RSPEngine(10, 2, "Select * WHERE{?s ?p ?o}");
    var emitter = rspEngine.register();
    var results = new Array<string>();
    // @ts-ignore
    emitter.on('RStream', (bindings) => {
        console.log("received results");
        results.push(bindings.toString());
    });

    generate_data(10, rspEngine);
    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(1000);


    expect(results.length).toBe(2+4+6+8);
    console.log(results);
});

test('emitter_wrapper',()=> {
    var EventEmitter = require('events').EventEmitter;
    var emitter = new EventEmitter();
    var emitter2 = new EventEmitter();
    emitter.on("data",function (data: string){
        emitter2.emit("data", data);
    });

    emitter2.on("data", function (data: string){
        console.log("receivved " + data);
    });
    emitter.emit("data","test1");


});