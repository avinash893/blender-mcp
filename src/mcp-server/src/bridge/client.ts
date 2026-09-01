/**
 * Blender MCP Server - WebSocket Client
 * 
 * Manages connection to Blender addon WebSocket server.
 */

import WebSocket from 'ws';
import { log } from '../utils/logger.js';
import { config } from '../utils/config.js';
import {
    BlenderRequest,
    BlenderResponse,
    BlenderResponseSchema,
    createRequest,
    createErrorResponse,
} from './protocol.js';

type PendingRequest = {
    resolve: (response: BlenderResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
};

export class BlenderBridge {
    private ws: WebSocket | null = null;
    private pendingRequests: Map<string, PendingRequest> = new Map();
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isConnecting = false;
    private connectionPromise: Promise<void> | null = null;

    private readonly url: string;
    private readonly timeout: number;

    constructor() {
        this.url = `ws://${config.blender.host}:${config.blender.port}`;
        this.timeout = 30000; // 30 second timeout for operations
    }

    /**
     * Check if connected to Blender
     */
    get isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Connect to Blender addon WebSocket server
     */
    async connect(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        if (this.isConnecting && this.connectionPromise) {
            return this.connectionPromise;
        }

        this.isConnecting = true;
        this.connectionPromise = this._doConnect();

        try {
            await this.connectionPromise;
        } finally {
            this.isConnecting = false;
            this.connectionPromise = null;
        }
    }

    private _doConnect(): Promise<void> {
        return new Promise((resolve, reject) => {
            log.info(`Connecting to Blender at ${this.url}...`);

            try {
                this.ws = new WebSocket(this.url);

                const connectTimeout = setTimeout(() => {
                    if (this.ws) {
                        this.ws.terminate();
                    }
                    reject(new Error(`Connection timeout to ${this.url}`));
                }, 5000);

                this.ws.on('open', () => {
                    clearTimeout(connectTimeout);
                    log.info('Connected to Blender successfully');
                    resolve();
                });

                this.ws.on('message', (data) => {
                    this.handleMessage(data.toString());
                });

                this.ws.on('close', () => {
                    log.warn('Disconnected from Blender');
                    this.ws = null;
                    this.rejectAllPending('Connection closed');
                });

                this.ws.on('error', (error) => {
                    clearTimeout(connectTimeout);
                    log.error('WebSocket error', { message: error.message });
                    this.ws = null;
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Disconnect from Blender
     */
    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.rejectAllPending('Disconnected');
    }

    /**
     * Send a request to Blender and wait for response
     */
    async send(
        type: BlenderRequest['type'],
        params?: Record<string, unknown>
    ): Promise<BlenderResponse> {
        // Try to connect if not connected
        if (!this.isConnected) {
            try {
                await this.connect();
            } catch (error) {
                return createErrorResponse(
                    'no_connection',
                    'CONNECTION_FAILED',
                    `Cannot connect to Blender at ${this.url}`,
                    'Make sure Blender is running with the MCP addon enabled and server started'
                );
            }
        }

        const request = createRequest(type, params);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(request.id);
                resolve(
                    createErrorResponse(
                        request.id,
                        'TIMEOUT',
                        `Request timed out after ${this.timeout}ms`,
                        'The operation may be taking too long. Try with simpler parameters.'
                    )
                );
            }, this.timeout);

            this.pendingRequests.set(request.id, { resolve, reject, timeout });

            try {
                const message = JSON.stringify(request);
                log.debug(`Sending request: ${type}`, { id: request.id });
                this.ws!.send(message);
            } catch (error) {
                clearTimeout(timeout);
                this.pendingRequests.delete(request.id);
                resolve(
                    createErrorResponse(
                        request.id,
                        'SEND_FAILED',
                        `Failed to send request: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        'Check Blender connection'
                    )
                );
            }
        });
    }

    /**
     * Handle incoming message from Blender
     */
    private handleMessage(data: string): void {
        try {
            const parsed = JSON.parse(data);
            const result = BlenderResponseSchema.safeParse(parsed);

            if (!result.success) {
                log.warn('Invalid response from Blender', { errors: result.error.errors });
                return;
            }

            const response = result.data;
            const pending = this.pendingRequests.get(response.id);

            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(response.id);
                pending.resolve(response);
                log.debug(`Response received for ${response.id}`, { success: response.success });
            } else {
                log.warn(`Received response for unknown request: ${response.id}`);
            }
        } catch (error) {
            log.error('Failed to parse Blender response', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Reject all pending requests
     */
    private rejectAllPending(reason: string): void {
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.resolve(
                createErrorResponse(id, 'DISCONNECTED', reason, 'Reconnect to Blender')
            );
        }
        this.pendingRequests.clear();
    }

    /**
     * Quick ping to check connection
     */
    async ping(): Promise<boolean> {
        if (!this.isConnected) {
            return false;
        }

        try {
            const response = await this.send('ping');
            return response.success;
        } catch {
            return false;
        }
    }
}

// Singleton instance
export const blenderBridge = new BlenderBridge();
