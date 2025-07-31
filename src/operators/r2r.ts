import { QuadContainer } from "./s2r";
import { DataFactory } from "rdf-data-factory";
const N3 = require('n3');
import { Store, Writer } from 'n3';
const DF = new DataFactory();
import { ParseOptions } from "rdf-parse/lib/RdfParser";
const rdfParser = require("rdf-parse").default;
const storeStream = require("rdf-store-stream").storeStream;
const streamifyString = require('streamify-string');
import { n3reasoner, runQuery, SwiplEye } from "eyereasoner";
const QueryEngine = require('@comunica/query-sparql').QueryEngine;
const { EventEmitter } = require('events').EventEmitter;
let theEvent = new EventEmitter();
require('events').EventEmitter.defaultMaxListeners = Infinity;
// @ts-ignore
import { Quad } from 'n3';
import { resolve } from "path";
import { Logger } from "../util/Logger";
import { LogLevel, LogDestination } from "../util/LoggerEnum";
import * as LOG_CONFIG from "../config/log_config.json";
/**
 * R2R Operator Implementation Class for the RSP Engine.
 * It performs operations such as Join, Filter, Aggregation on a stream of data
 * to generate a new stream of data.
 */
export class R2ROperator extends EventEmitter {
    query: string;
    staticData: Set<Quad>;
    logger: Logger;

    constructor(query: string) {
        super();
        this.query = query;
        const log_level: LogLevel = LogLevel[LOG_CONFIG.log_level as keyof typeof LogLevel];
        this.logger = new Logger(log_level, LOG_CONFIG.classes_to_log, LOG_CONFIG.destination as unknown as LogDestination);
        this.logger.info(`R2ROperator initialized with query: ${query}`,'R2ROperator');
        this.staticData = new Set<Quad>();
    }

    /**
     * Add static data to the R2R Operator.
     * @param {Quad} quad - The quad to be added as static data.
     */
    addStaticData(quad: Quad) {
        this.staticData.add(quad);
    }

    async execute(container: QuadContainer): Promise<any> {
        const store = new N3.Store();
        for (let elem of container.elements) {
            store.addQuad(elem);
        }
        for (let elem of this.staticData) {
            store.addQuad(elem);
        }

        this.logger.info(`Executing R2R Operator with query: ${this.query}`, 'R2ROperator');
        this.logger.info(`Static data size: ${this.staticData.size}`, 'R2ROperator');
        this.logger.info(`Store size: ${store.size}`, 'R2ROperator');
        this.logger.info(`Store content: ${storeToString(store).join('\n')}`, 'R2ROperator');

        const myEngine = new QueryEngine();

        const bindings_stream = myEngine.queryBindings(this.query, {
            sources: [store],
            extensionFunctions: {
                'http://extension.org/functions#sqrt'(args: any) {
                    const arg = args[0];
                    if (arg.termType === 'Literal') {
                        return DF.literal(Math.sqrt(Number(arg.value)).toString());
                    }
                },
                'http://extension.org/functions#pow'(args: any) {
                    const arg1 = args[0];
                    if (arg1.termType === 'Literal') {
                        const arg2 = args[1];
                        if (arg2.termType === 'Literal') {
                            return DF.literal(Math.pow(Number(arg1.value), Number(arg2.value)).toString());
                        }
                    }
                }
            },
        });

        return bindings_stream;
    }
}

/**
 * Convert a store to a string representation.
 * @param {Store} store - The N3 Store to be converted.
 * @returns {string[]} - Array of string representations of the quads.
 */
export function storeToString(store: Store): string[] {
    const writer = new Writer();
    return store.getQuads(null, null, null, null).map(quad => writer.quadToString(quad.subject, quad.predicate, quad.object, quad.graph));
}



export async function stringToStore(text: string, options: ParseOptions): Promise<Store> {
    const textStream = streamifyString(text);
    const quadStream = rdfParser.parse(textStream, options);
    return await storeStream(quadStream);
}