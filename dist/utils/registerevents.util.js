"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEvents = void 0;
const example_event_1 = require("../events/example.event");
const registerEvents = (socket) => {
    socket.on("example", (params) => (0, example_event_1.exampleHandler)(Object.assign({ socket }, params)));
};
exports.registerEvents = registerEvents;
