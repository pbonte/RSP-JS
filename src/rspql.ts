
class ParsedQuery {
    sparql: string;
    r2s: R2S;
    s2r: Array<WindowDefinition>;
    constructor() {
        this.sparql = "Select * WHERE{?s ?p ?o}";
        // @ts-ignore
        this.r2s = {operator: "RStream", name: "undefined"};
        this.s2r = new Array<WindowDefinition>();

    }
    set_sparql(sparql: string){
        this.sparql = sparql;
    }
    set_r2s(r2s: R2S){
        this.r2s = r2s;
    }
    add_s2r(s2r: WindowDefinition){
        this.s2r.push(s2r);
    }
}
type WindowDefinition = {
    window_name: string,
    stream_name: string,
    width: number,
    slide: number
}
type R2S = {
    operator: "RStream" | "IStream" | "DStream",
    name: string
}
export class RSPQLParser {
    parse(query: string): ParsedQuery{
        var parsed = new ParsedQuery();
        var split = query.split(/\r?\n/);
        var sparqlLines = new Array<string>();
        split.forEach((line)=>{
            let trimmed_line = line.trim();
            //R2S
            if (trimmed_line.startsWith("REGISTER")) {
                const regexp = /REGISTER +([^ ]+) +<([^>]+)> AS/g;
                const matches = trimmed_line.matchAll(regexp);
                for (const match of matches) {
                    if (match[1]=== "RStream" || match[1]=== "DStream" || match[1]=== "IStream"){
                        parsed.set_r2s({operator: match[1], name: match[2]});
                    }
                }
            }
            else if(trimmed_line.startsWith("FROM NAMED WINDOW")){
                const regexp = /FROM +NAMED +WINDOW +([^ ]+) +ON +STREAM +([^ ]+) +\[RANGE +([^ ]+) +STEP +([^ ]+)\]/g;
                const matches = trimmed_line.matchAll(regexp);
                for (const match of matches) {
                    console.log(match[1]);

                    console.log(match[2]);
                    console.log(match[3]);
                    console.log(match[4]);
                    parsed.add_s2r({window_name: match[1],
                        stream_name: match[2],
                        width: Number(match[3]),
                        slide: Number(match[4])});
                }
            }else{
                var sparqlLine = trimmed_line;
                if (sparqlLine.startsWith("WINDOW")){
                    sparqlLine = sparqlLine.replace("WINDOW","GRAPH");
                }
                sparqlLines.push(sparqlLine);
            }
        });
        parsed.sparql = sparqlLines.join("\n");
        return parsed;
    }
}