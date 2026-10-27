import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import '../setup/integration-hooks.js';

const app = createApp();

describe('GET /docs', () => {
  it('redirects /docs to /docs/', async () => {
    const response = await request(app).get('/docs');

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe('/docs/');
  });

  it('serves Swagger UI as HTML', async () => {
    const response = await request(app).get('/docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('swagger-ui');
  });

  it('serves Swagger UI assets without the API content security policy', async () => {
    const page = await request(app).get('/docs/');
    const stylesheet = await request(app).get('/docs/swagger-ui.css');
    const bundle = await request(app).get('/docs/swagger-ui-bundle.js');

    expect(page.headers['content-security-policy']).toBeUndefined();
    expect(stylesheet.status).toBe(200);
    expect(bundle.status).toBe(200);
  });

  it('serves a same-origin Swagger configuration that is never cached', async () => {
    const response = await request(app).get('/docs/swagger-ui-init.js');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toContain('no-store');
    expect(response.text).not.toContain('http://localhost:3000');
  });
});

describe('API security headers', () => {
  it('hides the framework header and applies Helmet', async () => {
    const response = await request(app).get('/contatos');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['content-security-policy']).toBeDefined();
  });
});
