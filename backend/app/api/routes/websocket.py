from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket import manager

router = APIRouter(tags=["websocket"])

@router.websocket("/ws/live")
@router.websocket("/ws/detections")
@router.websocket("/ws/alerts")
@router.websocket("/ws/cameras")
async def websocket_live_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type":"PONG"}')
    except WebSocketDisconnect:
        manager.disconnect(websocket)
