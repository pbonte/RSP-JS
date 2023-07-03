import { QuadContainer } from "./s2r";
const N3 = require('n3');
import { RdfStore } from "rdf-stores";
import { DataFactory } from "rdf-data-factory";
const DF = new DataFactory();
// @ts-ignore
export class R2ROperator {
    query: string;
    staticData: Set<any>;
    constructor(query: string) {
        this.query = query;
        this.staticData = new Set<any>();
    }
    addStaticData(quad: any) {
        this.staticData.add(quad);
    }
    async execute(container: QuadContainer) {
        const store = RdfStore.createDefault();
        for (let elem of container.elements) {
            store.addQuad(elem);
        }
        for (let elem of this.staticData) {
            store.addQuad(elem);
        }
        const QueryEngine = require('@comunica/query-sparql').QueryEngine;
        const myEngine = new QueryEngine();
        return await myEngine.queryBindings(this.query, {
            sources: [store],
        });
    }
}
