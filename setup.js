const { writeFileSync, readFileSync, mkdirSync, existsSync } = require('fs');
const { join } = require('path');

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2));
  console.log('WROTE', path);
}

// Root package.json
writeJson('/workspace/package.json', {
  name: 'multi-tenant-marketplace',
  private: true,
  version: '0.1.0',
  workspaces: ['apps/*', 'packages/*'],
  scripts: {
    dev: 'concurrently -n web,api -c blue,magenta npm
