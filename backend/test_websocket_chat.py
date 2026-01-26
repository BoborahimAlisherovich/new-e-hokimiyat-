#!/usr/bin/env python3
"""
WebSocket chat test client for Django Channels
Tests task chat WebSocket endpoint with JWT authentication
"""
import asyncio
import websockets
import json
import sys
import requests

# Get auth token
API_BASE = "http://localhost:8000"
login_data = {"pnfl": "12345678901234", "password": "admin123"}

print("🔐 Logging in to get JWT token...")
response = requests.post(f"{API_BASE}/api/auth/login/", json=login_data)
if response.status_code != 200:
    print(f"✗ Login failed: {response.status_code}")
    sys.exit(1)

token = response.json()["access"]
print(f"✓ Got token: {token[:50]}...")

# Get first task ID
print("\n📋 Fetching task list...")
tasks_response = requests.get(
    f"{API_BASE}/api/tasks/",
    headers={"Authorization": f"Bearer {token}"}
)
if tasks_response.status_code != 200:
    print(f"✗ Tasks fetch failed: {tasks_response.status_code}")
    sys.exit(1)

tasks = tasks_response.json()["results"]
if not tasks:
    print("✗ No tasks found in database")
    sys.exit(1)

task_id = tasks[0]["id"]
task_title = tasks[0]["title"]
print(f"✓ Using task: {task_title} (ID: {task_id})")

async def test_chat_websocket():
    ws_url = f"ws://localhost:8000/ws/tasks/{task_id}/chat/?token={token}"
    
    print(f"\n🔌 Connecting to WebSocket: {ws_url[:80]}...")
    
    try:
        async with websockets.connect(ws_url) as websocket:
            print("✓ WebSocket connected!")
            
            # Wait for initial message (history or welcome)
            print("\n📨 Waiting for server messages...")
            message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(message)
            print(f"✓ Received: {data.get('type', 'unknown')} message")
            if data.get('type') == 'history':
                msg_count = len(data.get('messages', []))
                print(f"  └─ Chat history: {msg_count} messages")
            
            # Send a test message
            test_msg = {
                "type": "text",
                "content": "Test message from Python WebSocket client"
            }
            print(f"\n📤 Sending test message: {test_msg['content']}")
            await websocket.send(json.dumps(test_msg))
            
            # Wait for echo/broadcast
            print("📥 Waiting for broadcast confirmation...")
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            resp_data = json.loads(response)
            print(f"✓ Received broadcast: {resp_data.get('type', 'unknown')}")
            if resp_data.get('type') == 'message':
                msg_content = resp_data.get('message', {}).get('content', '')
                print(f"  └─ Content: {msg_content[:50]}...")
            
            print("\n✅ WebSocket chat test PASSED")
            return True
            
    except asyncio.TimeoutError:
        print("✗ Timeout waiting for server response")
        return False
    except websockets.exceptions.WebSocketException as e:
        print(f"✗ WebSocket error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(test_chat_websocket())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n\n⚠ Test interrupted by user")
        sys.exit(1)
