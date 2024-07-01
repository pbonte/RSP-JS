"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogDestination = exports.LogLevel = void 0;
const fs = __importStar(require("fs"));
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["TRACE"] = 0] = "TRACE";
    LogLevel[LogLevel["DEBUG"] = 1] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["CONFIG"] = 3] = "CONFIG";
    LogLevel[LogLevel["WARN"] = 4] = "WARN";
    LogLevel[LogLevel["ERROR"] = 5] = "ERROR";
    LogLevel[LogLevel["FATAL"] = 6] = "FATAL";
    LogLevel[LogLevel["SEVERE"] = 7] = "SEVERE";
    LogLevel[LogLevel["AUDIT"] = 8] = "AUDIT";
    LogLevel[LogLevel["STATS"] = 9] = "STATS";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
var LogDestination;
(function (LogDestination) {
    LogDestination[LogDestination["CONSOLE"] = 0] = "CONSOLE";
    LogDestination[LogDestination["FILE"] = 1] = "FILE";
})(LogDestination = exports.LogDestination || (exports.LogDestination = {}));
class Logger {
    constructor(logLevel, loggableClasses, logDestination) {
        this.log_level = logLevel;
        this.loggable_classes = loggableClasses;
        this.log_destination = logDestination;
        console.log(`Logger initialized with log level ${this.log_level}, loggable classes ${this.loggable_classes}, and log destination ${this.log_destination}`);
    }
    setLogLevel(logLevel) {
        this.log_level = logLevel;
    }
    setLoggableClasses(loggableClasses) {
        this.loggable_classes = loggableClasses;
    }
    setLogDestination(logDestination) {
        this.log_destination = logDestination;
    }
    log(level, message, className) {
        console.log(`Logging level: ${level}`);
        console.log(`this.log_level: ${this.log_level}`);
        if (level >= this.log_level && this.loggable_classes.includes(className)) {
            const logPrefix = `[${LogLevel[level]}] [${className}]`;
            const logMessage = `${Date.now()} ${logPrefix} ${message}`;
            console.log(`Logging destination: ${this.log_destination}`);
            switch (this.log_destination) {
                case 'CONSOLE':
                    console.log(logMessage);
                    break;
                case 'FILE':
                    try {
                        fs.appendFileSync(`./logs/${className}.log`, `${logMessage}\n`);
                    }
                    catch (error) {
                        console.error(`Error writing to file: ${error}`);
                    }
                    break;
                default:
                    console.log(`Invalid log destination: ${this.log_destination}`);
            }
        }
    }
    trace(message, className) {
        this.log(LogLevel.TRACE, message, className);
    }
    debug(message, className) {
        this.log(LogLevel.DEBUG, message, className);
    }
    info(message, className) {
        this.log(LogLevel.INFO, message, className);
    }
    config(message, className) {
        this.log(LogLevel.CONFIG, message, className);
    }
    warn(message, className) {
        this.log(LogLevel.WARN, message, className);
    }
    error(message, className) {
        this.log(LogLevel.ERROR, message, className);
    }
    fatal(message, className) {
        this.log(LogLevel.FATAL, message, className);
    }
    severe(message, className) {
        this.log(LogLevel.SEVERE, message, className);
    }
    audit(message, className) {
        this.log(LogLevel.AUDIT, message, className);
    }
    stats(message, className) {
        this.log(LogLevel.STATS, message, className);
    }
    static getLogger(logLevel, loggableClasses, logDestination) {
        return new Logger(logLevel, loggableClasses, logDestination);
    }
    static getLoggerWithDefaults() {
        return new Logger(LogLevel.INFO, [], LogDestination.CONSOLE);
    }
}
exports.Logger = Logger;
