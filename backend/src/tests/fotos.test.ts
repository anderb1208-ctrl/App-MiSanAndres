import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { crearApp, DIRECTORIO_FOTOS } from '../app';

const app = crearApp();

interface Credito {
  nombre: string;
  slug: string;
  archivo: string;
  autor: string;
  licencia: string;
  fuente: string;
}

const creditos = JSON.parse(
  readFileSync(resolve(__dirname, '../../scripts/imagenes/creditos.json'), 'utf8'),
) as Credito[];

describe('fotos de los destinos (archivos estáticos)', () => {
  test('sirve el JPEG con caché', async () => {
    const res = await request(app).get('/destinos/johnny-cay.jpg');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/jpeg');
    expect(res.headers['cache-control']).toContain('max-age=86400');
    expect(res.headers.etag).toBeDefined();
  });

  test('una foto que no existe responde 404 con el formato de error de la API', async () => {
    const res = await request(app).get('/destinos/no-existe.jpg');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ codigo: expect.any(String) });
  });

  test('no lista el directorio', async () => {
    expect((await request(app).get('/destinos/')).status).toBe(404);
  });

  test('cada crédito tiene su archivo, autor, licencia y fuente, y no sobran archivos', () => {
    const archivos = readdirSync(DIRECTORIO_FOTOS).sort();
    expect(creditos).toHaveLength(30);
    expect(creditos.map((c) => `${c.slug}.jpg`).sort()).toEqual(archivos);
    for (const c of creditos) {
      expect(c.archivo).toBe(`destinos/${c.slug}.jpg`);
      expect(c.autor).toBeTruthy();
      expect(c.licencia).toBeTruthy();
      expect(c.fuente).toMatch(/^https:\/\//);
    }
  });
});
