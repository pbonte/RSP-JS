import {CSPARQLWindow, QuadContainer, ReportStrategy, Tick} from "./operators/s2r";
import {R2ROperator} from "./operators/r2r";
import {EventEmitter} from "events";

const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
// @ts-ignore
import {Quad} from 'n3';

export class RDFStream{
    name: string;
    emitter: EventEmitter;
    constructor(name: string, engine: RSPEngine) {
        this.name = name;
        var EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
        this.emitter.on('data', (quadcontainer: QuadContainer) => {
            engine.add(quadcontainer.elements, quadcontainer.last_time_changed());
        });
    }
    add(event: Set<Quad>, ts: number){
        this.emitter.emit('data',new QuadContainer(event,ts));
    }
}
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
    create_stream(stream_name: string){
        let stream = new RDFStream(stream_name, this);
        return stream;
    }
    add(stream_element: any, ts: number) {
        this.window.add(stream_element, ts);
    }
}