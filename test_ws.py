import asyncio
import websockets

async def test_ws():
    uri = "ws://localhost:8009/workspace/terminal?user_id=test&lab_id=test&sprint_id=test"
    async with websockets.connect(uri) as ws:
        # read the initial bash output (which should include the prompt)
        try:
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                print(f"Received: {repr(msg)}")
        except asyncio.TimeoutError:
            print("Timeout waiting for more messages.")
        
        # Now send a command
        await ws.send("ls -la\r")
        
        try:
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=2.0)
                print(f"Received: {repr(msg)}")
        except asyncio.TimeoutError:
            pass

asyncio.run(test_ws())
