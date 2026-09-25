// Minimal PDF writer for standard Helvetica fonts. No build-time dependencies.
export const StandardFonts = { Helvetica: 'Helvetica', HelveticaBold: 'Helvetica-Bold' };
export const rgb = (red, green, blue) => [red, green, blue];

class Font {
  constructor(name) { this.name = name; }
  encodeText(text) {
    if (/[^\x20-\x7e]/.test(text)) throw Error('Unsupported font glyph');
    return text;
  }
  widthOfTextAtSize(text, size) { return text.length * size * 0.62; }
}

class Page {
  constructor() { this.operations = []; }
  drawText(text, { x, y, size, font, color }) {
    const safe = String(text).replace(/[\\()]/g, '\\$&');
    const [r, g, b] = color;
    const face = font.name === StandardFonts.HelveticaBold ? 'F2' : 'F1';
    this.operations.push(`${r} ${g} ${b} rg BT /${face} ${size} Tf ${x} ${y} Td (${safe}) Tj ET`);
  }
  drawLine({ start, end, thickness, color }) {
    const [r, g, b] = color;
    this.operations.push(`${r} ${g} ${b} RG ${thickness} w ${start.x} ${start.y} m ${end.x} ${end.y} l S`);
  }
}

export class PDFDocument {
  constructor() { this.pages = []; }
  static async create() { return new PDFDocument(); }
  async embedFont(name) { return new Font(name); }
  addPage() { const page = new Page(); this.pages.push(page); return page; }
  getPages() { return this.pages; }
  async save() {
    const objects = [];
    const add = value => { objects.push(value); return objects.length; };
    const catalog = add('');
    const pageTree = add('');
    const regular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const bold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    const refs = this.pages.map(page => {
      const stream = page.operations.join('\n') + '\n';
      const content = add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
      return add(`<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${content} 0 R >>`);
    });
    objects[catalog - 1] = `<< /Type /Catalog /Pages ${pageTree} 0 R >>`;
    objects[pageTree - 1] = `<< /Type /Pages /Kids [${refs.map(ref => `${ref} 0 R`).join(' ')}] /Count ${refs.length} >>`;
    let output = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(output.length);
      output += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = output.length;
    output += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => { output += `${String(offset).padStart(10, '0')} 00000 n \n`; });
    output += `trailer\n<< /Size ${offsets.length} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new TextEncoder().encode(output);
  }
}
