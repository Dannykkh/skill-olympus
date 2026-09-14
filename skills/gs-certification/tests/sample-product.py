"""Loopback sample only: exercise unauthorized writes and invalid quantities."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import sys
import threading
import urllib.error
import urllib.request

mode = sys.argv[1]
state = {'quantity': 1, 'events': 0}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        quantity = body['quantity']
        authorized = self.headers.get('Authorization') == 'sample-owner'
        valid = type(quantity) is int and 1 <= quantity <= 10
        if mode == 'broken-auth':
            authorized = True
        if mode == 'broken-input':
            valid = True
        status = 200 if authorized and valid else 403 if not authorized else 422
        if status == 200 or mode == 'write-before-deny':
            state.update(quantity=quantity, events=state['events'] + 1)
        self.send_response(status)
        self.end_headers()


server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()


def request(owner, quantity):
    req = urllib.request.Request(f'http://127.0.0.1:{server.server_port}/items',
                                 json.dumps({'quantity': quantity}).encode(),
                                 {'Authorization': owner, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=3) as response:
            return response.status
    except urllib.error.HTTPError as error:
        error.close()
        return error.code


try:
    assert request('sample-owner', 10) == 200  # allowed boundary, positive control
    for actor, value, expected in [('sample-other', 3, 403),
                                    ('sample-owner', 0, 422),
                                    ('sample-owner', 11, 422),
                                    ('sample-owner', 'invalid', 422)]:
        before = dict(state)
        assert request(actor, value) == expected
        assert state == before, 'denied request changed storage/events'
    print('positive control, authorization, boundaries, input types, state/events: passed')
finally:
    server.shutdown()
    server.server_close()
    thread.join()
