"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSPQLParser = exports.ParsedQuery = void 0;
class ParsedQuery {
    constructor() {
        this.sparql = "Select * WHERE{?s ?p ?o}";
        // @ts-ignore
        this.r2s = { operator: "RStream", name: "undefined" };
        this.s2r = new Array();
    }
    set_sparql(sparql) {
        this.sparql = sparql;
    }
    set_r2s(r2s) {
        this.r2s = r2s;
    }
    add_s2r(s2r) {
        this.s2r.push(s2r);
    }
}
exports.ParsedQuery = ParsedQuery;
class RSPQLParser {
    parse(query) {
        let parsed = new ParsedQuery();
        let split = query.split(/\r?\n/);
        let sparqlLines = new Array();
        let prefixMapper = new Map();
        split.forEach((line) => {
            let trimmed_line = line.trim();
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
                    parsed.add_s2r({ window_name: this.unwrap(match[1], prefixMapper),
                        stream_name: this.unwrap(match[2], prefixMapper),
                        width: Number(match[3]),
                        slide: Number(match[4]) });
                }
            }
            else {
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
    unwrap(prefixedIri, mapper) {
        if (prefixedIri.trim().startsWith("<")) {
            return prefixedIri.trim().slice(1, -1);
        }
        let split = prefixedIri.trim().split(":");
        let iri = split[0];
        if (mapper.has(iri)) {
            return mapper.get(iri) + split[1];
        }
        else {
            return "";
        }
    }
}
exports.RSPQLParser = RSPQLParser;
