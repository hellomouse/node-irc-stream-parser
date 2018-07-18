# irc-stream-parser

A streaming IRC parser

## Usage

```js
const Parser = require('irc-stream-parser');
const tls = require('tls');

let socket = tls.connect(6697, 'irc.freenode.net');
let parser = new Parser();
socket.pipe(parser).on('data', data => console.log(data));
socket.write(`NICK test${Math.floor(Math.random() * 1e+4)}\r\n`);
socket.write(`USER testing 0 * :irc-stream-parser example\r\n`);
```
