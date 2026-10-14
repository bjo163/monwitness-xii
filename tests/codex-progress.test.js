import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../app/page.jsx',import.meta.url),'utf8');
const helper=source.match(/function readProgress\(raw\)\{[\s\S]*?return null\}\}/)?.[0];
if(!helper) throw new Error('Could not locate the Codex progress parser');
const readProgress=vm.runInNewContext(`(()=>{${helper};return readProgress})()`);

test('restores a valid saved level, checklist, and cleared levels',()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(readProgress(JSON.stringify({selected:3,checks:[true,false,true,true],cleared:[1,2]})))),{selected:3,checks:[true,false,true,true],cleared:[1,2]});
});

test('falls back safely when saved progress is malformed or out of range',()=>{
  assert.equal(readProgress('{bad json'),null);
  assert.deepEqual(JSON.parse(JSON.stringify(readProgress(JSON.stringify({selected:900,checks:[1,2],cleared:[0,40,'3',3,3]})))),{selected:1,checks:[true,true,false,false],cleared:[3]});
});
