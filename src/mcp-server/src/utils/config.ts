/**
 * Blender MCP Server - Configuration
 */

import { execSync } from 'child_process';

export interface Config {
    blender: {
        host: string;
        port: number;
    };
    server: {
        name: string;
        version: string;
    };
    logging: {
        level: string;
    };
}

function getWslHostIp(): string | null {
    try {
        const isWsl = !!process.env.WSL_DISTRO_NAME;
        if (!isWsl) return null;

        // Get the default gateway IP from ip route
        const output = execSync("ip route show default | awk '{print $3}'", { encoding: 'utf-8' });
        const ip = output.trim();
        
        // Basic IP validation
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
            return ip;
        }
        return null;
    } catch (error) {
        return null; // Fallback to localhost if detection fails
    }
}

export function loadConfig(): Config {
    const wslHostIp = getWslHostIp();
    
    return {
        blender: {
            host: process.env.BLENDER_HOST || wslHostIp || '127.0.0.1',
            port: parseInt(process.env.BLENDER_PORT || '9882', 10),
        },
        server: {
            name: 'blender-mcp',
            version: '2.0.0',
        },
        logging: {
            level: process.env.LOG_LEVEL || 'info',
        },
    };
}

export const config = loadConfig();
