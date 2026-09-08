import sys
import json
import asyncio
import websockets

async def run_code(script_text):
    uri = "ws://127.0.0.1:9882"
    async with websockets.connect(uri) as websocket:
        req = {
            "id": "live-cmd",
            "type": "run_script",
            "params": {
                "script": script_text
            }
        }
        await websocket.send(json.dumps(req))
        resp = await websocket.recv()
        return json.loads(resp)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg.endswith(".py"):
            with open(arg, "r", encoding="utf-8") as f:
                code = f.read()
        else:
            code = arg
    else:
        code = sys.stdin.read()
    
    res = asyncio.run(run_code(code))
    print(json.dumps(res, indent=2))
