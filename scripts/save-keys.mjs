import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { configure, envvars } from '@trigger.dev/sdk/v3';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function validateKeys(values) {
  if (!Object.keys(values).length) throw Error('No keys supplied');
  for (const [name, value] of Object.entries(values)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(name) || typeof value !== 'string' || !value.trim() || /\[SENSITIVE\]|YOUR[_ -]|XXXX|PLACEHOLDER/i.test(value)) throw Error(`Invalid or placeholder value: ${name}`);
  }
  return values;
}
export function saveLocal(file, values) {
  validateKeys(values);
  if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw Error('Refusing symlink destination');
  const old = fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
  const body = Object.entries({ ...old, ...values }).map(([k,v]) => `${k}=${JSON.stringify(v)}`).join('\n')+'\n';
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, body, { mode: 0o600 });
  fs.renameSync(temp, file); fs.chmodSync(file, 0o600);
}
export async function syncMissing(values, api) {
  const existing = new Map((await api.list()).map(row => [row.name, row.value]));
  const statuses = [];
  for (const [name,value] of Object.entries(values)) {
    if (existing.has(name)) {
      statuses.push({ name, status: existing.get(name) === value ? 'verified-existing' : 'conflict-not-overwritten' });
      continue;
    }
    await api.create({ name, value });
    const saved = await api.retrieve(name);
    if (saved.value !== value) throw Error(`Remote verification failed: ${name}`);
    statuses.push({ name, status: 'created-and-verified' });
  }
  return statuses;
}
async function main() {
  const args = process.argv.slice(2);
  const pos = args.indexOf('--file');
  const input = pos >= 0 ? fs.readFileSync(args[pos+1], 'utf8') : fs.readFileSync(0, 'utf8');
  const values = validateKeys(dotenv.parse(input));
  const file = path.join(root, '.env.keys.local');
  saveLocal(file, values);
  console.log(JSON.stringify({ local: '.env.keys.local', saved: Object.keys(values) }));
  if (!args.includes('--sync-trigger')) return;
  const local = {};
  for (const f of ['.env','.env.local','.env.keys.local']) if (fs.existsSync(path.join(root,f))) Object.assign(local, dotenv.parse(fs.readFileSync(path.join(root,f))));
  const token = process.env.TRIGGER_SECRET_KEY || local.TRIGGER_SECRET_KEY;
  if (!token || token === '[SENSITIVE]') throw Error('Working TRIGGER_SECRET_KEY required; keys saved locally');
  configure({ accessToken: token });
  const project = 'proj_xqiwghrbsmrggjmorcyh', env = 'prod';
  const statuses = await syncMissing(values, {
    list: () => envvars.list(project,env),
    create: data => envvars.create(project,env,data),
    retrieve: name => envvars.retrieve(project,env,name),
  });
  console.log(JSON.stringify({ trigger: statuses }));
  if (statuses.some(s=>s.status==='conflict-not-overwritten')) process.exitCode=2;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => {
  console.error('Key operation failed. Secret values suppressed; local file may already be saved. Check access and input.'); process.exitCode=1;
});
