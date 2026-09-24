const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const str=(v,max=500)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const opt=(v,max=500)=>v===undefined||v===null||v===''||str(v,max);
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v));
const month=v=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const yesno=v=>v==='yes'||v==='no';
const validRows=(items,max,check)=>Array.isArray(items)&&items.length<=max&&items.every(check);
const address=a=>a&&str(a.street,180)&&str(a.city,100)&&str(a.state,60)&&str(a.zip,15)&&month(a.from);
const dated=a=>month(a.from)&&month(a.to)&&a.from<=a.to;
function validate(a){
  if(!a||typeof a!=='object'||!a.applicant||!a.address||!a.certification)return false;
  const p=a.applicant,c=a.certification;
  if(!str(p.fullName,120)||!date(p.dateOfBirth)||p.dateOfBirth>=new Date().toISOString().slice(0,10)||!str(p.phone,30)||!str(p.email,180)||!/^\d{3}-?\d{2}-?\d{4}$/.test(p.ssn||''))return false;
  if(!address(a.address)||!validRows(a.previousAddresses,20,x=>address(x)&&dated(x)))return false;
  if(!validRows(a.licenses,12,x=>str(x.authority,80)&&str(x.number,80)&&opt(x.class,50)&&date(x.expiration))||!a.licenses.length)return false;
  if(!opt(a.medicalExpiration,10)||(a.medicalExpiration&&!date(a.medicalExpiration))||!yesno(a.cdlApplicant))return false;
  if(!validRows(a.experience,20,x=>str(x.equipment,100)&&str(x.details,500)&&Number.isFinite(Number(x.years))&&Number(x.years)>=0&&Number(x.years)<=80)||!a.experience.length)return false;
  if(typeof a.noAccidents!=='boolean'||!validRows(a.accidents,30,x=>date(x.date)&&str(x.nature,250)&&Number.isInteger(Number(x.fatalities))&&Number(x.fatalities)>=0&&Number.isInteger(Number(x.injuries))&&Number(x.injuries)>=0&&opt(x.details,1000))||a.noAccidents===Boolean(a.accidents.length))return false;
  if(typeof a.noViolations!=='boolean'||!validRows(a.violations,30,x=>date(x.date)&&str(x.violation,250)&&str(x.location,150))||a.noViolations===Boolean(a.violations.length))return false;
  if(!yesno(a.licenseAction)||!opt(a.licenseExplanation,1500)||(a.licenseAction==='yes'&&!str(a.licenseExplanation,1500)))return false;
  if(!validRows(a.employers,30,x=>str(x.name,150)&&str(x.address,250)&&dated(x)&&str(x.reason,500)&&yesno(x.fmcsa)&&yesno(x.safetySensitive))||!a.employers.length)return false;
  if(typeof a.noOlderWork!=='boolean'||!validRows(a.olderEmployers,30,x=>str(x.name,150)&&str(x.address,250)&&dated(x)&&str(x.reason,500)))return false;
  if(a.cdlApplicant==='yes'&&a.noOlderWork===Boolean(a.olderEmployers.length))return false;
  if(c.accepted!==true||!str(c.signature,120)||c.signature.trim().replace(/\s+/g,' ').toLowerCase()!==p.fullName.trim().replace(/\s+/g,' ').toLowerCase()||c.date!==new Date().toISOString().slice(0,10))return false;
  return true;
}
export async function onRequestPost({request,env}){
  if(!env.APPLICATIONS_BUCKET||!env.TURNSTILE_SECRET_KEY||!env.TURNSTILE_SITE_KEY)return json({error:'Application service is not configured.'},503);
  const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid request origin.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Expected JSON.'},415);
  if(Number(request.headers.get('content-length'))>120000)return json({error:'Application is too large.'},413);
  let body;try{body=await request.json()}catch{return json({error:'Invalid application.'},400)}
  if(JSON.stringify(body).length>120000||!validate(body))return json({error:'Please review and complete all required application information.'},400);
  const token=body.turnstileToken;if(!str(token,2048))return json({error:'Complete the verification and try again.'},400);
  let verified;try{const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:request.headers.get('CF-Connecting-IP')})});verified=await response.json()}catch{return json({error:'Verification unavailable. Please try again.'},503)}
  const expectedHost=new URL(request.url).hostname;
  if(!verified.success||verified.hostname!==expectedHost)return json({error:'Verification failed. Refresh the verification and try again.'},403);
  const id=crypto.randomUUID();const submittedAt=new Date().toISOString();
  const {turnstileToken,...application}=body;
  const record={schemaVersion:1,id,submittedAt,carrier:{name:'Prestige Site Works LLC',address:'7224 Jameson Way, Stanley, NC'},application};
  try{await env.APPLICATIONS_BUCKET.put(`applications/${submittedAt.slice(0,10)}/${id}.json`,JSON.stringify(record),{httpMetadata:{contentType:'application/json'},customMetadata:{schema:'1'}})}catch{return json({error:'Could not save your application. Please try again.'},503)}
  return json({id,submittedAt},201);
}
export function onRequest(){return json({error:'Method not allowed.'},405)}
