import fs from 'fs';
import path from 'path';

const srcDir = './src';

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Invert white overlays to black overlays for structural visibility
      content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.0[2-5]?\)/g, 'rgba(0,0,0,0.03)');
      content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.1\)/g, 'rgba(0,0,0,0.06)');
      content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.2\)/g, 'rgba(0,0,0,0.08)');
      content = content.replace(/rgba\(255,\s*255,\s*255,\s*0\.3\)/g, 'rgba(0,0,0,0.12)');
      
      // Replace errant hardcoded #fff logic
      content = content.replace(/color:\s*'#fff'/g, "color: 'var(--text-inverse)'");
      content = content.replace(/color:\s*'#000'/g, "color: 'var(--text-primary)'");
      
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

walk(srcDir);
console.log('Fixed theme vars!');
