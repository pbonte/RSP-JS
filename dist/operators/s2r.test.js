"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const s2r_1 = require("./s2r");
const N3 = require('n3');
const { DataFactory } = N3;
const { namedNode, literal, defaultGraph, quad } = DataFactory;
function generate_data(num_events, csparqlWindow) {
    for (let i = 0; i < num_events; i++) {
        const stream_element = quad(namedNode('https://rsp.js/test_subject_' + i), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph());
        csparqlWindow.add(stream_element, i);
    }
}
test('create_graph_container', () => {
    const quad1 = quad(namedNode('https://ruben.verborgh.org/profile/#me'), namedNode('http://xmlns.com/foaf/0.1/givenName'), literal('Ruben', 'en'), defaultGraph());
    const quad2 = quad(namedNode('https://ruben.verborgh.org/profile/#me'), namedNode('http://xmlns.com/foaf/0.1/lastName'), literal('Verborgh', 'en'), defaultGraph());
    let content = new Set;
    content.add(quad1);
    content.add(quad2);
    let container = new s2r_1.QuadContainer(content, 0);
    expect(container.len()).toBe(2);
    expect(container.last_time_changed()).toBe(0);
});
test('add_to_window', () => {
    const quad1 = quad(namedNode('https://rsp.js/test_subject_0'), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph());
    const quad2 = quad(namedNode('https://rsp.js/test_subject_1'), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph());
    let csparqlWindow = new s2r_1.CSPARQLWindow(":window1", 10, 2, s2r_1.ReportStrategy.OnWindowClose, s2r_1.Tick.TimeDriven, 0, 60000);
    csparqlWindow.add(quad, 0);
});
test('test_scope', () => {
    let csparqlWindow = new s2r_1.CSPARQLWindow(":window1", 10, 2, s2r_1.ReportStrategy.OnWindowClose, s2r_1.Tick.TimeDriven, 0, 60000);
    csparqlWindow.scope(4);
    let num_active_windows = csparqlWindow.active_windows.size;
    /**
     * open windows:
     * [-6, 4)
     * [-4, 6)
     * [-2, 8)
     * [0, 10)
     * [2, 12)
     * [4, 14)
     */
    expect(num_active_windows).toBe(6);
});
test('test_evictions', () => {
    let csparqlWindow = new s2r_1.CSPARQLWindow(":window1", 10, 2, s2r_1.ReportStrategy.OnWindowClose, s2r_1.Tick.TimeDriven, 0, 60000);
    generate_data(10, csparqlWindow);
    expect(csparqlWindow.active_windows.size).toBe(5);
});
test('test_stream_consumer', () => {
    let recevied_data = new Array();
    let received_elementes = new Array;
    let csparqlWindow = new s2r_1.CSPARQLWindow(":window1", 10, 2, s2r_1.ReportStrategy.OnWindowClose, s2r_1.Tick.TimeDriven, 0, 60000);
    // register window consumer
    csparqlWindow.subscribe('RStream', function (data) {
        console.log('Foo raised, Args:', data);
        console.log('dat size', data.elements.size);
        recevied_data.push(data);
        data.elements.forEach(item => received_elementes.push(item));
    });
    // generate some data
    generate_data(10, csparqlWindow);
    expect(recevied_data.length).toBe(4);
    expect(received_elementes.length).toBe(2 + 4 + 6 + 8);
});
test('test_content_get', () => {
    let recevied_data = new Array();
    let received_elementes = new Array;
    let csparqlWindow = new s2r_1.CSPARQLWindow(":window1", 10, 2, s2r_1.ReportStrategy.OnWindowClose, s2r_1.Tick.TimeDriven, 0, 60000);
    // generate some data
    generate_data(10, csparqlWindow);
    let content = csparqlWindow.getContent(10);
    expect(content).toBeDefined();
    if (content) {
        expect(content.elements.size).toBe(10);
    }
    let undefinedContent = csparqlWindow.getContent(20);
    expect(undefinedContent).toBeUndefined();
});
describe('out_of_order_processing', () => {
});
test('test_the_max_delay_function', () => {
    let window;
    const width = 10;
    const slide = 5;
    const max_delay = 50;
    const start_time = 0;
    window = new s2r_1.CSPARQLWindow('testWindow', width, slide, s2r_1.ReportStrategy.OnWindowClose, s2r_1.Tick.TimeDriven, start_time, max_delay);
    window.subscribe('RStream', (data) => {
        console.log(`RStream output: ${data}`);
    });
    console.log(window);
    window.set_current_time(100);
    window.add(quad(namedNode('https://rsp.js/test_subject_0'), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph()), 18);
    window.add(quad(namedNode('https://rsp.js/test_subject_1'), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph()), 5);
    expect(window.active_windows.size).toBe(0);
});
test('out_of_order_processing', () => {
    let window;
    const width = 10;
    const slide = 5;
    const max_delay = 10;
    const start_time = 0;
    window = new s2r_1.CSPARQLWindow('testWindow', width, slide, s2r_1.ReportStrategy.OnWindowClose, s2r_1.Tick.TimeDriven, start_time, max_delay);
    window.subscribe('RStream', (data) => {
        console.log(`RStream output: ${data}`);
    });
    window.set_current_time(20);
    window.add(quad(namedNode('https://rsp.js/test_subject_0'), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph()), 28);
    window.add(quad(namedNode('https://rsp.js/test_subject_1'), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph()), 15);
    window.add(quad(namedNode('https://rsp.js/test_subject_2'), namedNode('http://rsp.js/test_property'), namedNode('http://rsp.js/test_object'), defaultGraph()), 14);
    expect(window.active_windows.size).toBe(2);
    clearInterval(window.interval_id);
});
