const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.vue') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;
  
  // Replace old variable names with new ones
  content = content.replace(/var\(--color-bg\)/g, 'var(--color-bg-page)');
  content = content.replace(/var\(--color-surface\)/g, 'var(--color-bg-surface)');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log(`Fixed vars in ${file}`);
  }
});
