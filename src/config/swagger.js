import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let swaggerSpec;

/**
 * Resolve $ref recursively
 */
function resolveRefs(obj, basePath, visited = new Set()) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveRefs(item, basePath, visited));
  }

  if (obj.$ref && typeof obj.$ref === 'string') {
    const ref = obj.$ref;

    if (visited.has(ref)) return obj;
    visited.add(ref);

    if (ref.startsWith('./') || ref.startsWith('../')) {
      const [filePath, anchor = ''] = ref.split('#');
      const fullPath = path.resolve(basePath, filePath);

      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const parsed = YAML.parse(fileContent);

      let resolved = parsed;

      if (anchor) {
        const parts = anchor.split('/').filter(Boolean);

        // This codebase's convention is the shorthand `file.yaml#/SchemaName`,
        // but schema files are full OpenAPI documents (`components.schemas.SchemaName`).
        // Jump into components.schemas first unless the anchor already spells that out.
        if (parts[0] !== 'components' && parsed?.components?.schemas) {
          resolved = parsed.components.schemas;
        }

        for (const part of parts) {
          resolved = resolved?.[part];
          if (!resolved) {
            return obj;
          }
        }
      }

      return resolveRefs(resolved, path.dirname(fullPath), new Set(visited));
    }

    return obj;
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = resolveRefs(value, basePath, new Set(visited));
  }

  return result;
}

/**
 * Load & merge schemas into components.schemas
 */
function loadSchemas(schemasDir) {
  const schemas = {};

  const files = fs.readdirSync(schemasDir).filter((f) => f.endsWith('.yaml'));

  for (const file of files) {
    const filePath = path.join(schemasDir, file);
    const content = YAML.parse(fs.readFileSync(filePath, 'utf8'));

    if (content?.components?.schemas) {
      Object.assign(schemas, content.components.schemas);
    }
  }

  return schemas;
}

const swaggerFile = path.join(__dirname, '../docs/swagger.yaml');
const schemasDir = path.join(__dirname, '../docs/schemas');

try {
  const rootYaml = YAML.parse(fs.readFileSync(swaggerFile, 'utf8'));

  // 🔥 merge schemas
  rootYaml.components ??= {};
  rootYaml.components.schemas = {
    ...(rootYaml.components.schemas || {}),
    ...loadSchemas(schemasDir),
  };

  swaggerSpec = resolveRefs(rootYaml, path.dirname(swaggerFile));
} catch (err) {
  throw err;
}

export { swaggerUi, swaggerSpec };
