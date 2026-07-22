import { readFileSync, writeFileSync } from 'node:fs';

function formatCss(source) {
  let output = '';
  let indent = 0;
  let quote = '';
  let comment = false;
  let parentheses = 0;

  function newline() {
    output = output.trimEnd();
    output += `\n${'  '.repeat(indent)}`;
  }

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (comment) {
      output += character;
      if (character === '*' && next === '/') {
        output += next;
        index += 1;
        comment = false;
        newline();
      }
      continue;
    }

    if (!quote && character === '/' && next === '*') {
      output += '/*';
      index += 1;
      comment = true;
      continue;
    }

    if (quote) {
      output += character;
      if (character === quote && source[index - 1] !== '\\') quote = '';
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      output += character;
      continue;
    }

    if (character === '(') parentheses += 1;
    if (character === ')') parentheses = Math.max(0, parentheses - 1);

    if (parentheses === 0 && character === '{') {
      output = output.trimEnd();
      output += ' {';
      indent += 1;
      newline();
      continue;
    }

    if (parentheses === 0 && character === '}') {
      indent = Math.max(0, indent - 1);
      output = output.trimEnd();
      output += `\n${'  '.repeat(indent)}}`;
      newline();
      continue;
    }

    if (parentheses === 0 && character === ';') {
      output = output.trimEnd();
      output += ';';
      newline();
      continue;
    }

    if (/\s/.test(character)) {
      if (!output.endsWith(' ') && !output.endsWith('\n')) output += ' ';
      continue;
    }

    output += character;
  }

  return `${output.trim()}\n`;
}

for (const relative of [
  '../src/style.css',
  '../src/settings-center.css',
  '../src/dima-suite.css',
  '../src/dima-connect.css',
  '../src/shell-experience.css',
  '../src/system-screens.css',
]) {
  const cssPath = new URL(relative, import.meta.url);
  writeFileSync(cssPath, formatCss(readFileSync(cssPath, 'utf8')), 'utf8');
}

for (const relative of [
  '../src/App.tsx',
  '../src/SystemApps.tsx',
  '../src/WindowsSuite.tsx',
  '../src/MediaPlayer.tsx',
  '../src/BrowserApp.tsx',
  '../src/SettingsCenter.tsx',
  '../src/DimaSuite.tsx',
  '../src/DimaConnect.tsx',
  '../src/ShellExperience.tsx',
  '../src/SystemScreens.tsx',
]) {
  const path = new URL(relative, import.meta.url);
  const source = readFileSync(path, 'utf8');
  const expanded = source.replace(/>\s*</g, '>\n<');
  writeFileSync(path, expanded, 'utf8');
}
