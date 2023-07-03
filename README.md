# RSP.js

An RDF Stream Processing Library for Javascript built on top of [rdf-stores.js](https://github.com/rubensworks/rdf-stores.js/) and [Comunica](https://comunica.dev/)

## Installation

The library is available on npm. To install it, run the following command:

```
npm i rsp-js
```

## Usage

You can define a query using the RSP-QL syntax. An example query is shown below:

```ts
let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s ?p ?o}
    }`;
```

You can then create an instance of the RSPEngine and pass the query to it, as shown below:

```ts
let rspEngine = new RSPEngine(query);
```

You can add stream elements to the RSPEngine using the `add` method. The method takes in a stream element and a timestamp

```ts
import { RdfStore } from "rdf-stores";
import { DataFactory } from "rdf-data-factory";
const DF = new DataFactory();
stream.add(quad(
                DF.namedNode('https://rsp.js/test_subject_'),
                DF.namedNode('http://rsp.js/test_property'),
                DF.namedNode('http://rsp.js/test_object'),
                DF.defaultGraph(),
            ), timestamp_value);
```

In the following example, we will use a function `generate_data` to mock the stream.

```ts
import { RSPEngine, RDFStream } from "rsp4js";

async function RSP() {
  let query = `PREFIX : <https://rsp.js/>
    REGISTER RStream <output> AS
    SELECT *
    FROM NAMED WINDOW :w1 ON STREAM :stream1 [RANGE 10 STEP 2]
    WHERE{
        WINDOW :w1 { ?s ?p ?o}
    }`;

  let rspEngine = new RSPEngine(query);
  let stream = rspEngine.getStream("https://rsp.js/stream1");
  let emitter = rspEngine.register();
  let results = new Array<string>();
  emitter.on("RStream", (object: any) => {
    console.log("received results");
    results.push(object.bindings.toString());
  });
  if (stream) {
    generate_data(10, [stream]);
  }
  console.log(results);
}

RSP();
```

```ts
import { RdfStore } from "rdf-stores";
import { DataFactory } from "rdf-data-factory";
const DF = new DataFactory();

async function generate_data(num_events: number, rdfStreams: RDFStream[]) {
  for (let i = 0; i < num_events; i++) {
    rdfStreams.forEach((stream: any) => {
      const stream_element = quad(
        DF.namedNode("https://rsp.js/test_subject_" + i),
        DF.namedNode("http://rsp.js/test_property"),
        DF.namedNode("http://rsp.js/test_object"),
        DF.defaultGraph()
      );
      stream.add(stream_element, i);
    });
  }
}
```

## Current Features:

- RSP-QL support
- Support multiple windows
- Support for stream and static data joins