import os
import uvicorn

if __name__ == "__main__":
    reload_flag = os.environ.get("UVICORN_RELOAD", "true").lower() in ("1", "true", "yes")
    uvicorn.run("main:app", host="0.0.0.0", port=8009, reload=reload_flag, loop="asyncio")
