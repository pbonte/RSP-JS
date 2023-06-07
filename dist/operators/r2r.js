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
exports.R2ROperator = void 0;
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
class R2ROperator {
    constructor(query) {
        this.query = query;
        this.staticData = new Set();
    }
    addStaticData(quad) {
        this.staticData.add(quad);
    }
    execute(container) {
        return __awaiter(this, void 0, void 0, function* () {
            const store = new N3.Store();
            for (let elem of container.elements) {
                store.addQuad(elem);
            }
            for (let elem of this.staticData) {
                store.addQuad(elem);
            }
            const QueryEngine = require('@comunica/query-sparql').QueryEngine;
            const myEngine = new QueryEngine();
            return yield myEngine.queryBindings(this.query, {
                sources: [store],
            });
        });
    }
}
exports.R2ROperator = R2ROperator;
