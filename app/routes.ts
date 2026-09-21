import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("healthz", "routes/healthz.ts"),
  route("auth/*", "routes/auth.$.tsx"),
  route("webhooks", "routes/webhooks.ts"),
  layout("routes/app.tsx", [
    index("routes/app._index.tsx"),
    route("app/quotes", "routes/app.quotes._index.tsx"),
    route("app/quotes/new", "routes/app.quotes.new.tsx"),
    route("app/quotes/:quoteId/edit", "routes/app.quotes.$quoteId.edit.tsx"),
    route("app/quotes/:quoteId", "routes/app.quotes.$quoteId.tsx")
  ])
] satisfies RouteConfig;
