import bpy
import mcp_connector_v2

if not bpy.app.timers.is_registered(mcp_connector_v2._pump_tasks):
    bpy.app.timers.register(mcp_connector_v2._pump_tasks, first_interval=0.02, persistent=True)
mcp_connector_v2._start_server_thread()
print("[MCP Server] WebSocket daemon running on ws://0.0.0.0:9882")
