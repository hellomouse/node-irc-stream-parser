import { Transform } from 'stream';
import numerics from './numerics';

/** Class representing an IRC message */
class IRCMessage {
  tags: {
    [key: string]: string;
  };
  raw: string;
  prefix: string | null;
  numeric: Number | null;
  command: Number | string | null;
  args: string[];

  /**
   * Constructor for the class
   * @param {String} message Raw IRC message to parse
   */
  constructor(message: string) {
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
  opts: {
    encoding?: string;
  }
  encoding: string;
  _partialData: String | String[];
  /**
   * Constructs a new Parser
   * @param {Object} opts Options for the parser
   * @param {String} opts.encoding The encoding for data coming in
   */
  constructor(opts?: { encoding?: string }) {
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
  _transform(data: Buffer, encoding: string, callback: (error: Error | undefined, data: String | Buffer)): void {
    data = this._partialData + data.tostring(this.encoding);
    let messages = data.split(/[\r\n]+/g);
    this._partialData = messages.splice(-1, 1); // store partial line for later
    messages = messages.filter((m: string) => m !== '');
    for (let message of messages) this.push(new IRCMessage(message));
    callback(null);
  }
}

export default Parser;
