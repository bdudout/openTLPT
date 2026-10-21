// Rendu d'un Deck en PowerPoint (.pptx), entièrement dans le navigateur (PptxGenJS, MIT) : aucun réseau.
import PptxGenJS from 'pptxgenjs';
import type { Block, Deck, Tone } from './deck.ts';

const W = 13.333;           // LAYOUT_WIDE (16:9), en pouces
const M = 0.45;             // marge
const CONTENT_W = W - 2 * M;
const C = { accent: '1F4E8C', oblig: '7A0019', text: '1B1F24', muted: '5A6370', border: 'D9DEE5', head: 'EEF1F5' };
const FILL: Record<Exclude<Tone, undefined>, string> = { ok: 'E7F4EC', warn: 'FFF4DC', bad: 'FDE8EC', info: 'EEF1F5' };
const LINE: Record<Exclude<Tone, undefined>, string> = { ok: '17663A', warn: '8A5300', bad: 'A3122A', info: '1F4E8C' };

function kpis(slide: PptxGenJS.Slide, b: Extract<Block, { kind: 'kpis' }>, y: number): number {
  const perRow = 4;
  const gap = 0.15;
  const w = (CONTENT_W - gap * (perRow - 1)) / perRow;
  const h = 1.15;
  b.items.forEach((k, i) => {
    const x = M + (i % perRow) * (w + gap);
    const yy = y + Math.floor(i / perRow) * (h + gap);
    slide.addShape('roundRect', { x, y: yy, w, h, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: k.tone ? LINE[k.tone] : C.accent, width: 1.25 } });
    slide.addText(k.label.toUpperCase(), { x: x + 0.12, y: yy + 0.06, w: w - 0.24, h: 0.28, fontSize: 9, bold: true, color: C.muted });
    slide.addText(k.value, { x: x + 0.12, y: yy + 0.32, w: w - 0.24, h: 0.45, fontSize: 20, bold: true, color: k.tone ? LINE[k.tone] : C.text });
    if (k.sub) slide.addText(k.sub, { x: x + 0.12, y: yy + 0.76, w: w - 0.24, h: 0.34, fontSize: 8.5, color: C.muted, valign: 'top' });
  });
  return y + Math.ceil(b.items.length / perRow) * (h + gap) + 0.1;
}

function bullets(slide: PptxGenJS.Slide, b: Extract<Block, { kind: 'bullets' }>, y: number): number {
  let yy = y;
  if (b.title) {
    slide.addText(b.title, { x: M, y: yy, w: CONTENT_W, h: 0.36, fontSize: 14, bold: true, color: C.accent });
    yy += 0.4;
  }
  const items = b.items.length ? b.items : [b.empty ?? '—'];
  const h = Math.min(0.34 * items.length + 0.1, 7.0 - yy);
  slide.addText(items.map((text) => ({ text, options: { bullet: b.items.length > 0, breakLine: true } })),
    { x: M, y: yy, w: CONTENT_W, h, fontSize: 12, color: b.items.length ? C.text : C.muted, valign: 'top', paraSpaceAfter: 3 });
  return yy + h + 0.15;
}

function table(slide: PptxGenJS.Slide, b: Extract<Block, { kind: 'table' }>, y: number): number {
  if (!b.rows.length) return bullets(slide, { kind: 'bullets', items: [], empty: b.empty || '—' }, y);
  const scale = CONTENT_W / b.widths.reduce((a, x) => a + x, 0);
  const head = b.head.map((text) => ({ text, options: { bold: true, color: C.muted, fill: { color: C.head }, fontSize: 9.5 } }));
  const rows = b.rows.map((r, i) => {
    const tone = b.tones?.[i];
    return r.map((text, j) => ({ text, options: { fontSize: 9.5, color: C.text, ...(tone ? { fill: { color: FILL[tone] } } : {}), ...(j === 0 ? { bold: true } : {}) } }));
  });
  slide.addTable([head, ...rows] as PptxGenJS.TableRow[], {
    x: M, y, w: CONTENT_W, colW: b.widths.map((x) => x * scale),
    border: { type: 'solid', pt: 0.5, color: C.border }, valign: 'top', margin: 0.05,
    autoPage: true, autoPageRepeatHeader: true, autoPageHeaderRows: 1, newSlideStartY: 1.05,
  });
  return 7.0;
}

export async function deckToPptx(deck: Deck, author: string): Promise<{ blob: Blob; slides: number }> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = deck.title;
  pptx.subject = deck.footer;
  pptx.author = author;
  pptx.company = '';
  pptx.defineSlideMaster({
    title: 'OPENTLPT',
    background: { color: 'FFFFFF' },
    objects: [
      { rect: { x: 0, y: 0, w: W, h: 0.09, fill: { color: C.accent } } },
      { text: { text: deck.footer, options: { x: M, y: 7.08, w: W - 2 * M - 0.8, h: 0.3, fontSize: 8.5, color: C.oblig, bold: true } } },
    ],
    slideNumber: { x: W - M - 0.6, y: 7.08, w: 0.6, h: 0.3, fontSize: 8.5, color: C.muted, align: 'right' },
  });

  const cover = pptx.addSlide({ masterName: 'OPENTLPT' });
  cover.addShape('rect', { x: 0, y: 2.2, w: W, h: 2.6, fill: { color: C.accent } });
  cover.addText(deck.title, { x: M, y: 2.45, w: CONTENT_W, h: 1.2, fontSize: 32, bold: true, color: 'FFFFFF' });
  cover.addText(deck.subtitle, { x: M, y: 3.7, w: CONTENT_W, h: 0.6, fontSize: 16, color: 'FFFFFF' });
  cover.addText('openTLPT', { x: M, y: 5.3, w: CONTENT_W, h: 0.4, fontSize: 12, color: C.muted });

  for (const s of deck.slides) {
    const slide = pptx.addSlide({ masterName: 'OPENTLPT' });
    slide.addText(s.title, { x: M, y: 0.28, w: CONTENT_W, h: 0.6, fontSize: 22, bold: true, color: C.text });
    let y = 1.05;
    for (const b of s.blocks) {
      if (y > 6.8) break;
      y = b.kind === 'kpis' ? kpis(slide, b, y) : b.kind === 'bullets' ? bullets(slide, b, y) : table(slide, b, y);
    }
  }
  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  return { blob, slides: (pptx as unknown as { slides?: unknown[] }).slides?.length ?? deck.slides.length + 1 };
}
