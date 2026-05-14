// ── Markdown → HTML ───────────────────────────────────────────────────

function mdToHtml(md) {
  const lines = md.split('\n');
  const html = [];
  let inCodeBlock = false;
  let codeLines = [];
  let inList = null;

  function closeList() {
    if (inList) {
      html.push(`</${inList}>`);
      inList = null;
    }
  }

  function esc(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inlineFormat(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inCodeBlock) {
      if (line.trim().startsWith('```')) {
        html.push(`<pre><code>${esc(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (line.trim().startsWith('```')) {
      closeList();
      inCodeBlock = true;
      codeLines = [];
      continue;
    }

    if (line.trim() === '') {
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeList();
      html.push('<hr>');
      continue;
    }

    if (line.trim().startsWith('> ')) {
      closeList();
      html.push(`<blockquote><p>${inlineFormat(line.trim().slice(2))}</p></blockquote>`);
      continue;
    }

    const ulMatch = line.match(/^(\s*)[*\-+]\s+(.*)/);
    if (ulMatch) {
      if (inList !== 'ul') {
        closeList();
        inList = 'ul';
        html.push('<ul>');
      }
      html.push(`<li>${inlineFormat(ulMatch[2])}</li>`);
      continue;
    }

    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)/);
    if (olMatch) {
      if (inList !== 'ol') {
        closeList();
        inList = 'ol';
        html.push('<ol>');
      }
      html.push(`<li>${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inCodeBlock && codeLines.length) {
    html.push(`<pre><code>${esc(codeLines.join('\n'))}</code></pre>`);
  }
  closeList();

  return html.join('\n');
}

// ── Public parsers — return { title, html } ───────────────────────────

function extractTitle(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  return lines[0]?.replace(/^#{1,3}\s+/, '').slice(0, 120) || 'Untitled';
}

function getTextPreview(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent?.trim().slice(0, 100) || '';
}

export function parsePlainText(text) {
  const title = extractTitle(text);
  const paragraphs = text.trim().split(/\n{2,}/).map((p) =>
    `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`
  ).join('');
  return { title, html: paragraphs, preview: text.trim().slice(0, 100) };
}

export function parseMarkdown(text) {
  let title = 'Untitled';
  const firstHeading = text.split('\n').find((l) => /^#{1,3}\s/.test(l.trim()));
  if (firstHeading) {
    title = firstHeading.replace(/^#{1,3}\s+/, '').trim().slice(0, 120);
  } else {
    title = extractTitle(text);
  }
  const html = mdToHtml(text);
  return { title, html, preview: getTextPreview(html).slice(0, 100) };
}

export function parseHTML(rawHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const titleEl = doc.querySelector('title') || doc.querySelector('h1');
  const title = titleEl?.textContent?.trim()?.slice(0, 120) || 'Untitled';
  const html = doc.body.innerHTML || '';
  return { title, html, preview: doc.body.textContent?.trim().slice(0, 100) || '' };
}

export function parseFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      const name = file.name.toLowerCase();
      if (name.endsWith('.html') || name.endsWith('.htm')) {
        resolve(parseHTML(text));
      } else if (name.endsWith('.md') || name.endsWith('.markdown')) {
        resolve(parseMarkdown(text));
      } else {
        resolve(parsePlainText(text));
      }
    };
    reader.onerror = () => resolve({ title: file.name, html: '', preview: '' });
    reader.readAsText(file);
  });
}

export async function parseFiles(fileList) {
  const results = [];
  for (const file of fileList) {
    const parsed = await parseFile(file);
    results.push(parsed);
  }
  return results;
}
