/**
 * Class for the Parsed Query Object which parses the RSP-QL query to SPARQL along with the R2S and S2R operators.
 */
export class ParsedQuery {
    sparql: string;
    r2s: R2S;
    s2r: Array<WindowDefinition>;
    /**
     * Constructor for the Parsed Query Object.
     */
    constructor() {
        this.sparql = "Select * WHERE{?s ?p ?o}";
        // @ts-ignore
        this.r2s = { operator: "RStream", name: "undefined" };
        this.s2r = new Array<WindowDefinition>();

    }
    /**
     * Set the SPARQL query.
     * @param {string} sparql - The SPARQL query.
     */
    set_sparql(sparql: string) {
        this.sparql = sparql;
    }
    /**
     * Set the R2S operator.
     * @param {R2S} r2s  - The R2S operator.
     */
    set_r2s(r2s: R2S) {
        this.r2s = r2s;
    }
    /**
     * Add the S2R operator.
     * @param {WindowDefinition} s2r - The S2R operator.
     * @returns {void}
     */
    add_s2r(s2r: WindowDefinition) {
        this.s2r.push(s2r);
    }
}

export type WindowDefinition = {
    window_name: string,
    stream_name: string,
    width: number,
    slide: number
}
type R2S = {
    operator: "RStream" | "IStream" | "DStream",
    name: string
}
/**
 * Class for the RSP-QL Parser.
 */
export class RSPQLParser {
    /**
     * Parse the RSP-QL query to SPARQL along with the R2S and S2R operators.
     * @param {string} query - The RSP-QL query.
     * @returns {ParsedQuery} - The parsed query.
     */
    parse(query: string): ParsedQuery {
        const parsed = new ParsedQuery();
        const split = query.split(/\r?\n/);
        const sparqlLines = new Array<string>();
        const prefixMapper = new Map<string, string>();
        split.forEach((line) => {
            const trimmed_line = line.trim();
            //R2S
            if (trimmed_line.startsWith("REGISTER")) {
                const regexp = /REGISTER +([^ ]+) +<([^>]+)> AS/g;
                const matches = trimmed_line.matchAll(regexp);
                for (const match of matches) {
                    if (match[1] === "RStream" || match[1] === "DStream" || match[1] === "IStream") {
                        parsed.set_r2s({ operator: match[1], name: match[2] });
                    }
                }
            }
            else if (trimmed_line.startsWith("FROM NAMED WINDOW")) {
                const regexp = /FROM +NAMED +WINDOW +([^ ]+) +ON +STREAM +([^ ]+) +\[RANGE +([^ ]+) +STEP +([^ ]+)\]/g;
                const matches = trimmed_line.matchAll(regexp);
                for (const match of matches) {
                    parsed.add_s2r({
                        window_name: this.unwrap(match[1], prefixMapper),
                        stream_name: this.unwrap(match[2], prefixMapper),
                        width: Number(match[3]),
                        slide: Number(match[4])
                    });
                }
            } else {
                let sparqlLine = trimmed_line;
                if (sparqlLine.startsWith("WINDOW")) {
                    sparqlLine = sparqlLine.replace("WINDOW", "GRAPH");
                }
                if (sparqlLine.startsWith("PREFIX")) {
                    const regexp = /PREFIX +([^:]*): +<([^>]+)>/g;
                    const matches = trimmed_line.matchAll(regexp);
                    for (const match of matches) {
                        prefixMapper.set(match[1], match[2]);
                    }
                }
                sparqlLines.push(sparqlLine);
            }
        });
        parsed.sparql = sparqlLines.join("\n");
        return parsed;
    }
    /**
     * Unwrap the prefixed IRI.
     * @param {string} prefixedIri - The prefixed IRI.
     * @param {Map<string, string>} mapper - The prefix mapper.
     * @returns {string} - The unwrapped IRI.
     */
    unwrap(prefixedIri: string, mapper: Map<string, string>) {
        if (prefixedIri.trim().startsWith("<")) {
            return prefixedIri.trim().slice(1, -1);
        }
        const split = prefixedIri.trim().split(":");
        const iri = split[0];
        if (mapper.has(iri)) {
            return mapper.get(iri) + split[1];
        } else {
            return "";
        }
    }
}
