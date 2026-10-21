import { Pool } from 'pg';
import { z } from 'zod';
const id=z.uuid().parse(process.argv[2]);
if(process.argv[3]!=='--confirm') throw new Error('Usage: npm run admin:grant -- <verified-user-uuid> --confirm');
if(!process.env.MIGRATION_DATABASE_URL) throw new Error('MIGRATION_DATABASE_URL required');
const pool=new Pool({connectionString:process.env.MIGRATION_DATABASE_URL,max:1});
const client=await pool.connect();
try {
 await client.query('begin');
 const result=await client.query("update users set role='admin' where id=$1 and email_verified is not null and not suspended returning id",[id]);
 if(result.rowCount!==1) throw new Error('User missing, suspended or email not verified');
 await client.query("insert into audit_events (action,target_id,detail) values ('bootstrap_admin',$1,'{\"source\":\"operator-cli\"}')",[id]);
 await client.query('commit');console.log('Administrator granted to verified user');
} catch(error){await client.query('rollback');throw error;}
finally{client.release();await pool.end();}
