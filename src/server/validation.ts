import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { createHash } from 'node:crypto';
export const id=z.uuid();
const phone=z.string().max(32).transform((s,ctx)=>{
 const p=parsePhoneNumberFromString(s,'GH');
 if(!p?.isValid()){ctx.addIssue({code:'custom',message:'Provide a valid phone number'});return z.NEVER;}
 return p.number;
});
export const contentSchema=z.object({
 title:z.string().trim().min(5).max(120),description:z.string().trim().min(20).max(5000),
 categoryId:id,kind:z.enum(['product','service','wanted']),condition:z.enum(['new','used','not_applicable']),
 priceMode:z.enum(['fixed','negotiable','free','contact','budget']),pricePesewas:z.number().int().min(0).max(100000000).nullable(),
 location:z.string().trim().min(2).max(120),phone:phone.optional(),whatsapp:phone.optional(),
 contactConsent:z.literal(true),mediaIds:z.array(id).max(5).default([]),
}).strict().superRefine((v,ctx)=>{
 if(!v.phone&&!v.whatsapp)ctx.addIssue({code:'custom',path:['phone'],message:'A public phone or WhatsApp contact is required'});
 if(new Set(v.mediaIds).size!==v.mediaIds.length)ctx.addIssue({code:'custom',path:['mediaIds'],message:'Duplicate images'});
 if(v.kind==='product'&&v.mediaIds.length===0)ctx.addIssue({code:'custom',path:['mediaIds'],message:'Products require a photo'});
 if(v.priceMode==='free'&&v.pricePesewas!==0)ctx.addIssue({code:'custom',path:['pricePesewas'],message:'Free adverts must have zero price'});
 if(v.priceMode==='contact'&&v.pricePesewas!==null)ctx.addIssue({code:'custom',path:['pricePesewas'],message:'Contact-for-price must omit price'});
 if(['fixed','budget'].includes(v.priceMode)&&v.pricePesewas===null)ctx.addIssue({code:'custom',path:['pricePesewas'],message:'Price or budget is required'});
 if(v.kind==='wanted'&&v.priceMode!=='budget')ctx.addIssue({code:'custom',path:['priceMode'],message:'Wanted adverts use a budget'});
 if(v.kind!=='wanted'&&v.priceMode==='budget')ctx.addIssue({code:'custom',path:['priceMode'],message:'Budget applies to wanted adverts'});
});
export type Content=z.infer<typeof contentSchema>;
export const profileSchema=z.object({name:z.string().trim().min(2).max(100),kind:z.enum(['student','business']),consent:z.literal(true)}).strict();
export const settingsSchema=z.object({maxActive:z.number().int().min(1).max(100),dailyLimit:z.number().int().min(1).max(100),durationDays:z.number().int().min(1).max(365),maxImages:z.number().int().min(1).max(5),maxImageBytes:z.number().int().min(1).max(5242880),autoPublish:z.literal(false)}).strict();
export function fingerprint(v:Content){return createHash('sha256').update(JSON.stringify([v.title,v.description,v.phone??'',v.whatsapp??'',v.categoryId].map(s=>s.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim()))).digest('hex');}
export function requestHash(value:unknown){return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
export function contactLinks(v:Content,url:string){return {phone:v.phone?`tel:${v.phone}`:null,whatsapp:v.whatsapp?`https://wa.me/${v.whatsapp.slice(1)}?text=${encodeURIComponent(`${v.title} — ${url}`)}`:null};}
