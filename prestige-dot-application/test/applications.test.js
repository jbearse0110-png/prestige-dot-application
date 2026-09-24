import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/applications.js';
const today=new Date().toISOString().slice(0,10);
const sample=()=>({
  applicant:{fullName:'Jane Test',dateOfBirth:'1990-01-01',phone:'555-0101',email:'jane@example.test',ssn:'000-00-0000'},
  address:{street:'1 Example St',city:'Stanley',state:'NC',zip:'28164',from:'2023-01'},previousAddresses:[],
  licenses:[{authority:'NC',number:'TESTONLY',class:'A',expiration:'2030-01-01'}],medicalExpiration:'',cdlApplicant:'no',
  experience:[{equipment:'dump truck',years:'4',details:'local roads'}],noAccidents:true,accidents:[],noViolations:true,violations:[],
  licenseAction:'no',licenseExplanation:'',employers:[{name:'Example Co',address:'2 Example St',from:'2023-01',to:'2026-01',reason:'new opportunity',fmcsa:'yes',safetySensitive:'yes'}],
  noOlderWork:false,olderEmployers:[],certification:{accepted:true,signature:'Jane Test',date:today},turnstileToken:'test-token'
});
function context(body,bucket){return {request:new Request('https://apply.example.test/api/applications',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://apply.example.test'},body:JSON.stringify(body)}),env:{APPLICATIONS_BUCKET:bucket,TURNSTILE_SECRET_KEY:'test-secret',TURNSTILE_SITE_KEY:'test-site'}}}
test('accepts complete submission, removes challenge token, returns stored confirmation ID',async()=>{
  const saved=[];const prior=globalThis.fetch;globalThis.fetch=async()=>Response.json({success:true,hostname:'apply.example.test'});
  try{const res=await onRequestPost(context(sample(),{put:async(...args)=>saved.push(args)}));assert.equal(res.status,201);const confirmation=await res.json();assert.match(confirmation.id,/^[0-9a-f-]{36}$/);assert.equal(saved.length,1);const record=JSON.parse(saved[0][1]);assert.equal(record.id,confirmation.id);assert.equal(record.application.applicant.ssn,'000-00-0000');assert.equal(record.application.turnstileToken,undefined)}finally{globalThis.fetch=prior}
});
test('rejects a missing CDL employer declaration before verification',async()=>{
  let checked=false;const prior=globalThis.fetch;globalThis.fetch=async()=>{checked=true;throw Error('should not call')};
  try{const data=sample();data.cdlApplicant='yes';const res=await onRequestPost(context(data,{put:async()=>{}}));assert.equal(res.status,400);assert.equal(checked,false)}finally{globalThis.fetch=prior}
});
test('rejects challenge from a different hostname and does not store data',async()=>{
  let stored=false;const prior=globalThis.fetch;globalThis.fetch=async()=>Response.json({success:true,hostname:'attacker.example'});
  try{const res=await onRequestPost(context(sample(),{put:async()=>{stored=true}}));assert.equal(res.status,403);assert.equal(stored,false)}finally{globalThis.fetch=prior}
});
