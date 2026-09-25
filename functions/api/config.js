export function onRequestGet({env}){
  return Response.json({sitekey:env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET_KEY&&env.APPLICATIONS_BUCKET?env.TURNSTILE_SITE_KEY:null},{headers:{'Cache-Control':'no-store'}});
}
