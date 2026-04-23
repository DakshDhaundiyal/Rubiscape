import json
import requests

def test_process():
    url = "http://localhost:8000/api/process"
    data = [
        {"a": 1, "b": 10},
        {"a": 2, "b": 20},
        {"a": 100, "b": 30} # Anomaly in 'a'
    ]
    payload = {"data": data}
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_process()
