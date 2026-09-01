/**
 * Blender MCP Server - Logger Utility
 * 
 * CRITICAL: All logging goes to stderr to prevent MCP protocol pollution.
 * stdout is SACRED - only MCP JSON-RPC messages go there.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
};

const RESET = '\x1b[0m';

class Logger {
    private level: LogLevel;
    private prefix: string;

    constructor(prefix: string = 'blender-mcp') {
        this.prefix = prefix;
        this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
    }

    private formatMessage(level: LogLevel, message: string, data?: unknown): string {
        const timestamp = new Date().toISOString();
        const color = LOG_COLORS[level];
        const levelStr = level.toUpperCase().padEnd(5);

        let msg = `${color}[${timestamp}] [${levelStr}] [${this.prefix}]${RESET} ${message}`;

        if (data !== undefined) {
            // Compact JSON for data
            const dataStr = JSON.stringify(data, null, 0);
            // Truncate if too long
            if (dataStr.length > 500) {
                msg += ` ${dataStr.substring(0, 500)}...`;
            } else {
                msg += ` ${dataStr}`;
            }
        }

        return msg;
    }

    /**
     * All log methods write to STDERR only
     */
    debug(message: string, data?: unknown): void {
        if (this.shouldLog('debug')) {
            console.error(this.formatMessage('debug', message, data));
        }
    }

    info(message: string, data?: unknown): void {
        if (this.shouldLog('info')) {
            console.error(this.formatMessage('info', message, data));
        }
    }

    warn(message: string, data?: unknown): void {
        if (this.shouldLog('warn')) {
            console.error(this.formatMessage('warn', message, data));
        }
    }

    error(message: string, data?: unknown): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, data));
        }
    }

    /**
     * Create a child logger with a sub-prefix
     */
    child(subPrefix: string): Logger {
        const child = new Logger(`${this.prefix}:${subPrefix}`);
        child.level = this.level;
        return child;
    }
}

// Singleton instance
export const logger = new Logger();

// Named exports for convenience
export const log = {
    debug: (msg: string, data?: unknown) => logger.debug(msg, data),
    info: (msg: string, data?: unknown) => logger.info(msg, data),
    warn: (msg: string, data?: unknown) => logger.warn(msg, data),
    error: (msg: string, data?: unknown) => logger.error(msg, data),
};
