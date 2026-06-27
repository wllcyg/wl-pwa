const fs = require('fs');
const path = require('path');

const files = [
  'src/views/Record.vue',
  'src/views/Words.vue',
  'src/views/Profile.vue',
  'src/views/Layout.vue',
  'src/style.css'
];

const colorMap = {
  // Primary
  'rgba(0, 51, 160, 0.4)': 'rgba(var(--color-primary-rgb), 0.4)',
  'rgba(0, 51, 160, 0.2)': 'rgba(var(--color-primary-rgb), 0.2)',
  'rgba(0, 51, 160, 0.1)': 'rgba(var(--color-primary-rgb), 0.1)',
  'rgba(37, 99, 235, 0.1)': 'rgba(var(--color-primary-rgb), 0.1)',
  '#0033a0': 'var(--color-primary)',
  '#0033A0': 'var(--color-primary)',
  '#2563EB': 'var(--color-primary)',
  '#1D4ED8': 'var(--color-primary-hover)',

  // Backgrounds
  'rgba(247, 248, 249, 0.8)': 'var(--color-bg-elevated)',
  '#fcfcfc': 'var(--color-bg-page)',
  '#f7f8f9': 'var(--color-bg-page)',
  '#FAFAFA': 'var(--color-bg-page)',
  '#ffffff': 'var(--color-bg-surface)',
  '#fff': 'var(--color-bg-surface)',
  '#f0f2f5': 'var(--color-bg-surface-hover)',
  '#ECECEC': 'var(--color-bg-surface-hover)',

  // Texts
  '#111111': 'var(--color-text-title)',
  '#191c1d': 'var(--color-text-title)',
  '#1A1A1A': 'var(--color-text-title)',
  '#2C2A29': 'var(--color-text-main)',
  '#4A4A4A': 'var(--color-text-main)',
  '#666666': 'var(--color-text-muted)',
  '#666': 'var(--color-text-muted)',
  '#888C91': 'var(--color-text-muted)',
  '#9ca3af': 'var(--color-text-light)',
  '#a0a5aa': 'var(--color-text-light)',
  '#A0A5AA': 'var(--color-text-light)',
  
  // Borders
  '#eaeaea': 'var(--color-border)',

  // Success
  'rgba(16, 185, 129, 0.15)': 'rgba(var(--color-success-rgb), 0.15)',
  '#059669': 'var(--color-success)',

  // Warning
  'rgba(245, 158, 11, 0.15)': 'rgba(var(--color-warning-rgb), 0.15)',
  '#d97706': 'var(--color-warning)',

  // Danger
  'rgba(220, 38, 38, 0.9)': 'rgba(var(--color-danger-rgb), 0.9)',
  'rgba(239, 68, 68, 0.1)': 'rgba(var(--color-danger-rgb), 0.1)',
  '#ff4d4f': 'var(--color-danger)',
  '#dc2626': 'var(--color-danger)',
};

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Sort keys by length descending
    const keys = Object.keys(colorMap).sort((a, b) => b.length - a.length);
    
    keys.forEach(key => {
      // Escape all special chars
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // No word boundary, just simple regex
      const regex = new RegExp(escapedKey, 'gi');
      content = content.replace(regex, colorMap[key]);
    });
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
});
