import {QuadContainer} from "./s2r";
import {QueryEngine} from "@comunica/query-sparql";
const N3 = require('n3');

const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
export class R2ROperator{
    query: string;
    constructor(query: string){
        this.query = query;
    }

    async execute(container: QuadContainer){
        const store = new N3.Store();
        for(var elem of container.elements){
            store.addQuad(elem);

        }
        const QueryEngine = require('@comunica/query-sparql').QueryEngine;

        const myEngine = new QueryEngine();
        return await myEngine.queryBindings(this.query, {
            sources: [store],
        });
    }
}