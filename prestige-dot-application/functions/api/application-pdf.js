import { PDFDocument, StandardFonts, rgb } from './pdf-lite.js';

// Render the submitted application for delivery to the authorized hiring team.
export async function createApplicationPdf(record) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.12, 0.21, 0.36);
  let page;
  let y = 0;
  const clean = value => [...String(value ?? '')].map(char => {
    try { regular.encodeText(char); return char; }
    catch { return [...char.normalize('NFKD')].filter(c => { try { regular.encodeText(c); return true; } catch { return false; } }).join('') || '?'; }
  }).join('').replace(/[\r\n\t]+/g, ' ');
  const newPage = () => {
    page = pdf.addPage([612, 792]);
    y = 755;
    page.drawText('PRESTIGE | DOT DRIVER EMPLOYMENT APPLICATION', { x: 44, y, size: 11, font: bold, color: navy });
    y -= 17;
    page.drawLine({ start: { x: 44, y }, end: { x: 568, y }, thickness: 1, color: navy });
    y -= 24;
  };
  const line = (text, font = regular, size = 10) => {
    const words = clean(text).split(/\s+/);
    let current = '';
    const flush = () => { if (y < 53) newPage(); page.drawText(current, { x: 44, y, size, font, color: navy }); y -= 15; current = ''; };
    for (let word of words) {
      while (font.widthOfTextAtSize(word, size) > 524) {
        let index = 1;
        while (index < word.length && font.widthOfTextAtSize(word.slice(0, index + 1), size) <= 524) index++;
        if (current) flush();
        current = word.slice(0, index); flush(); word = word.slice(index);
      }
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > 524 && current) flush();
      current = current ? `${current} ${word}` : word;
    }
    if (current) flush();
  };
  const section = name => { if (y < 95) newPage(); y -= 8; line(name, bold, 12); y -= 3; };
  const field = (label, value) => line(`${label}: ${value === '' || value == null ? 'Not provided' : value}`);
  const fields = (object, labels) => { for (const [key, label] of Object.entries(labels)) field(label, object?.[key]); };
  const list = (title, entries, labels) => {
    section(title);
    if (!entries?.length) { line('None reported'); return; }
    entries.forEach((item, i) => { line(`${i + 1}.`, bold); fields(item, labels); y -= 5; });
  };
  const address = { street: 'Street', city: 'City', state: 'State', zip: 'ZIP', from: 'From', to: 'To' };
  const a = record.application;
  newPage();
  field('Confirmation number', record.id);
  field('Submitted (UTC)', record.submittedAt);
  field('Carrier', record.carrier.name);
  field('Carrier address', record.carrier.address);
  section('Applicant');
  fields(a.applicant, { fullName: 'Full legal name', dateOfBirth: 'Date of birth', phone: 'Phone', email: 'Email' });
  section('Current address'); fields(a.address, address);
  list('Previous addresses', a.previousAddresses, address);
  list('Licenses', a.licenses, { authority: 'Issuing authority', number: 'License number', class: 'Class', expiration: 'Expiration' });
  section('Medical and CDL'); field('Medical certificate expiration', a.medicalExpiration); field('CDL applicant', a.cdlApplicant);
  list('Driving experience', a.experience, { equipment: 'Equipment', details: 'Details', years: 'Years' });
  section('Accidents'); field('No accidents reported', a.noAccidents ? 'Yes' : 'No');
  a.accidents.forEach((item, i) => { line(`${i + 1}.`, bold); fields(item, { date: 'Date', nature: 'Nature', fatalities: 'Fatalities', injuries: 'Injuries', details: 'Details' }); y -= 5; });
  section('Traffic violations'); field('No violations reported', a.noViolations ? 'Yes' : 'No');
  a.violations.forEach((item, i) => { line(`${i + 1}.`, bold); fields(item, { date: 'Date', violation: 'Violation', location: 'Location' }); y -= 5; });
  section('License history'); field('License denied, suspended, or revoked', a.licenseAction); field('Explanation', a.licenseExplanation);
  list('Employers (last three years)', a.employers, { name: 'Employer', address: 'Address', from: 'From', to: 'To', reason: 'Reason for leaving', fmcsa: 'FMCSA regulated', safetySensitive: 'Safety sensitive work' });
  section('Earlier CDL work'); field('No earlier work reported', a.noOlderWork ? 'Yes' : 'No');
  a.olderEmployers.forEach((item, i) => { line(`${i + 1}.`, bold); fields(item, { name: 'Employer', address: 'Address', from: 'From', to: 'To', reason: 'Reason for leaving' }); y -= 5; });
  section('Certification'); field('Certification accepted', a.certification.accepted ? 'Yes' : 'No');
  field('Typed signature', a.certification.signature); field('Signature date', a.certification.date);
  const pages = pdf.getPages();
  pages.forEach((p, i) => p.drawText(`Application ${record.id}  |  Page ${i + 1} of ${pages.length}`, { x: 44, y: 30, size: 8, font: regular, color: navy }));
  return pdf.save();
}
