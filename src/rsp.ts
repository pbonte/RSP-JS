import {CSPARQLWindow, QuadContainer, ReportStrategy, Tick} from "./operators/s2r";
import {R2ROperator} from "./operators/r2r";
import {EventEmitter} from "events";

const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
// @ts-ignore
import {Quad} from 'n3';
export class RSPEngine {
    window: CSPARQLWindow;
    private r2r: R2ROperator;
    constructor(width: number, slide: number, query: string) {
        this.window =  new CSPARQLWindow(width,slide, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0);
        this.r2r = new R2ROperator(query);

    }
    register(){
        var EventEmitter = require('events').EventEmitter;
        var emitter = new EventEmitter();
        this.window.subscribe("RStream", async (data: QuadContainer) => {
            console.log('Received window content', data);
            // const quad1 = quad(
            //     namedNode('https://rsp.js/test_subject_0'),
            //     namedNode('http://rsp.js/test_property'),
            //     namedNode('http://rsp.js/test_object'),
            //     defaultGraph(),
            // );
            // const quad2 = quad(
            //     namedNode('https://rsp.js/test_subject_1'),
            //     namedNode('http://rsp.js/test_property'),
            //     namedNode('http://rsp.js/test_object'),
            //     defaultGraph(),
            // );
            // let quadSet = new Set<Quad>();
            // quadSet.add(quad1);
            // quadSet.add(quad2);
            //let container = new QuadContainer(quadSet,0);
            var bindingsStream = await this.r2r.execute(data);
            // @ts-ignore
            bindingsStream.on('data', (binding) => {
                console.log(binding.toString()); // Quick way to print bindings for testing
                emitter.emit("RStream", binding);
            });
            bindingsStream.on('end', () => {
                console.log("Ended stream");
            });
            await bindingsStream;

        });
        return emitter;
    }

    add(stream_element: any, ts: number) {
        this.window.add(stream_element, ts);
    }
}