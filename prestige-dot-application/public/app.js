const form=document.querySelector('#application');
const status=document.querySelector('#status');
// Never allow a native form navigation to discard the applicant's entries.
form.addEventListener('submit',event=>event.preventDefault());
const groups=['addresses','licenses','experience','accidents','violations','employers','olderEmployers'];
// Turnstile site keys are public. Keeping this key in the static page means
// applicants can load the form even when an in-app browser blocks /api/config.
const sitekey='0x4AAAAAAFDUUqm8WpdPwXch';
function add(group){const node=document.querySelector(`#${group}-template`).content.firstElementChild.cloneNode(true);document.querySelector(`#${group}`).append(node);return node;}
for(const button of document.querySelectorAll('[data-add]'))button.addEventListener('click',()=>add(button.dataset.add));
form.addEventListener('click',e=>{if(e.target.classList.contains('remove'))e.target.closest('.row').remove()});
add('licenses');add('experience');add('employers');
for(const group of ['accidents','violations']){const check=form.elements[group==='accidents'?'noAccidents':'noViolations'];check.addEventListener('change',()=>{const container=document.querySelector(`#${group}`);if(check.checked)container.replaceChildren()});document.querySelector(`[data-add="${group}"]`).addEventListener('click',()=>{check.checked=false})}
form.elements.cdlApplicant.addEventListener('change',()=>{const yes=form.elements.cdlApplicant.value==='yes';document.querySelector('#olderWork').hidden=!yes;if(!yes)document.querySelector('#olderEmployers').replaceChildren()});
function value(name){return form.elements[name]?.value?.trim()||''}
function rows(group){return [...document.querySelectorAll(`#${group} .row`)].map(row=>Object.fromEntries([...row.querySelectorAll('[data-field]')].map(el=>[el.dataset.field,el.value.trim()])))}
function problem(message,element){status.textContent=message;status.className='error';element?.focus();status.scrollIntoView({behavior:'smooth',block:'center'});return false}
function validate(){
  if(!form.checkValidity()){const invalid=form.querySelector(':invalid');invalid?.reportValidity();return problem('Please complete the highlighted required field.',invalid)}
  if(value('signature').toLowerCase().replace(/\s+/g,' ')!==value('fullName').toLowerCase().replace(/\s+/g,' '))return problem('Your typed signature must match your full legal name.',form.elements.signature);
  const today=new Date().toISOString().slice(0,10);
  if(value('signatureDate')!==today)return problem('Please enter today’s date for your signature.',form.elements.signatureDate);
  if(value('dateOfBirth')>=today)return problem('Please check your date of birth.',form.elements.dateOfBirth);
  if(!form.elements.noAccidents.checked&&!rows('accidents').length)return problem('List your accidents or confirm that you had none.');
  if(!form.elements.noViolations.checked&&!rows('violations').length)return problem('List your traffic violations or confirm that you had none.');
  if(value('licenseAction')==='yes'&&!value('licenseExplanation'))return problem('Please explain the license action.',form.elements.licenseExplanation);
  if(value('cdlApplicant')==='yes'&&!form.elements.noOlderWork.checked&&!rows('olderEmployers').length)return problem('List earlier CDL driving employers or confirm that you had none.');
  for(const group of groups)for(const row of rows(group))if(row.from&&row.to&&row.from>row.to)return problem(`A date range in ${group} ends before it starts.`);
  return true;
}
function configure(){window.turnstileReady=()=>{if(window.turnstile)window.turnstile.render('#turnstile',{sitekey})};if(window.turnstile)window.turnstileReady();else{const timer=setInterval(()=>{if(window.turnstile){clearInterval(timer);window.turnstileReady()}},200);setTimeout(()=>{clearInterval(timer);if(!window.turnstile)problem('Verification did not load. Please open this link in Safari or Chrome and try again.')},15000)}}
form.addEventListener('submit',async e=>{e.preventDefault();if(!validate())return;if(!sitekey)return problem('Submission is not configured yet.');const token=document.querySelector('[name="cf-turnstile-response"]')?.value;if(!token)return problem('Please complete the verification before submitting.');
  const payload={applicant:{fullName:value('fullName'),dateOfBirth:value('dateOfBirth'),phone:value('phone'),email:value('email')},address:{street:value('currentStreet'),city:value('currentCity'),state:value('currentState'),zip:value('currentZip'),from:value('currentFrom')},previousAddresses:rows('addresses'),licenses:rows('licenses'),medicalExpiration:value('medicalExpiration'),cdlApplicant:value('cdlApplicant'),experience:rows('experience'),noAccidents:form.elements.noAccidents.checked,accidents:rows('accidents'),noViolations:form.elements.noViolations.checked,violations:rows('violations'),licenseAction:value('licenseAction'),licenseExplanation:value('licenseExplanation'),employers:rows('employers'),noOlderWork:form.elements.noOlderWork.checked,olderEmployers:rows('olderEmployers'),certification:{accepted:form.elements.certify.checked,signature:value('signature'),date:value('signatureDate')},turnstileToken:token};
  const submit=form.querySelector('.submit');submit.disabled=true;status.textContent='Submitting securely…';status.className='';
  try{const response=await fetch('/submit-application',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw Error(result.error||'Submission failed.');form.replaceWith(Object.assign(document.createElement('div'),{className:'card',innerHTML:`<h2>Application received</h2><p>Thank you. Your confirmation number is <strong id="confirmation"></strong>.</p><p>Save this number for your records. Our hiring team will review your application.</p>`}));document.querySelector('#confirmation').textContent=result.id;window.scrollTo({top:0,behavior:'smooth'})}
  catch(error){problem(error.message||'Unable to submit. Your form remains here; please try again.');window.turnstile?.reset();submit.disabled=false}
});
form.querySelector('.submit').disabled=false;
status.textContent='';
try{configure()}catch(error){problem('Verification did not start. Please open this link in Safari or Chrome and try again.');console.error('Verification setup failed',error)}
