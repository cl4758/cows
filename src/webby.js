
const net = require('net');
const path = require('path');
const fs = require('fs');
const { request } = require('http');

const HTTP_STATUS_CODES = {
  200: 'OK',
  308: 'Permanent Redirect',
  404: 'Not Found',
  500: 'Internal Server Error'
};

const MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  html: 'text/html',
  css: 'text/css',
  txt: 'text/plain'
};

function getExtension(fileName) {
  const fileParts = fileName.split(".");
  if (fileParts.length < 2) {
    return '';
  }
  const extension = fileParts[fileParts.length - 1];
  return extension;
}

function getMIMEType(fileName) {
  const extension = getExtension(fileName);
  if (extension === '') {
    return '';
  }
  const mimeType = MIME_TYPES[extension];
  return mimeType;
}

class Request {
  constructor(s) {
    const [method, path, ...other] = s.split(' ');
    this.method = method;
    this.path = path;
  }
}

class Response {
  constructor(sock, statusCode = 200, version = 'HTTP/1.1') {
    this.sock = sock;
    this.statusCode = statusCode;
    this.version = version;
    this.headers = {};
    this.body = '';

  }

  set(name, value) {
    this.headers[name] = value;
  }

  end() {
    this.sock.end();
  }

  statusLineToString() {
    const status = HTTP_STATUS_CODES[this.statusCode];
    const statusLine = `${this.version} ${this.statusCode} ${status}\r\n`;
    return statusLine;
  }

  headersToString() {
    let str = '';
    for (const [name, value] of Object.entries(this.headers)) {
      str += `${name}: ${value}\r\n`;
    }
    return str;
  }

  send(body) {
    let str = '';
    const statusLine = this.statusLineToString();
    const headers = this.headersToString() === '' ? 'Content-Type: text/html\r\n' : this.headersToString();
    str += statusLine;
    str += headers;
    str += '\r\n';
    this.sock.write(str);
    str += body;
    this.sock.write(body);
    this.end();
  }

  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  }
}

class App {
  constructor() {
    this.server = net.createServer(sock => this.handleConnection(sock));
    this.routes = {};
    this.middleware = null;
  }

  normalizePath(path) {
    const regex = /\/(\w+)?/;
    const normalized = path.toLowerCase().match(regex);
    return normalized[0];
  }

  createRouteKey(method, path) {
    const httpMethod = method.toUpperCase();
    const urlPath = this.normalizePath(path);
    const routeKey = `${httpMethod} ${urlPath}`;
    return routeKey;
  }

  get(path, cb) {
    const key = this.createRouteKey('GET', path);
    this.routes[key] = cb;
  }

  use(cb) {
    this.middleware = cb;
  }

  listen(port, host) {
    this.server.listen(port, host);
  }

  handleConnection(sock) {
    sock.on('data', data => this.handleRequest(sock, data));
  }

  handleRequest(sock, binaryData) {
    const req = new Request(binaryData + '');
    const res = new Response(sock);

    function callNext(next) {
      next(req, res);
    }

    if (this.middleware !== null) {
      this.middleware(req, res, this.processRoutes.bind(this, req, res));
    } else {
      callNext(this.processRoutes.bind(this));
    }
  }

  processRoutes(req, res) {
    const key = this.createRouteKey(req.method, req.path);
    const r = (() => this.routes);
    if (this.routes.hasOwnProperty(key)) {
      const func = this.routes[key];
      func(req, res);
    } else {
      res.statusCode = 404;
      res.send('Page not found');
    }
  }

}

function serveStatic(basePath) {

  const middlewareFunc = function (req, res, next) {
    const reqPath = req.path === '/' ? '/index.html' : req.path;

    const fn = path.posix.join(basePath, reqPath);

    const extension = this.getExtension(reqPath);
    const mimeType = MIME_TYPES[extension];

    fs.readFile(fn, (err, data) => {
      if (err) {
        next();
      } else {
        res.set('Content-Type', mimeType);
        res.send(data);
      }
    });

  }.bind(this);

  return middlewareFunc;
}


module.exports = {
  HTTP_STATUS_CODES,
  MIME_TYPES,
  getExtension,
  getMIMEType,
  Request,
  Response,
  App,
  static: serveStatic
};





