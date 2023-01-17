# RSP.js
An RDF Stream Processing Library for Javascript built on top of [N3.js](https://github.com/rdfjs/N3.js/) and [Comunica](https://comunica.dev/)

## Installation
```
npm i rsp-js
```

## Code examples

### 

## How to use RSP.js
```ts
    let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s ?p ?o}
    }`;

    let rspEngine = new RSPEngine(query);
    let stream= rspEngine.getStream("https://rsp.js/stream1");
    let resultStream = rspEngine.register();

    resultStream.on('RStream', (bindings) => {
        console.log(bindings);
    });
    ...
    stream.add(<some_graph>, <some_timestamp>);
```

## Current Features:
- RSP-QL support
- Support multiple windows
- Support for stream and static data joins
