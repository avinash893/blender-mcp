# Blender MCP Server v2

> AI-powered 3D creation for Antigravity, VSCode/Codex, and other MCP clients.

A production-ready MCP (Model Context Protocol) server that lets an AI client control Blender directly through natural language. Create 3D models, apply materials, sculpt meshes, render previews, export assets, and run custom `bpy` code from text prompts.

This project was originally written for Antigravity IDE, but the server uses standard MCP over stdio. It can also be used from VSCode MCP integrations, including the ChatGPT/Codex extension, as long as the client supports stdio MCP servers.

---

## Features

- **Standard MCP server** - Runs over stdio and can be launched by Antigravity, VSCode/Codex, or any compatible MCP client.
- **17 Blender tools** - From primitive creation to AI-assisted sculpting.
- **Blueprint system** - Structural model generation for buildings, weapons, vehicles, and robots.
- **Material and texture tools** - Apply material presets, image textures, and generated textures.
- **Vision feedback** - Render or preview a scene so the AI can inspect results and revise.
- **Token-optimized responses** - Compact JSON responses for efficient tool calls.
- **Cross-platform bridge** - TypeScript MCP server talks to the Blender Python addon through WebSocket.
- **Stdio stability fix** - The server entrypoint keeps the MCP process alive for stdio clients such as VSCode/Codex.

---

## Available Tools

| # | Tool | Description |
|---|------|-------------|
| 1 | `status` | Check Blender connection |
| 2 | `scene` | List objects in scene |
| 3 | `prim` | Create primitives (cube, sphere, cylinder, etc.) |
| 4 | `export` | Export models (GLB, FBX, OBJ) |
| 5 | `tex` | Apply textures from file |
| 6 | `mat` | Set materials (METAL, GLASS, WOOD, GLOW, etc.) |
| 7 | `proc` | Procedural generation (tree, rock, terrain) |
| 8 | `opt` | Optimize/decimate mesh |
| 9 | `render` | Full quality render |
| 10 | `bake` | Bake textures (normal, AO, diffuse) |
| 11 | `gentex` | AI texture generation + application |
| 12 | `pipe` | Step-by-step workflow orchestrator |
| 13 | `parse` | Analyze prompts structurally |
| 14 | `blueprint` | Generate complex models from structure |
| 15 | `sculpt` | AI-assisted mesh modification |
| 16 | `preview` | Quick render for AI vision feedback |
| 17 | `run` | Execute custom Python/bpy code |

---

## Requirements

- **Blender** 4.0+; validated locally with Blender 5.1.1.
- **Node.js** 20+; the package declares `>=20.0.0`.
- **npm** for dependency installation.
- **An MCP client**, such as Antigravity IDE, VSCode with MCP support, or VSCode ChatGPT/Codex.
- Optional: **WSL 2** when the MCP server runs in Linux and Blender runs on Windows.

> Note: The original project was optimized for Gemini 3 Pro in Antigravity. That is a model recommendation for complex 3D reasoning, not a hard protocol requirement. The server itself is standard MCP and has been validated with VSCode/Codex.

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/blender-mcp-v2.git
cd blender-mcp-v2
```

### 2. Install Node Dependencies

```bash
cd src/mcp-server
npm ci
npm run build
```

Use `npm install` if you are developing and intentionally updating `package-lock.json`.

### 3. Install Blender Addon

1. Open **Blender 4.0+**
2. Go to **Edit → Preferences → Add-ons**
3. Click **Install...**
4. Navigate to `blender-mcp-v2/src/blender-addon/mcp_connector_v2.py`
5. Select the file and click **Install Add-on**
6. Enable checkbox for **"Interface: MCP Connector v2"**
7. Click **Save Preferences**

### 4. Start Blender Server

1. In Blender, press `N` to open sidebar
2. Find the **MCP** tab
3. Click **Start Server**
4. Status should show: `Running on ws://0.0.0.0:9876` or `Running on ws://127.0.0.1:9876`
5. **Windows Firewall:** If asked, allow Python/Blender to only communicate on **Private** networks (or Public if using WSL).

---

## MCP Client Configuration

The TypeScript MCP server starts with:

```bash
node /FULL/PATH/TO/blender-mcp-v2/src/mcp-server/dist/index.js
```

The MCP server then connects to the Blender addon at:

```text
ws://127.0.0.1:9876
```

Use `BLENDER_HOST` and `BLENDER_PORT` when Blender is not reachable at the default endpoint.

### VSCode / Codex

VSCode MCP configuration uses a `servers` object. On Linux, the user-level config is usually:

```text
~/.config/Code/User/mcp.json
```

Example Linux configuration:

```json
{
  "inputs": [],
  "servers": {
    "blender-mcp": {
      "type": "stdio",
      "command": "/FULL/PATH/TO/node",
      "args": [
        "/FULL/PATH/TO/blender-mcp-v2/src/mcp-server/dist/index.js"
      ],
      "env": {
        "BLENDER_HOST": "127.0.0.1",
        "BLENDER_PORT": "9876",
        "LOG_LEVEL": "warn"
      }
    }
  }
}
```

Example from the local validated setup:

```json
{
  "inputs": [],
  "servers": {
    "blender-mcp": {
      "type": "stdio",
      "command": "/home/mackson/.config/nvm/versions/node/v25.9.0/bin/node",
      "args": [
        "/home/mackson/Documents/workspace/antigravity-blender-mcp/src/mcp-server/dist/index.js"
      ],
      "env": {
        "BLENDER_HOST": "127.0.0.1",
        "BLENDER_PORT": "9876",
        "LOG_LEVEL": "warn"
      }
    }
  }
}
```

After editing `mcp.json`, run **Developer: Reload Window** in VSCode or restart VSCode.

Test prompt:

```text
Check Blender connection status using blender-mcp
```

Example creation prompt:

```text
Use blender-mcp to create a red metallic cube named Codex_Test_Cube in Blender.
```

### Antigravity IDE

Antigravity MCP configuration uses an `mcpServers` object.

Config file:
- **Windows:** `C:\Users\{username}\.gemini\antigravity\mcp_config.json`
- **macOS/Linux:** `~/.gemini/antigravity/mcp_config.json`

Add the following configuration:

```json
{
  "mcpServers": {
    "blender-mcp": {
      "command": "node",
      "args": ["C:/FULL/PATH/TO/blender-mcp-v2/src/mcp-server/dist/index.js"],
      "env": {
        "BLENDER_HOST": "127.0.0.1",
        "BLENDER_PORT": "9876"
      }
    }
  }
}
```

Replace `C:/FULL/PATH/TO/` with your actual path. Use forward slashes `/` even on Windows.

Restart Antigravity IDE to load the MCP server.

> WSL users: The server can auto-detect the Windows host IP (`172.x.x.x`). You only need to hardcode `BLENDER_HOST` if auto-detection fails.

---

## Verification

### Verify the MCP Server Starts

```bash
cd src/mcp-server
timeout 3s node dist/index.js
```

You should see the server initialize and register tools. If the command times out, that is normal for a long-running stdio server.

### Verify Blender Connection Through MCP

With Blender open and the MCP addon running:

```bash
cd src/mcp-server
printf '%s\n' \
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"DRAFT-2025-v3","capabilities":{},"clientInfo":{"name":"manual-check","version":"1.0.0"}}}' \
'{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}' \
'{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"status","arguments":{}}}' \
| LOG_LEVEL=error timeout 8s node dist/index.js
```

Expected response content:

```json
{
  "connected": true,
  "version": {
    "bl": "5.1.1",
    "addon": "2.1.0",
    "sc": "Scene"
  }
}
```

---

## Usage Examples

### Basic Object Creation
```
Create a red metallic cube in Blender
```

### Complex Model with Blueprint
```
Create a cyberpunk building with neon signs
```

### AI-Assisted Sculpting
```
Take that sphere and add horns, make it look like a demon head
```

### Procedural Generation
```
Generate a low-poly tree for my game scene
```

### Full Workflow
```
Create an AWP sniper rifle, low poly style, optimize for mobile, export as GLB
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Antigravity / VSCode Codex / Any MCP Client                    │
│         │                                                        │
│         │ stdio (MCP Protocol)                                  │
│         ▼                                                        │
│  TypeScript MCP Server (17 tools)                               │
│         │                                                        │
│         │ WebSocket (ws://127.0.0.1:9876)                       │
│         ▼                                                        │
│  Python Addon (mcp_connector_v2.py)                             │
│         │                                                        │
│         │ bpy (Blender Python API)                              │
│         ▼                                                        │
│  Blender 4.x / 5.x                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
blender-mcp-v2/
├── src/
│   ├── mcp-server/              # TypeScript MCP server
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point
│   │   │   ├── server.ts        # MCP server + tool registration
│   │   │   ├── bridge/          # WebSocket client to Blender
│   │   │   ├── tools/           # All 17 tools
│   │   │   └── utils/           # Logger, config
│   │   ├── dist/                # Compiled JS (after build)
│   │   └── package.json
│   └── blender-addon/
│       └── mcp_connector_v2.py  # Blender addon (install this)
└── README.md
```

---

## Development

### Build

```bash
cd src/mcp-server
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Test Connection

```bash
cd src/mcp-server
node verify_connection.js
```

If you are running inside a restricted sandbox, local network calls may fail with `EPERM`. Test from a normal terminal or from the MCP client process in that case.

---

## Troubleshooting

### "Connection Failed" Error

1. Make sure Blender is running
2. Check MCP addon is enabled in Blender preferences
3. Click **Start Server** in MCP panel
4. Verify status shows "Running"

### "No Response" from Tools

1. Check Blender system console for errors
2. Verify WebSocket port is 9876
3. Try restarting Blender and your MCP client

### "Invalid Path" Error

- Use forward slashes `/` in MCP config files, even on Windows
- Use full absolute paths, not relative
- In VSCode, prefer the full path to `node` when using Node from `nvm`

### Addon Not Showing in Blender

1. Make sure you installed `src/blender-addon/mcp_connector_v2.py` (not the folder)
2. Check Blender version is 4.0+
3. Look in **Edit → Preferences → Add-ons** and search "MCP"

### VSCode Does Not Show the Server

1. Confirm the config file is valid JSON.
2. Confirm VSCode uses `servers`, not Antigravity's `mcpServers`.
3. Run **Developer: Reload Window** after editing `mcp.json`.
4. Check VSCode MCP logs if the server exits immediately.

### Local Connection Fails with `EPERM`

Some sandboxed environments block local network sockets. The MCP server may start and list tools, but calls to Blender can fail with:

```text
connect EPERM 127.0.0.1:9876
```

Run the MCP client or verification command outside the sandbox, or grant local network permissions.

### "Connection Refused" (WSL Users)

1. Ensure Windows Firewall allows `blender.exe` or `python.exe` to receive connections.
2. The addon must say `ws://0.0.0.0:9876`. If it says `127.0.0.1`, reinstall the latest addon.
3. You can verify connectivity using the provided script:
   ```bash
   cd src/mcp-server
   node verify_connection.js
   ```

---

## Designed For

This project is specifically designed for:

- **Antigravity IDE** - Original target environment.
- **VSCode/Codex** - Validated through VSCode MCP configuration and stdio MCP calls.
- **Any MCP client** - Compatible clients can launch `dist/index.js` over stdio.
- **Rapid 3D prototyping** - Create game assets, architectural concepts, scene mockups, and exports.

---

## License

MIT License - Feel free to use, modify, and distribute.

---

## Credits

Originally developed for the Antigravity IDE ecosystem, then documented and validated for standard MCP clients including VSCode/Codex.

Special thanks to the Blender and MCP communities.

---
