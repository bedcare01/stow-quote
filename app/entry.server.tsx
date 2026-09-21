import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { renderToString } from "react-dom/server";
import { addDocumentResponseHeaders } from "./shopify.server";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  addDocumentResponseHeaders(request, responseHeaders);
  responseHeaders.set("Content-Type", "text/html");

  return new Response(
    `<!DOCTYPE html>${renderToString(
      <ServerRouter context={routerContext} url={request.url} />,
    )}`,
    { status: responseStatusCode, headers: responseHeaders },
  );
}
