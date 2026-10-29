/**
 * A tiny router. Register routes with `router.add(method, path, options, handler)`.
 *
 *   router.add('GET', '/api/things/:id', { auth: true }, ({ params, owner }) => ({ ... }));
 *
 * A handler receives `{ req, res, url, params, body, raw, user, owner }` and returns the
 * JSON to send. To send another status or header, return `reply(status, body, headers)`.
 * To send an error, `throw new HttpError(status, message)`.
 *
 * Options:
 *   auth: true       the caller must be logged in
 *   ownerOnly: true  and must be the shop owner (not a helper)
 *   raw: true        do not parse the body; the handler gets `raw` (a Buffer)
 */
'use strict';

const { HttpError, sendJson, readRawBody, parseJson, isSameOrigin } = require('./http');
const { currentSession } = require('./auth');

class Reply {
  constructor(status, body, headers) {
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
}
const reply = (status, body, headers = {}) => new Reply(status, body, headers);

class Router {
  constructor() {
    this.routes = [];
  }

  add(method, path, options, handler) {
    const names = [];
    const pattern = path.replace(/:([a-zA-Z]+)/g, (_, name) => {
      names.push(name);
      return '([^/]+)';
    });
    this.routes.push({ method, regex: new RegExp(`^${pattern}$`), names, options, handler });
  }

  /** Handle a request. Returns false when no route matches. */
  async handle(req, res, url) {
    for (const route of this.routes) {
      if (route.method !== req.method) continue;
      const match = url.pathname.match(route.regex);
      if (!match) continue;
      await this.run(route, match, req, res, url);
      return true;
    }
    return false;
  }

  async run(route, match, req, res, url) {
    try {
      const { options } = route;
      const isWrite = !['GET', 'HEAD'].includes(req.method);
      if (isWrite && !isSameOrigin(req)) throw new HttpError(403, 'Blocked: this request came from another website');

      const context = { req, res, url, params: {}, body: {}, raw: null, user: null, owner: null };
      route.names.forEach((name, index) => {
        context.params[name] = decodeURIComponent(match[index + 1]);
      });

      if (options.auth) {
        const session = currentSession(req);
        if (!session) throw new HttpError(401, 'Please log in');
        if (options.ownerOnly && session.user.role !== 'owner') {
          throw new HttpError(403, 'Only the shop owner can do this');
        }
        context.user = session.user;
        context.owner = session.owner;
      }

      if (isWrite) {
        const buffer = await readRawBody(req, options.rawLimit);
        if (options.raw) context.raw = buffer;
        else context.body = parseJson(buffer);
      }

      const result = await route.handler(context);
      if (res.writableEnded) return; // the handler already sent its own reply
      if (result instanceof Reply) sendJson(res, result.status, result.body, result.headers);
      else sendJson(res, 200, result === undefined ? { ok: true } : result);
    } catch (error) {
      if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message });
      console.error('[stoora] error:', error);
      sendJson(res, 500, { error: 'Something went wrong on the server' });
    }
  }
}

module.exports = { Router, reply, HttpError };
