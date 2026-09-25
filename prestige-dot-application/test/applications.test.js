import test from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument} from 'pdf-lib';
import {onRequestPost} from '../functions/api/applications.js';
const today=new Date().toISOString().slice(0,10);
const sample=()=>({
  applicant:{fullName:'Jane Test',dateOfBirth:'1990-01-01',phone:'555-0101',email:'jane@example.test'},
  address:{street:'1 Example St',city:'Stanley',state:'NC',zip:'28164',from:'2023-01'},previousAddresses:[],
  licenses:[{authority:'NC',number:'TESTONLY',class:'A',expiration:'2030-01-01'}],medicalExpiration:'',cdlApplicant:'no',
  experience:[{equipment:'dump truck',years:'4',details:'local roads'}],noAccidents:true,accidents:[],noViolations:true,violations:[],
  licenseAction:'no',licenseExplanation:'',employers:[{name:'Example Co',address:'2 Example St',from:'2023-01',to:'2026-01',reason:'new opportunity',fmcsa:'yes',safetySensitive:'yes'}],
  noOlderWork:false,olderEmployers:[],certification:{accepted:true,signature:'Jane Test',date:today},website:''
});
function context(body){return {request:new Request('https://apply.example.test/submit-application',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://apply.example.test'},body:JSON.stringify(body)}),env:{RESEND_API_KEY:'test-email-key',APPLICATION_EMAIL_TO:'hr@example.test',APPLICATION_EMAIL_FROM:'applications@example.test'}}}
test('creates a PDF and emails it to configured staff without a storage binding',async()=>{
  let email;const prior=globalThis.fetch;globalThis.fetch=async(url,options)=>{
    if(url==='https://api.resend.com/emails'){email=JSON.parse(options.body);return Response.json({id:'email-123'})}
    throw Error(`Unexpected request to ${url}`);
  };
  try{const res=await onRequestPost(context(sample()));assert.equal(res.status,201);const confirmation=await res.json();assert.match(confirmation.id,/^[0-9a-f-]{36}$/);const bytes=Buffer.from(email.attachments[0].content,'base64');assert.ok((await PDFDocument.load(bytes)).getPageCount()>0);assert.equal(email.to[0],'hr@example.test');assert.equal(email.attachments[0].filename,`DOT-application-${confirmation.id}.pdf`)}finally{globalThis.fetch=prior}
});
test('does not confirm when email API refuses delivery',async()=>{
  const prior=globalThis.fetch;globalThis.fetch=async url=>url==='https://api.resend.com/emails'?Response.json({error:'not accepted'},{status:503}):Promise.reject(Error(`Unexpected request to ${url}`));
  const priorError=console.error;console.error=()=>{};
  try{const res=await onRequestPost(context(sample()));assert.equal(res.status,503);assert.match((await res.json()).error,/could not be emailed/i)}finally{globalThis.fetch=prior;console.error=priorError}
});
test('rejects an unexpected SSN before email',async()=>{
  let called=false;const prior=globalThis.fetch;globalThis.fetch=async()=>{called=true;throw Error('should not call')};
  try{const data=sample();data.applicant.ssn='000-00-0000';const res=await onRequestPost(context(data));assert.equal(res.status,400);assert.equal(called,false)}finally{globalThis.fetch=prior}
});
test('rejects a missing CDL employer declaration before email',async()=>{
  let checked=false;const prior=globalThis.fetch;globalThis.fetch=async()=>{checked=true;throw Error('should not call')};
  try{const data=sample();data.cdlApplicant='yes';const res=await onRequestPost(context(data));assert.equal(res.status,400);assert.equal(checked,false)}finally{globalThis.fetch=prior}
});
test('rejects a filled hidden spam field before emailing',async()=>{
  let called=false;const prior=globalThis.fetch;globalThis.fetch=async()=>{called=true;throw Error('should not call')};
  try{const data=sample();data.website='spam.example';const res=await onRequestPost(context(data));assert.equal(res.status,400);assert.equal(called,false)}finally{globalThis.fetch=prior}
});
