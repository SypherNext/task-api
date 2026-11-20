// Validate the generated document against the OpenAPI 3.1 schema and print a summary.
import { validate, compileErrors } from '@readme/openapi-parser';
import { buildOpenApiDocument } from '../src/openapi.js';

const document = buildOpenApiDocument();
const result = await validate(structuredClone(document));
if (!result.valid) {
  console.error(compileErrors(result));
  process.exit(1);
}
const operations = Object.values(document.paths).flatMap((item) => Object.keys(item)).length;
console.log(`OpenAPI ${document.openapi} document is valid: ${Object.keys(document.paths).length} paths, ${operations} operations, ${Object.keys(document.components.schemas).length} schemas`);
