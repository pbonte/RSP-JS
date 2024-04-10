import {QuadContainer} from "./s2r";
const N3 = require('n3');

// @ts-ignore
import {Quad} from 'n3';
/**
 * Class for the R2R Operator.
 */
export class R2ROperator{
    query: string;
    staticData : Set<Quad>;
    /**
     * Constructor for the R2R Operator.
     * @param {string} query - The query for the operator.
     * @returns {void} - Nothing.
     */
    constructor(query: string){
        this.query = query;
        this.staticData = new Set<Quad>();
    }
    /**
     * Add the static data to the operator.
     * @param {Quad} quad - The static data to add.
     * @returns {void} - Nothing.
     */
    addStaticData(quad: Quad){
        this.staticData.add(quad);
    }
    /**
     * Execute the operator i.e do a comunica query on the static data + the data in the window.
     * @param {QuadContainer} container - The container with the data.
     * @returns {Promise<any>} - The result of the query.
     */
    async execute(container: QuadContainer){
        const store = new N3.Store();
        for(const elem of container.elements){
            store.addQuad(elem);

        }
        for(const elem of this.staticData){
            store.addQuad(elem);
        }
        const QueryEngine = require('@comunica/query-sparql').QueryEngine;
        const myEngine = new QueryEngine();
        return await myEngine.queryBindings(this.query, {
            sources: [store],
        });
    }
}
