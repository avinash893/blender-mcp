import bpy
import mcp_connector_v2
import time

# Ensure addon is registered and server is active
mcp_connector_v2.register()
print("[MCP Server] Background daemon listening on ws://0.0.0.0:9882", flush=True)

# Continuously pump tasks on the main thread
while True:
    try:
        mcp_connector_v2._pump_tasks()
    except Exception as e:
        print(f"Pump error: {e}", flush=True)
    time.sleep(0.01)
