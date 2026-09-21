import { db } from "./db.server.ts";
import { claimJob,processJob } from "./jobs.server.js";
const interval=Number(process.env.WORKER_POLL_INTERVAL_MS||2000);let stopping=false;process.on("SIGTERM",()=>{stopping=true});
while(!stopping){const job=await claimJob();if(!job){await new Promise(r=>setTimeout(r,interval));continue}try{await processJob(job);await db.job.update({where:{id:job.id},data:{status:"COMPLETED",completedAt:new Date(),lastError:null}})}catch(error){const final=job.attempts>=job.maxAttempts;await db.job.update({where:{id:job.id},data:{status:final?"FAILED":"PENDING",availableAt:new Date(Date.now()+Math.min(300000,2**job.attempts*1000)),lastError:error instanceof Error?error.message:"Unknown job error"}})}}
await db.$disconnect();
