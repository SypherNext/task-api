// The contract tests: the document is valid OpenAPI, and it lists exactly the
// routes the app really has (no missing route, no route that does not exist).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { validate, compileErrors } from '@readme/openapi-parser';
import { buildOpenApiDocument } from '../src/openapi.js';
import { apiRouters, INTERNAL_ROUTES } from '../src/app.js';
import { app } from './helpers.js';

// Every "METHOD /path" the routers define, written the OpenAPI way (/tasks/{id}).
function realRoutes() {
  const routes = [];
  for (const [base, handlers] of apiRouters({ pool: null, sessions: null, auth: (req, res, next) => next() })) {
    const router = Array.isArray(handlers) ? handlers.at(-1) : handlers;
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const path = (base + (layer.route.path === '/' ? '' : layer.route.path)).replace(/:(\w+)/g, '{$1}');
      for (const method of Object.keys(layer.route.methods)) routes.push(`${method.toUpperCase()} ${path}`);
    }
  }
  return routes.sort();
}

function documentedRoutes(document) {
  return Object.entries(document.paths)
    .flatMap(([path, item]) => Object.keys(item).map((method) => `${method.toUpperCase()} ${path}`))
    .sort();
}

test('the generated document is valid OpenAPI 3.1', async () => {
  const result = await validate(structuredClone(buildOpenApiDocument()));
  assert.ok(result.valid, compileErrors(result));
});

test('every route is documented and every documented route exists', () => {
  // actual = routes in the code, expected = routes in the document
  assert.deepEqual(realRoutes(), documentedRoutes(buildOpenApiDocument()));
});

test('internal routes stay out of the public document', () => {
  const documented = documentedRoutes(buildOpenApiDocument());
  for (const route of INTERNAL_ROUTES) assert.ok(!documented.includes(route), `${route} is documented`);
});

test('/openapi.json and /docs are served', async () => {
  const spec = await request(app).get('/openapi.json').expect(200).expect('Content-Type', /json/);
  assert.equal(spec.body.openapi, '3.1.1');
  const page = await request(app).get('/docs/').expect(200).expect('Content-Type', /html/);
  assert.match(page.text, /swagger-ui/);
});
