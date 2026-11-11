import type { ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { db } from '../db.server';
import { createQuote } from '../quotes.server';
import { saveDraftEnquiry } from '../configurations.server.js';
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
export async function action({ request }: ActionFunctionArgs) {
  const { session, admin } = await authenticate.public.appProxy(request);
  if (!session || !admin) return Response.json({ error: 'The quote app is not connected.' }, { status: 503, headers });
  if (!request.headers.get('content-type')?.includes('application/json')) return new Response(null, { status: 415 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 16000) return new Response(null, { status: 413 });
  try {
    const input = JSON.parse(raw);
    const result = await saveDraftEnquiry({ input, shop: session.shop, admin, db, env: process.env, createQuote });
    return Response.json(result, { headers });
  } catch (error) {
    const message = error instanceof Error && !('code' in error) ? error.message : 'Unable to save this configuration. Please try again.';
    return Response.json({ error: message }, { status: 400, headers });
  }
}
