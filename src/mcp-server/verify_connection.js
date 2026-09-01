import WebSocket from 'ws';
import { execSync } from 'child_process';

try {
    const ip = process.env.BLENDER_HOST || '127.0.0.1';
    const port = process.env.BLENDER_PORT || '9882';
    console.log(`Detected IP: ${ip}:${port}`);
    
    const url = `ws://${ip}:${port}`;
    console.log(`Connecting to: ${url}`);
    
    const ws = new WebSocket(url);
    
    ws.on('open', () => {
        console.log('SUCCESS: Connected to Blender via WebSocket!');
        ws.close();
        process.exit(0);
    });
    
    ws.on('error', (err) => {
        console.error('ERROR: Connection failed:', err.message);
        process.exit(1);
    });
    
    setTimeout(() => {
        console.log('TIMEOUT: Connection timed out');
        ws.terminate();
        process.exit(1);
    }, 5000);

} catch (e) {
    console.error('Script error:', e);
}
