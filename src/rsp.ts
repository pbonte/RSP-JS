import {CSPARQLWindow, QuadContainer, ReportStrategy, Tick} from "./operators/s2r";
import {R2ROperator} from "./operators/r2r";
import {EventEmitter} from "events";

const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
// @ts-ignore
import {Quad} from 'n3';
import {RSPQLParser, WindowDefinition} from "./rspql";

export class RDFStream{
    name: string;
    emitter: EventEmitter;
    constructor(name: string, window: CSPARQLWindow) {
        this.name = name;
        var EventEmitter = require('events').EventEmitter;
        this.emitter = new EventEmitter();
        this.emitter.on('data', (quadcontainer: QuadContainer) => {
            // @ts-ignore
            quadcontainer.elements._graph = namedNode(window.name);

            window.add(quadcontainer.elements, quadcontainer.last_time_changed());
        });
    }
    add(event: Set<Quad>, ts: number){
        this.emitter.emit('data',new QuadContainer(event,ts));
    }
}
export class RSPEngine {
    windows: Array<CSPARQLWindow>;
    streams: Map<string,RDFStream>;
    private r2r: R2ROperator;
    constructor(query: string) {
        this.windows = new Array<CSPARQLWindow>();
        this.streams = new Map<string,RDFStream>();
        var parser = new RSPQLParser();
        var parsed_query = parser.parse(query);
        parsed_query.s2r.forEach((window: WindowDefinition)=>{
            var windowImpl = new CSPARQLWindow(window.window_name,window.width,window.slide, ReportStrategy.OnWindowClose, Tick.TimeDriven, 0);
            this.windows.push(windowImpl);
            var stream = new RDFStream(window.stream_name, windowImpl);
            this.streams.set(window.stream_name,stream);
        })
        this.r2r = new R2ROperator(parsed_query.sparql);

    }
    register(){
        var EventEmitter = require('events').EventEmitter;
        var emitter = new EventEmitter();
        this.windows.forEach((window)=>{
            window.subscribe("RStream", async (data: QuadContainer) => {
                console.log('Received window content', data);
                // iterate over all the windows
                for (var windowIt of this.windows){
                    // filter out the current triggering one
                    if(windowIt!= window){
                        let currentWindowData = windowIt.getContent(data.last_time_changed());
                        if(currentWindowData){
                            // add the content of the other windows to the quad container
                            currentWindowData.elements.forEach((q)=>
                                        data.add(q, data.last_time_changed())
                            );
                        }
                    }
                }
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

                })
        });
        return emitter;
    }

    getStream(stream_name: string){
        return this.streams.get(stream_name);
    }

    addStaticData(static_data: Quad) {
        this.r2r.addStaticData(static_data);
    }
}