const query_engine = require('@comunica/query-sparql').QueryEngine;
async function main() {
    
    let time_now = Date.now();
    const queryEngine = new query_engine();
    let time_now2 = Date.now();
    console.log(time_now2);
    
    console.log(`Time taken to create the query engine: ${time_now2 - time_now}`);
}

main()