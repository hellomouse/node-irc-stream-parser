const { Transform } = require('stream');
const numerics = require('./numerics.json');

/** Class representing an IRC message */
class IRCMessage {
  /**
   * Constructor for the class
   * @param {String} message Raw IRC message to parse
   */
  constructor(message) {
    this.raw = message;
    let messageSplit = message.split(' ');
    let rawTags = null;
    this.prefix = null;
    let commandIndex = 0;
    this.tags = {};
    this.numeric = null;
    this.command = null;
    this.args = [];
    for (let i = 0; i < messageSplit.length; i++) {
      let part = messageSplit[i];
      if (part[0] === '@') rawTags = part;
      else if (part[0] === ':') this.prefix = part.slice(1);
      else { // end of header
        this.command = part;
        commandIndex = i;
        break;
      }
    }
    // TODO: don't split on backslashes
    if (rawTags) {
      let t = rawTags.split(';');
      for (let tag of t) {
        let [key, value] = tag.split('=');
        this.tags[key] = value;
      }
    }
    this.command = messageSplit[commandIndex];
    let maybeNumeric = +this.command;
    if (!Number.isNaN(maybeNumeric)) {
      this.command = numerics[this.command];
      this.numeric = maybeNumeric;
    }
    let commandArgs = messageSplit.slice(commandIndex);
    for (let i = 1; i < commandArgs.length; i++) {
      let arg = commandArgs[i];
      if (arg[0] === ':') {
        this.args.push(commandArgs.slice(i).join(' ').slice(1));
        break;
      } else this.args.push(arg);
    }
  }
}

/** Stream-based IRC message parser */
class Parser extends Transform {
  /**
   * Constructs a new Parser
   * @param {Object} opts Options for the parser
   * @param {String} opts.encoding The encoding for data coming in
   */
  constructor(opts) {
    super({ readableObjectMode: true });
    if (!opts) opts = {};
    this.opts = opts;
    this.encoding = opts.encoding || 'utf-8';
    this._partialData = '';
  }
  /**
   * Push data to the stream to be parsed
   * @param {Buffer} data The data to process
   * @param {String} encoding The encoding of the string
   * @param {Function} callback Called when the chunk is processed
   */
  _transform(data, encoding, callback) {
    data = this._partialData + data.toString(this.encoding);
    let messages = data.split(/[\r\n]+/g);
    this._partialData = messages.splice(-1, 1); // store partial line for later
    messages = messages.filter(m => m !== '');
    for (let message of messages) this.push(new IRCMessage(message));
    callback(null);
  }
}

module.exports = Parser;
