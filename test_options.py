import urllib.request, json

if __name__ == '__main__':
    req = urllib.request.Request('http://localhost:8000/api/users/register/', method='OPTIONS', headers={'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST'})
    try:
        res = urllib.request.urlopen(req)
        print(res.headers)
    except Exception as e:
        if hasattr(e, 'read'):
            print(e.read().decode())
        else:
            print(e)

