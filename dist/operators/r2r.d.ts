import { QuadContainer } from "./s2r";
import { Quad } from 'n3';
export declare class R2ROperator {
    query: string;
    staticData: Set<Quad>;
    constructor(query: string);
    addStaticData(quad: Quad): void;
    execute(container: QuadContainer): Promise<any>;
}
