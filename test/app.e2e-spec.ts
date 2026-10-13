import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import request from 'supertest';

// Runs against a real PostgreSQL database that is wiped first.
// Default: postgres://agritrack:agritrack@localhost:5432/agritrack_test  (override with TEST_DATABASE_URL)
const DB = process.env.TEST_DATABASE_URL || 'postgres://agritrack:agritrack@localhost:5432/agritrack_test';

describe('AgriTrack API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const tokens: Record<string, string> = {};

  const login = async (email: string, password: string) =>
    (await request(app.getHttpServer()).post('/api/auth/login').send({ email, password })).body;
  const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

  beforeAll(async () => {
    const admin = new Client({ connectionString: DB.replace(/\/[^/]+$/, '/postgres') });
    await admin.connect();
    const name = DB.split('/').pop();
    if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount) await admin.query(`CREATE DATABASE "${name}"`);
    await admin.end();
    const db = new Client({ connectionString: DB });
    await db.connect();
    await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await db.end();

    process.env.DATABASE_URL = DB;
    process.env.NODE_ENV = 'test';
    process.env.LOGIN_RATE_LIMIT = '1000';
    const { AppModule } = await import('../src/app.module');
    const { configureApp } = await import('../src/app.setup');
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    http = request(app.getHttpServer()) as any;

    tokens.maria = (await login('farmer@agritrack.test', 'Farmer123!')).data.token;
    tokens.pedro = (await login('farmer2@agritrack.test', 'Farmer123!')).data.token;
    tokens.admin = (await login('admin@agritrack.test', 'Admin123!')).data.token;
  });
  afterAll(async () => app?.close());

  describe('auth', () => {
    it('login success returns token and user without password', async () => {
      const r = await login('farmer@agritrack.test', 'Farmer123!');
      expect(r.success).toBe(true);
      expect(r.data.user).toEqual({ id: expect.any(Number), full_name: 'Maria Santos', email: 'farmer@agritrack.test', role: 'farmer' });
      expect(JSON.stringify(r)).not.toMatch(/password/i);
    });
    it('login is case-insensitive on email', async () => {
      expect((await login('FARMER@agritrack.test', 'Farmer123!')).success).toBe(true);
    });
    it('wrong password and unknown email give the same 401', async () => {
      const a = await http.post('/api/auth/login').send({ email: 'farmer@agritrack.test', password: 'nope-nope' });
      const b = await http.post('/api/auth/login').send({ email: 'ghost@agritrack.test', password: 'nope-nope' });
      expect(a.status).toBe(401);
      expect(b.status).toBe(401);
      expect(a.body).toEqual({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' } });
      expect(b.body).toEqual(a.body);
    });
    it('login validation returns field details (422)', async () => {
      const r = await http.post('/api/auth/login').send({ email: 'not-an-email' });
      expect(r.status).toBe(422);
      expect(r.body.error.code).toBe('VALIDATION_ERROR');
      expect(r.body.error.details).toEqual({ email: 'Enter a valid email address.', password: 'Enter your password.' });
    });
    it('protected routes need a token (401), also for a bad token', async () => {
      expect((await http.get('/api/crops')).status).toBe(401);
      const r = await http.get('/api/crops').set('Authorization', 'Bearer garbage');
      expect(r.status).toBe(401);
      expect(r.body.error.code).toBe('UNAUTHORIZED');
    });
    it('GET /auth/me returns the signed-in user', async () => {
      const r = await http.get('/api/auth/me').set(as('admin'));
      expect(r.body.data).toMatchObject({ email: 'admin@agritrack.test', role: 'admin' });
    });
  });

  describe('crops', () => {
    it('farmer sees only own crops; admin sees all; envelope has meta.total', async () => {
      const m = await http.get('/api/crops').set(as('maria'));
      expect(m.body.meta.total).toBe(3);
      expect(m.body.data.every((c: any) => c.owner_name === 'Maria Santos')).toBe(true);
      expect(m.body.data[0]).toEqual({
        id: expect.any(Number), user_id: expect.any(Number), name: 'Sweet Corn', category: 'Grain',
        planted_on: '2026-07-15', field_location: 'North plot', owner_name: 'Maria Santos', created_at: expect.any(String),
      });
      expect((await http.get('/api/crops').set(as('pedro'))).body.meta.total).toBe(1);
      expect((await http.get('/api/crops').set(as('admin'))).body.meta.total).toBe(4);
    });
    it('create: success 201, owner comes from the token, not the body', async () => {
      const r = await http.post('/api/crops').set(as('maria')).send({ name: '  Okra ', category: 'Vegetable', planted_on: '2026-09-10', field_location: 'East plot' });
      expect(r.status).toBe(201);
      expect(r.body.data).toMatchObject({ name: 'Okra', owner_name: 'Maria Santos', field_location: 'East plot' });
    });
    it('create: optional field_location comes back as empty string', async () => {
      const r = await http.post('/api/crops').set(as('maria')).send({ name: 'Ginger', category: 'Root crop', planted_on: '2026-09-01' });
      expect(r.status).toBe(201);
      expect(r.body.data.field_location).toBe('');
    });
    it('create: validation errors name each field (422)', async () => {
      const r = await http.post('/api/crops').set(as('maria')).send({ name: 'A', category: 'Metal', planted_on: '2999-01-01' });
      expect(r.status).toBe(422);
      expect(r.body.error.details).toEqual({ name: 'Crop name must be at least 2 characters.', category: 'Choose a category.', planted_on: 'Planting date cannot be in the future.' });
      const empty = await http.post('/api/crops').set(as('maria')).send({});
      expect(Object.keys(empty.body.error.details).sort()).toEqual(['category', 'name', 'planted_on']);
      const badDate = await http.post('/api/crops').set(as('maria')).send({ name: 'Okra', category: 'Fruit', planted_on: '2026-02-31' });
      expect(badDate.body.error.details.planted_on).toBe('Enter the planting date.');
    });
    it('create: unknown or forbidden fields are refused (no mass assignment)', async () => {
      const r = await http.post('/api/crops').set(as('maria')).send({ name: 'Okra', category: 'Fruit', planted_on: '2026-09-01', user_id: 2 });
      expect(r.status).toBe(422);
      expect(r.body.error.details.user_id).toBe('This field is not allowed.');
    });
    it('admin is read-only: POST/PATCH/DELETE give 403', async () => {
      const body = { name: 'Okra', category: 'Fruit', planted_on: '2026-09-01' };
      expect((await http.post('/api/crops').set(as('admin')).send(body)).status).toBe(403);
      expect((await http.patch('/api/crops/1').set(as('admin')).send({ name: 'X1' })).status).toBe(403);
      const del = await http.delete('/api/crops/1').set(as('admin'));
      expect(del.status).toBe(403);
      expect(del.body.error).toEqual({ code: 'FORBIDDEN', message: 'Your role is not allowed to do this.' });
    });
    it('a farmer cannot read, edit or delete another farmer\'s crop (404)', async () => {
      expect((await http.get('/api/crops/4').set(as('maria'))).status).toBe(404);
      expect((await http.patch('/api/crops/4').set(as('maria')).send({ name: 'Hacked' })).status).toBe(404);
      expect((await http.delete('/api/crops/4').set(as('maria'))).status).toBe(404);
      expect((await http.get('/api/crops/4').set(as('admin'))).status).toBe(200);
    });
    it('update: partial edit works and re-checks the date rules', async () => {
      const ok = await http.patch('/api/crops/2').set(as('maria')).send({ field_location: 'Near the well' });
      expect(ok.status).toBe(200);
      expect(ok.body.data.field_location).toBe('Near the well');
      expect(ok.body.data.name).toBe('Eggplant');
      const late = await http.patch('/api/crops/2').set(as('maria')).send({ planted_on: '2026-10-08' }); // eggplant harvested 2026-10-02
      expect(late.status).toBe(422);
      expect(late.body.error.details.planted_on).toMatch(/after a harvest/);
    });
    it('delete: blocked while it has harvests (409), works when empty (204)', async () => {
      const blocked = await http.delete('/api/crops/1').set(as('maria'));
      expect(blocked.status).toBe(409);
      expect(blocked.body.error.code).toBe('CONFLICT');
      const created = await http.post('/api/crops').set(as('maria')).send({ name: 'Temp crop', category: 'Fruit', planted_on: '2026-09-01' });
      const del = await http.delete(`/api/crops/${created.body.data.id}`).set(as('maria'));
      expect(del.status).toBe(204);
      expect(del.text).toBe('');
      expect((await http.get(`/api/crops/${created.body.data.id}`).set(as('maria'))).status).toBe(404);
    });
    it('bad id is rejected, not a 500', async () => {
      expect((await http.get('/api/crops/abc').set(as('maria'))).status).toBe(400);
      expect((await http.get('/api/crops/99999').set(as('maria'))).status).toBe(404);
    });
  });

  describe('harvests', () => {
    it('lists newest first, with crop_name and owner_name, scoped by role', async () => {
      const m = await http.get('/api/harvests').set(as('maria'));
      expect(m.body.meta.total).toBe(4);
      const dates = m.body.data.map((h: any) => h.harvest_date);
      expect(dates).toEqual([...dates].sort().reverse());
      expect(m.body.data[0]).toMatchObject({ crop_name: expect.any(String), owner_name: 'Maria Santos', quantity_kg: expect.any(Number) });
      expect((await http.get('/api/harvests').set(as('admin'))).body.meta.total).toBe(5);
    });
    it('filters by crop_id', async () => {
      const r = await http.get('/api/harvests?crop_id=1').set(as('maria'));
      expect(r.body.data.map((h: any) => h.crop_name)).toEqual(['Sweet Corn', 'Sweet Corn']);
    });
    it('create: success 201 with decimals kept as numbers', async () => {
      const r = await http.post('/api/harvests').set(as('maria')).send({ crop_id: 1, harvest_date: '2026-10-10', quantity_kg: '150.5', notes: 'Third picking' });
      expect(r.status).toBe(201);
      expect(r.body.data).toMatchObject({ crop_id: 1, crop_name: 'Sweet Corn', quantity_kg: 150.5, notes: 'Third picking', owner_name: 'Maria Santos' });
    });
    it('create: validation (quantity, crop, dates)', async () => {
      const r = await http.post('/api/harvests').set(as('maria')).send({ quantity_kg: -3 });
      expect(r.status).toBe(422);
      expect(r.body.error.details).toEqual({ crop_id: 'Choose one of your crops.', harvest_date: 'Enter the harvest date.', quantity_kg: 'Quantity must be greater than 0 kg.' });
      const other = await http.post('/api/harvests').set(as('maria')).send({ crop_id: 4, harvest_date: '2026-10-10', quantity_kg: 5 });
      expect(other.body.error.details.crop_id).toBe('Choose one of your crops.');
      const future = await http.post('/api/harvests').set(as('maria')).send({ crop_id: 1, harvest_date: '2999-01-01', quantity_kg: 5 });
      expect(future.body.error.details.harvest_date).toBe('Harvest date cannot be in the future.');
      const before = await http.post('/api/harvests').set(as('maria')).send({ crop_id: 1, harvest_date: '2026-07-01', quantity_kg: 5 });
      expect(before.body.error.details.harvest_date).toBe('Harvest date cannot be before the planting date.');
      const zero = await http.post('/api/harvests').set(as('maria')).send({ crop_id: 1, harvest_date: '2026-10-10', quantity_kg: 0 });
      expect(zero.body.error.details.quantity_kg).toBe('Quantity must be greater than 0 kg.');
    });
    it('admin is read-only; farmers cannot touch each other\'s harvests', async () => {
      expect((await http.post('/api/harvests').set(as('admin')).send({ crop_id: 1, harvest_date: '2026-10-10', quantity_kg: 5 })).status).toBe(403);
      expect((await http.get('/api/harvests/5').set(as('maria'))).status).toBe(404); // Pedro's rice
      expect((await http.patch('/api/harvests/5').set(as('maria')).send({ quantity_kg: 1 })).status).toBe(404);
      expect((await http.delete('/api/harvests/5').set(as('maria'))).status).toBe(404);
    });
    it('update and delete own harvest', async () => {
      const created = await http.post('/api/harvests').set(as('maria')).send({ crop_id: 2, harvest_date: '2026-10-11', quantity_kg: 10 });
      const id = created.body.data.id;
      const upd = await http.patch(`/api/harvests/${id}`).set(as('maria')).send({ quantity_kg: 12.25, notes: 'Weighed again' });
      expect(upd.status).toBe(200);
      expect(upd.body.data).toMatchObject({ quantity_kg: 12.25, notes: 'Weighed again', crop_name: 'Eggplant' });
      const move = await http.patch(`/api/harvests/${id}`).set(as('maria')).send({ crop_id: 4 });
      expect(move.status).toBe(422);
      expect((await http.delete(`/api/harvests/${id}`).set(as('maria'))).status).toBe(204);
      expect((await http.get(`/api/harvests/${id}`).set(as('maria'))).status).toBe(404);
    });
  });

  describe('users (admin)', () => {
    it('farmers cannot use /users (403)', async () => {
      expect((await http.get('/api/users').set(as('maria'))).status).toBe(403);
    });
    it('admin lists accounts without password data', async () => {
      const r = await http.get('/api/users').set(as('admin'));
      expect(r.body.meta.total).toBe(3);
      expect(JSON.stringify(r.body)).not.toMatch(/password/i);
    });
    it('admin creates a farmer who can then sign in; duplicate email is 409', async () => {
      const body = { full_name: 'Ana Reyes', email: 'Ana@AgriTrack.test', password: 'Sunflower9!', role: 'farmer' };
      const r = await http.post('/api/users').set(as('admin')).send(body);
      expect(r.status).toBe(201);
      expect(r.body.data.email).toBe('ana@agritrack.test');
      expect((await login('ana@agritrack.test', 'Sunflower9!')).success).toBe(true);
      const dup = await http.post('/api/users').set(as('admin')).send(body);
      expect(dup.status).toBe(409);
      expect(dup.body.error.details.email).toBeDefined();
    });
    it('user validation: short password, bad role', async () => {
      const r = await http.post('/api/users').set(as('admin')).send({ full_name: 'X', email: 'x@y.test', password: '123', role: 'boss' });
      expect(r.status).toBe(422);
      expect(r.body.error.details).toEqual({ password: 'Password must be 8 to 72 characters.', role: 'Role must be farmer or admin.' });
    });
    it('update password works; cannot delete self or a user who owns crops; can delete an empty user', async () => {
      const list = (await http.get('/api/users').set(as('admin'))).body.data;
      const ana = list.find((u: any) => u.email === 'ana@agritrack.test');
      expect((await http.patch(`/api/users/${ana.id}`).set(as('admin')).send({ password: 'NewSecret99!' })).status).toBe(200);
      expect((await login('ana@agritrack.test', 'NewSecret99!')).success).toBe(true);
      const admin = list.find((u: any) => u.role === 'admin');
      expect((await http.delete(`/api/users/${admin.id}`).set(as('admin'))).status).toBe(409);
      const maria = list.find((u: any) => u.email === 'farmer@agritrack.test');
      expect((await http.delete(`/api/users/${maria.id}`).set(as('admin'))).status).toBe(409);
      expect((await http.delete(`/api/users/${ana.id}`).set(as('admin'))).status).toBe(204);
    });
    it('a deleted user\'s old token stops working', async () => {
      const t = (await http.post('/api/users').set(as('admin')).send({ full_name: 'Temp', email: 'temp@agritrack.test', password: 'Temporary1!', role: 'farmer' })).body.data;
      const token = (await login('temp@agritrack.test', 'Temporary1!')).data.token;
      await http.delete(`/api/users/${t.id}`).set(as('admin'));
      expect((await http.get('/api/crops').set({ Authorization: `Bearer ${token}` })).status).toBe(401);
    });
  });

  describe('errors and security', () => {
    it('unknown route and invalid JSON use the error envelope', async () => {
      const nf = await http.get('/api/nothing').set(as('maria'));
      expect(nf.status).toBe(404);
      expect(nf.body.success).toBe(false);
      const bad = await http.post('/api/auth/login').set('Content-Type', 'application/json').send('{oops');
      expect(bad.status).toBe(400);
      expect(bad.body.error.code).toBe('BAD_REQUEST');
    });
    it('passwords are stored hashed', async () => {
      const db = new Client({ connectionString: DB });
      await db.connect();
      const { rows } = await db.query("SELECT password_hash FROM users WHERE email='farmer@agritrack.test'");
      await db.end();
      expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
      expect(rows[0].password_hash).not.toContain('Farmer123');
    });
    it('database enforces the rules too (CHECK and FK)', async () => {
      const db = new Client({ connectionString: DB });
      await db.connect();
      await expect(db.query("INSERT INTO harvests (crop_id, harvest_date, quantity_kg) VALUES (1, '2026-10-01', 0)")).rejects.toThrow(/check/i);
      await expect(db.query("INSERT INTO harvests (crop_id, harvest_date, quantity_kg) VALUES (9999, '2026-10-01', 5)")).rejects.toThrow(/foreign key/i);
      await db.end();
    });
    it('sends security headers and CORS for the frontend origin', async () => {
      const r = await http.get('/api/crops').set('Origin', 'http://localhost:3000');
      expect(r.headers['x-content-type-options']).toBe('nosniff');
      expect(r.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      const other = await http.get('/api/crops').set('Origin', 'http://evil.example');
      expect(other.headers['access-control-allow-origin']).toBeUndefined();
    });
    it('login is rate limited (429), last test so it cannot affect others', async () => {
      process.env.LOGIN_RATE_LIMIT = '3';
      const codes: number[] = [];
      for (let i = 0; i < 5; i++) codes.push((await http.post('/api/auth/login').send({ email: 'x@y.test', password: 'wrong-pass' })).status);
      process.env.LOGIN_RATE_LIMIT = '1000';
      expect(codes).toContain(429);
    });
  });
});
