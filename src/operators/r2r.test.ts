import {QuadContainer} from "./s2r";
const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
// @ts-ignore
import {Quad} from 'n3';
import {R2ROperator} from "./r2r";

test('test_query_engine', async () => {
    let r2r = new R2ROperator(`SELECT * WHERE { ?s ?p ?o }`);
    const quad1 = quad(
        namedNode('https://rsp.js/test_subject_0'),
        namedNode('http://rsp.js/test_property'),
        namedNode('http://rsp.js/test_object'),
        defaultGraph(),
    );
    const quad2 = quad(
        namedNode('https://rsp.js/test_subject_1'),
        namedNode('http://rsp.js/test_property'),
        namedNode('http://rsp.js/test_object'),
        defaultGraph(),
    );
    let quadSet = new Set<Quad>();
    quadSet.add(quad1);
    quadSet.add(quad2);
    let container = new QuadContainer(quadSet,0);
    const bindingsStream = await r2r.execute(container);
    var resuults = new Array<string>();
    // @ts-ignore
    bindingsStream.on('data', (binding) => {
        console.log(binding.toString()); // Quick way to print bindings for testing

        resuults.push(binding.toString());
    });
    bindingsStream.on('end', () => {
        // The data-listener will not be called anymore once we get here.
        expect(resuults.length).toBe(2);

    });
});