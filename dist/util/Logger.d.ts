export declare enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    CONFIG = 3,
    WARN = 4,
    ERROR = 5,
    FATAL = 6,
    SEVERE = 7,
    AUDIT = 8,
    STATS = 9
}
export declare enum LogDestination {
    CONSOLE = 0,
    FILE = 1
}
export declare class Logger {
    private log_level;
    private loggable_classes;
    private log_destination;
    constructor(logLevel: LogLevel, loggableClasses: string[], logDestination: any);
    setLogLevel(logLevel: LogLevel): void;
    setLoggableClasses(loggableClasses: string[]): void;
    setLogDestination(logDestination: LogDestination): void;
    log(level: LogLevel, message: string, className: string): void;
    trace(message: string, className: string): void;
    debug(message: string, className: string): void;
    info(message: string, className: string): void;
    config(message: string, className: string): void;
    warn(message: string, className: string): void;
    error(message: string, className: string): void;
    fatal(message: string, className: string): void;
    severe(message: string, className: string): void;
    audit(message: string, className: string): void;
    stats(message: string, className: string): void;
    static getLogger(logLevel: LogLevel, loggableClasses: string[], logDestination: LogDestination): Logger;
    static getLoggerWithDefaults(): Logger;
}
