import {RDFStream, RSPEngine} from "./rsp";
import {EventEmitter} from "events";
const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;

function generate_data(num_events: number, rdfStream: RDFStream) {
    for (let i = 0; i < num_events; i++) {
        const stream_element = quad(
            namedNode('https://rsp.js/test_subject_' + i),
            namedNode('http://rsp.js/test_property'),
            namedNode('http://rsp.js/test_object'),
            defaultGraph(),
        );
        rdfStream.add(stream_element, i);
    }
}
test('rsp_consumer_test', async () => {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s ?p ?o}
    }`;

    var rspEngine = new RSPEngine(query);
    var stream= rspEngine.getStream("https://rsp.js/stream1");
    var emitter = rspEngine.register();
    var results = new Array<string>();
    // @ts-ignore
    emitter.on('RStream', (bindings) => {
        console.log("received results");
        results.push(bindings.toString());
    });
    if(stream){
        generate_data(10, stream);
    }

    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(1000);


    expect(results.length).toBe(2+4+6+8);
    console.log(results);
});

