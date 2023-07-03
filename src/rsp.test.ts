import {binding_with_timestamp, RDFStream, RSPEngine} from "./rsp";
const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, defaultGraph, quad } = DataFactory;

function generate_data(num_events: number, rdfStreams: RDFStream[]) {
    for (let i = 0; i < num_events; i++) {

        rdfStreams.forEach((stream)=>{
            const stream_element = quad(
                namedNode('https://rsp.js/test_subject_' + i),
                namedNode('http://rsp.js/test_property'),
                namedNode('http://rsp.js/test_object'),
                defaultGraph(),
            );
            stream.add(stream_element, i);});
    }
}
function generate_data2(num_events: number, rdfStream: RDFStream) {
    for (let i = 0; i < num_events; i++) {
        const stream_element = quad(
            namedNode('https://rsp.js/test_subject_' + i),
            namedNode('http://rsp.js/test_property2'),
            namedNode('http://rsp.js/test_object2'),
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

    let rspEngine = new RSPEngine(query);
    let stream= rspEngine.getStream("https://rsp.js/stream1");
    let emitter = rspEngine.register();
    let results = new Array<string>();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log("received results");
        results.push(object.bindings.toString());        
    });
    if(stream){
        generate_data(10, [stream]);
    }

    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(2000);


    expect(results.length).toBe(2+4+6+8);
    console.log(results);
});
test('rsp_multiple_same_window_test', async () => {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    FROM NAMED WINDOW :w2 ON STREAM :stream2 [RANGE 10 STEP 2]

    WHERE{
        WINDOW :w1 { ?s ?p ?o}
        WINDOW :w2 { ?s ?p ?o}
    }`;

    let rspEngine = new RSPEngine(query);
    let stream1 = rspEngine.getStream("https://rsp.js/stream1");
    let stream2 = rspEngine.getStream("https://rsp.js/stream2");

    let emitter = rspEngine.register();
    let results = new Array<string>();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log("received results");
        results.push(object.bindings.toString());
    });
    if(stream1 && stream2){
        generate_data(10, [stream1, stream2]);
    }

    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(1000);


    expect(results.length).toBe(2*(2+4+6+8));
    console.log(results);
});

test('rsp_multiple_difff_window_test', async () => {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    FROM NAMED WINDOW :w2 ON STREAM :stream2 [RANGE 20 STEP 10]

    WHERE{
        WINDOW :w1 { ?s ?p ?o}
        WINDOW :w2 { ?s ?p2 ?o2}
    }`;

    let rspEngine = new RSPEngine(query);
    let stream1 = rspEngine.getStream("https://rsp.js/stream1");
    let stream2 = rspEngine.getStream("https://rsp.js/stream2");

    let emitter = rspEngine.register();
    let results = new Array<string>();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log("received results");
        results.push(object.bindings.toString());
    });
    if(stream1 && stream2){
        for (let i = 0; i < 10; i++) {
            const stream_element = quad(
                namedNode('https://rsp.js/test_subject_' + i),
                namedNode('http://rsp.js/test_property'),
                namedNode('http://rsp.js/test_object'),
                defaultGraph(),
            );
            stream1.add(stream_element, i);
            const stream_element2 = quad(
                namedNode('https://rsp.js/test_subject_' + i),
                namedNode('http://rsp.js/test_property2'),
                namedNode('http://rsp.js/test_object2'),
                defaultGraph(),
            );
            stream2.add(stream_element2, i);
        }
    }

    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(2000);


    expect(results.length).toBe(2+4+6+8);
    console.log(results);
});
test('rsp_static_plus_window_test', async () => {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]

    WHERE{
        ?o :hasInfo :someInfo.
        WINDOW :w1 { ?s ?p ?o}
    }`;

    let rspEngine = new RSPEngine(query);
    const static_data = quad(
        namedNode('http://rsp.js/test_object'),
        namedNode('https://rsp.js/hasInfo'),
        namedNode('https://rsp.js/someInfo'),
        defaultGraph(),
    );
    rspEngine.addStaticData(static_data);

    let stream1 = rspEngine.getStream("https://rsp.js/stream1");

    let emitter = rspEngine.register();
    let results = new Array<string>();
    // @ts-ignore
    emitter.on('RStream', (object) => {
        console.log("received results");
        results.push(object.bindings.toString());
    });
    if(stream1){
        generate_data(10, [stream1]);
    }

    // @ts-ignore
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(1000);


    expect(results.length).toBe(2+4+6+8);
    console.log(results);
});

test('test_get_all_streams', () => {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]

    WHERE{
        ?o :hasInfo :someInfo.
        WINDOW :w1 { ?s ?p ?o}
    }`;

    let rspEngine = new RSPEngine(query);
    let streams_registered = rspEngine.get_all_streams();  
    expect(streams_registered.length).toBe(1);
    expect(streams_registered[0]).toBe("https://rsp.js/stream1");    
})

test('test_get_all_windows', () => {
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]

    WHERE{
        ?o :hasInfo :someInfo.
        WINDOW :w1 { ?s ?p ?o}
    }`;

    let rspEngine = new RSPEngine(query);
    let windows_registered = rspEngine.get_all_windows();   
    console.log(windows_registered);
    
})
