import asyncio

import httpx

from backend.app.main import app


def request(method, path):
    async def call():
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test"
        ) as client:
            return await client.request(method, path)

    return asyncio.run(call())


def test_health_is_liveness_only():
    response = request("GET", "/api/health")
    assert response.status_code == 200
    assert response.json() == {
        "schema_version": "1.0.0",
        "status": "ok",
        "service": "motioncoach-api",
        "version": "0.1.0",
    }


def test_openapi_publishes_health_and_job_routes():
    paths = set(request("GET", "/openapi.json").json()["paths"])
    assert "/api/health" in paths
    assert "/api/videos" in paths
    assert "/api/analyses/{job_id}/export" not in paths
    assert request("POST", "/api/videos").status_code == 422
