import type { LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export async function loader({request}:LoaderFunctionArgs){ await authenticate.admin(request); return {apiKey:process.env.SHOPIFY_API_KEY||""}; }
export default function AppLayout(){ const {apiKey}=useLoaderData<typeof loader>(); return <AppProvider embedded apiKey={apiKey}><div className="shell"><div className="topbar"><strong>Stow &amp; Settle Quotations</strong><nav><a className="button secondary" href="/app/quotes">Quotes</a></nav></div><Outlet/></div></AppProvider>; }
