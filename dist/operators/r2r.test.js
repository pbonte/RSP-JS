"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const s2r_1 = require("./s2r");
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
const r2r_1 = require("./r2r");
test('test_query_engine', () => __awaiter(void 0, void 0, void 0, function* () {
    let r2r = new r2r_1.R2ROperator(`SELECT * WHERE { ?s ?p ?o }`);
    const quad1 = quad(namedNode('https://rsp.js/test_subject_0'), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph());
    const quad2 = quad(namedNode('https://rsp.js/test_subject_1'), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph());
    let quadSet = new Set();
    quadSet.add(quad1);
    quadSet.add(quad2);
    let container = new s2r_1.QuadContainer(quadSet, 0);
    const bindingsStream = yield r2r.execute(container);
    let resuults = new Array();
    // @ts-ignore
    bindingsStream.on('data', (binding) => {
        console.log(binding.toString()); // Quick way to print bindings for testing
        resuults.push(binding.toString());
    });
    bindingsStream.on('end', () => {
        // The data-listener will not be called anymore once we get here.
        expect(resuults.length).toBe(2);
    });
}));
test('test_query_engine_with_extension_functions', () => __awaiter(void 0, void 0, void 0, function* () {
    let r2r = new r2r_1.R2ROperator(`
        PREFIX extension: <http://extension.org/functions#>
        SELECT (extension:sqrt(?o) as ?sqrt) (extension:pow(?o,2) as ?pow) WHERE { ?s ?p ?o }`);
    const quad1 = quad(namedNode('https://rsp.js/test_subject_0'), namedNode('http://rsp.js/test_property'), literal('4'), defaultGraph());
    const quad2 = quad(namedNode('https://rsp.js/test_subject_1'), namedNode('http://rsp.js/test_property'), literal('9'), defaultGraph());
    let quadSet = new Set();
    quadSet.add(quad1);
    quadSet.add(quad2);
    let container = new s2r_1.QuadContainer(quadSet, 0);
    const bindingsStream = yield r2r.execute(container);
    let results = new Array();
    // @ts-ignore
    bindingsStream.on('data', (binding) => {
        results.push(binding);
    });
    bindingsStream.on('end', () => {
        // The data-listener will not be called anymore once we get here.
        expect(results.length).toBe(2);
    });
}));
