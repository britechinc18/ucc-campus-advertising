import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { createProfile,createAdvert,saveAdvert,submitAdvert,moderate,transition } from '../src/server/adverts';
import { db } from '../src/server/db';
const url=process.env.TEST_DATABASE_URL;
// Only an explicitly designated test database may be reset.
const suite=url?describe:describe.skip;
suite('PostgreSQL advert lifecycle and concurrent quotas',()=>{
 let pool:Pool;let owner:string;let admin:string;let stranger:string;let categoryId:string;
 const content=(title='Campus tutoring offer')=>({title,description:'Medical science tutoring available near campus.',categoryId,kind:'service',condition:'not_applicable',priceMode:'fixed',pricePesewas:5000,location:'UCC campus',phone:'0241234567',contactConsent:true,mediaIds:[]});
 async function draft(title?:string){return createAdvert(owner,content(title));}
 async function submit(title?:string){const d=await draft(title);await submitAdvert(owner,d.advertId,d.revisionId,randomUUID());return d;}
 beforeAll(async()=>{
  if(!url||!new URL(url).pathname.endsWith('_test'))throw new Error('TEST_DATABASE_URL database name must end in _test');
  process.env.DATABASE_URL=url;pool=new Pool({connectionString:url});
 });
 beforeEach(async()=>{
  await pool.query('TRUNCATE users,advertisers,adverts,advert_revisions,advertiser_daily_usage,idempotency_keys,audit_events,reports,media_assets,revision_media,business_profiles,featured_adverts,daily_advert_metrics,rate_limit_buckets CASCADE');
  await pool.query('update platform_settings set max_active=5,daily_limit=3,duration_days=30');
  owner=randomUUID();admin=randomUUID();stranger=randomUUID();
  await pool.query("insert into users(id,role,email) values($1,'advertiser','owner@test.invalid'),($2,'admin','admin@test.invalid'),($3,'advertiser','other@test.invalid')",[owner,admin,stranger]);
  await createProfile(owner,{name:'Campus Seller',kind:'student',consent:true});
  categoryId=(await pool.query('select id from categories limit 1')).rows[0].id;
 });
 afterAll(async()=>{await pool.end();await db().$client.end();});
 it('keeps submissions private until approval and starts 30 days on approval',async()=>{
  const d=await submit();
  expect((await pool.query('select state from adverts where id=$1',[d.advertId])).rows[0].state).toBe('pending');
  await moderate(admin,d.revisionId,'approve','Reviewed and acceptable');
  const a=(await pool.query('select *,extract(epoch from expires_at-published_at)/86400 as duration from adverts where id=$1',[d.advertId])).rows[0];
  expect(a.state).toBe('published');expect(Number(a.duration)).toBe(30);
 });
 it('enforces daily limit under concurrent independent connections',async()=>{
  const ds=await Promise.all(Array.from({length:5},(_,i)=>draft(`Different tutoring ${i}`)));
  const results=await Promise.allSettled(ds.map(d=>submitAdvert(owner,d.advertId,d.revisionId,randomUUID())));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(3);
  expect((await pool.query('select count from advertiser_daily_usage')).rows[0].count).toBe(3);
 });
 it('reserves pending slots and rejects sixth concurrent submission',async()=>{
  await pool.query('update platform_settings set daily_limit=100');
  const ds=await Promise.all(Array.from({length:7},(_,i)=>draft(`Unique service ${i}`)));
  const results=await Promise.allSettled(ds.map(d=>submitAdvert(owner,d.advertId,d.revisionId,randomUUID())));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(5);
 });
 it('replays idempotent requests once and rejects key reuse',async()=>{
  const d=await draft();const key=randomUUID();
  const result=await Promise.all([submitAdvert(owner,d.advertId,d.revisionId,key),submitAdvert(owner,d.advertId,d.revisionId,key)]);
  expect(result[0]).toEqual(result[1]);
  expect((await pool.query('select count from advertiser_daily_usage')).rows[0].count).toBe(1);
  const other=await draft('Another different service');
  await expect(submitAdvert(owner,other.advertId,other.revisionId,key)).rejects.toMatchObject({code:'IDEMPOTENCY_CONFLICT'});
 });
 it('blocks cross-owner edits and non-admin moderation',async()=>{
  const d=await submit();
  await expect(saveAdvert(stranger,d.advertId,content())).rejects.toMatchObject({code:'FORBIDDEN'});
  await expect(moderate(owner,d.revisionId,'approve','Not authorized')).rejects.toMatchObject({code:'FORBIDDEN'});
 });
 it('keeps the approved revision and expiry during edit review',async()=>{
  const d=await submit();await moderate(admin,d.revisionId,'approve','Reviewed');
  const before=(await pool.query('select * from adverts where id=$1',[d.advertId])).rows[0];
  const edited=await saveAdvert(owner,d.advertId,content('Updated campus tutoring'));
  await submitAdvert(owner,d.advertId,edited.revisionId,randomUUID());
  expect((await pool.query('select approved_revision_id from adverts where id=$1',[d.advertId])).rows[0].approved_revision_id).toBe(d.revisionId);
  await moderate(admin,edited.revisionId,'approve','Reviewed edit');
  const after=(await pool.query('select * from adverts where id=$1',[d.advertId])).rows[0];
  expect(after.expires_at).toEqual(before.expires_at);expect(after.approved_revision_id).toBe(edited.revisionId);
 });
 it('does not republish an expired advert by approving a stale edit',async()=>{
  const d=await submit();await moderate(admin,d.revisionId,'approve','Reviewed');
  const edit=await saveAdvert(owner,d.advertId,content('New tutoring wording'));
  await submitAdvert(owner,d.advertId,edit.revisionId,randomUUID());
  await pool.query("update adverts set expires_at=now()-interval '1 second' where id=$1",[d.advertId]);
  await expect(moderate(admin,edit.revisionId,'approve','Too late')).rejects.toMatchObject({code:'EXPIRED'});
 });
 it('rejects exact duplicates without consuming quota',async()=>{
  await submit();const duplicate=await draft();
  await expect(submitAdvert(owner,duplicate.advertId,duplicate.revisionId,randomUUID())).rejects.toMatchObject({code:'DUPLICATE'});
  expect((await pool.query('select count from advertiser_daily_usage')).rows[0].count).toBe(1);
 });
 it('allows rejected corrections without charging the daily count again',async()=>{
  const d=await submit();await moderate(admin,d.revisionId,'reject','Add more detail');
  const edit=await saveAdvert(owner,d.advertId,content('Corrected tutoring wording'));
  await submitAdvert(owner,d.advertId,edit.revisionId,randomUUID());
  expect((await pool.query('select count from advertiser_daily_usage')).rows[0].count).toBe(1);
 });
 it('does not refund daily usage on withdrawal',async()=>{
  const d=await submit();await transition(owner,d.advertId,'withdrawn');
  expect((await pool.query('select count from advertiser_daily_usage')).rows[0].count).toBe(1);
  expect((await pool.query('select status from advert_revisions where id=$1',[d.revisionId])).rows[0].status).toBe('cancelled');
 });
 it('rechecks a lowered capacity limit at approval',async()=>{
  const d=await submit();await submit('Different campus service');
  await pool.query('update platform_settings set max_active=1');
  await expect(moderate(admin,d.revisionId,'approve','Reviewed')).rejects.toMatchObject({code:'ACTIVE_LIMIT'});
 });
 it('blocks suspended users and sellers',async()=>{
  const d=await draft();await pool.query('update users set suspended=true where id=$1',[owner]);
  await expect(submitAdvert(owner,d.advertId,d.revisionId,randomUUID())).rejects.toMatchObject({code:'SUSPENDED'});
 });
});
