import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { db } from "../db.server";
import { formatGBP } from "../pricing.js";
export async function loader({request}:LoaderFunctionArgs){ const {session}=await authenticate.admin(request); const quotes=await db.quote.findMany({where:{shop:session.shop},include:{revisions:{orderBy:{revisionNumber:"desc"},take:1}},orderBy:{updatedAt:"desc"},take:100}); return {quotes}; }
export default function Quotes(){const {quotes}=useLoaderData<typeof loader>();return <><div className="topbar"><h1>Quotes</h1><a className="button" href="/app/quotes/new">New quote</a></div><div className="card"><table><thead><tr><th>Reference</th><th>Customer</th><th>Status</th><th className="money">Total</th></tr></thead><tbody>{quotes.map(q=><tr key={q.id}><td><a href={`/app/quotes/${q.id}`}>{q.reference}</a></td><td>{q.customerName}</td><td>{q.status.replaceAll("_"," ")}</td><td className="money">{formatGBP(q.revisions[0]?.grandTotalPence??0)}</td></tr>)}</tbody></table>{quotes.length===0&&<p className="muted">No quotations yet.</p>}</div></>}
