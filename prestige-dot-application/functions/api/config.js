export function onRequestGet({env}){
  const configured=env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET_KEY&&env.RESEND_API_KEY&&env.APPLICATION_EMAIL_TO&&env.APPLICATION_EMAIL_FROM;
  return Response.json({sitekey:configured?env.TURNSTILE_SITE_KEY:null},{headers:{'Cache-Control':'no-store'}});
}
