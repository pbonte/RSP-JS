export declare class ParsedQuery {
    sparql: string;
    r2s: R2S;
    s2r: Array<WindowDefinition>;
    constructor();
    set_sparql(sparql: string): void;
    set_r2s(r2s: R2S): void;
    add_s2r(s2r: WindowDefinition): void;
}
export type WindowDefinition = {
    window_name: string;
    stream_name: string;
    width: number;
    slide: number;
};
type R2S = {
    operator: "RStream" | "IStream" | "DStream";
    name: string;
};
export declare class RSPQLParser {
    parse(query: string): ParsedQuery;
    unwrap(prefixedIri: string, mapper: Map<string, string>): string;
}
export {};
