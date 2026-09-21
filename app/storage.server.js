import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function storePrivateArtifact(key, body, contentType) {
  if (process.env.NODE_ENV !== "production" && !process.env.OBJECT_STORAGE_ENDPOINT) {
    const root=join(process.cwd(),"storage"); const path=join(root,key); await mkdir(join(path,".."),{recursive:true}); await writeFile(path,body); return key;
  }
  const required=["OBJECT_STORAGE_REGION","OBJECT_STORAGE_BUCKET","OBJECT_STORAGE_ACCESS_KEY_ID","OBJECT_STORAGE_SECRET_ACCESS_KEY"];
  for(const name of required) if(!process.env[name]) throw new Error(`Missing ${name}`);
  const client=new S3Client({region:process.env.OBJECT_STORAGE_REGION,endpoint:process.env.OBJECT_STORAGE_ENDPOINT||undefined,credentials:{accessKeyId:process.env.OBJECT_STORAGE_ACCESS_KEY_ID,secretAccessKey:process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY}});
  await client.send(new PutObjectCommand({Bucket:process.env.OBJECT_STORAGE_BUCKET,Key:key,Body:body,ContentType:contentType,ServerSideEncryption:"AES256"})); return key;
}
