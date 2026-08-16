import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const outDir = join(tmpdir(), "marktx-json-ld-security-test");
const tscBin = join(process.cwd(), "node_modules", "typescript", "bin", "tsc");

rmSync(outDir, { force: true, recursive: true });
mkdirSync(outDir, { recursive: true });

execFileSync(
  process.execPath,
  [
    tscBin,
    "src/lib/json-ld-serializer.ts",
    "--outDir",
    outDir,
    "--module",
    "es2022",
    "--target",
    "es2022",
    "--skipLibCheck",
    "--esModuleInterop",
  ],
  { stdio: "inherit" },
);

const { serializeJsonLd } = await import(
  pathToFileURL(join(outDir, "json-ld-serializer.js")).href
);

// Test 1: Basic JSON serialization
const basicData = { "@type": "Product", name: "Test Item" };
const basicSerialized = serializeJsonLd(basicData);
assert.equal(
  typeof basicSerialized,
  "string",
  "serializeJsonLd returns a string"
);
assert.ok(
  JSON.parse(basicSerialized),
  "Serialized output is valid JSON"
);

// Test 2: Verify < is escaped as \u003c
const attackPayload = {
  "@type": "Product",
  name: "Test",
  description: "</script><script>alert(1)</script>",
};
const attackSerialized = serializeJsonLd(attackPayload);

// Verify the dangerous sequence </script> is escaped
assert.ok(
  !attackSerialized.includes("</script>"),
  "Dangerous </script> sequence is escaped in output"
);

// Verify \u003c appears in serialized output (Unicode escape for <)
assert.ok(
  attackSerialized.includes("\\u003c"),
  "< character is escaped as \\u003c in output"
);

// Test 3: Verify escaped JSON is still valid JSON when parsed
const parsedAttack = JSON.parse(attackSerialized);
assert.equal(
  parsedAttack.description,
  "</script><script>alert(1)</script>",
  "Deserialized JSON preserves original payload safely"
);

// Test 4: Multiple < characters are all escaped
const multipleAngleData = {
  "@type": "Product",
  content: "Price < 100 and value < 500",
};
const multipleAngleSerialized = serializeJsonLd(multipleAngleData);
const countEscaped = (multipleAngleSerialized.match(/\\u003c/g) || []).length;
assert.equal(countEscaped, 2, "Multiple < characters are all escaped");

// Test 5: Array of objects (common JSON-LD pattern)
const arrayData = [
  { "@type": "ListItem", position: 1, name: "Home < Sweet" },
  { "@type": "ListItem", position: 2, name: "Store < Profit" },
];
const arraySerialized = serializeJsonLd(arrayData);
const countInArray = (arraySerialized.match(/\\u003c/g) || []).length;
assert.equal(countInArray, 2, "< characters are escaped in arrays");

rmSync(outDir, { force: true, recursive: true });

console.log("JSON-LD security serialization tests passed");
