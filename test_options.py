import urllib.request, json; req = urllib.request.Request('http://localhost:8000/api/users/register/', method='OPTIONS', headers={'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST'});
try:
  res = urllib.request.urlopen(req)
  print(res.headers)
except Exception as e:
  print(e.read().decode())
