import urllib.request, json, sys; req = urllib.request.Request('http://127.0.0.1:8000/api/users/register/', data=json.dumps({'username':'testuser4', 'password':'password123', 'phone_number':'1234567890'}).encode(), headers={'Content-Type': 'application/json'});
try:
  urllib.request.urlopen(req)
except Exception as e:
  print(e.read().decode())
