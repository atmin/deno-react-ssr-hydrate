import React from "react";
import ReactDOMServer from "react-dom-server";
import { serve } from "std/http/server.ts";
import { ServerRequest } from "std/http/server.ts";
import { mime } from "mimetypes";

import App from "./app.tsx";

const ssr = (component: React.FC) => (req: ServerRequest) =>
  req.respond({
    status: 200,
    body: `<!doctype html>
      <html>
        <head>
          <link rel="stylesheet" href="style.css" />
          <script type="module" src="app.js"></script>
        </head>
        <body>
          ${ReactDOMServer.renderToString(<App />)}
        </body>
      </html>`,
    headers: new Headers({
      "Content-Type": "text/html; charset=utf8",
    }),
  });

const staticFile = async (req: ServerRequest) => {
  const path = `${Deno.cwd()}/public${req.url}`;
  try {
    req.respond({
      body: await Deno.open(path),
      headers: new Headers({
        "Content-Type": mime.getType(path) || "text/plain",
      }),
    });
  } catch (err) {
    req.respond({ status: 404, body: "404 - not found" });
  }
};

const PORT = 8000;
const server = serve({ port: PORT });

interface Route {
  name: string;
  path: RegExp;
  handler: (req: ServerRequest, match: RegExpExecArray) => void;
}

const routes: Route[] = [{ name: "root", path: /^\/$/, handler: ssr(App) }];

const router = (req: ServerRequest) => {
  for (let route of routes) {
    const reg = route.path;
    const match = reg.exec(req.url);
    if (match) return route.handler(req, match);
  }
  return staticFile(req);
};

console.log(`🚀 Server is running on http://localhost:${PORT}`);

for await (const req of server) {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  router(req);
}
