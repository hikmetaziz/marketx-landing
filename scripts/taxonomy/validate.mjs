import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  NON_SUBCATEGORY_TERMS,
  REQUIRED_LEAF_COUNTS,
  REQUIRED_PARENT_COUNT,
  TAXONOMY_VERSION,
  TAXONOMY_VERSION_NAME,
} from "./marktx-taxonomy-v1.mjs";

function readArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function fail(errors) {
  for (const error of errors) {
    console.error(`taxonomy_validate_error=${error}`);
  }
  process.exit(1);
}

const snapshotPath = resolve(
  readArg("--snapshot", `generated/${TAXONOMY_VERSION_NAME}.json`),
);
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
const errors = [];

if (snapshot.version !== TAXONOMY_VERSION) errors.push("version must be 1");
if (snapshot.version_name !== TAXONOMY_VERSION_NAME) {
  errors.push(`version_name must be ${TAXONOMY_VERSION_NAME}`);
}
if (!Array.isArray(snapshot.parents)) errors.push("parents must be an array");
if ((snapshot.parents ?? []).length !== REQUIRED_PARENT_COUNT) {
  errors.push(`expected ${REQUIRED_PARENT_COUNT} parents`);
}

const parentSlugs = new Set();
const aliasTargets = new Map();
for (const parent of snapshot.parents ?? []) {
  if (parentSlugs.has(parent.slug)) errors.push(`duplicate parent slug ${parent.slug}`);
  parentSlugs.add(parent.slug);

  const groupKeys = new Set();
  const leafSlugs = new Set();
  const leafNames = new Set();
  const leafOrders = new Set();
  const leaves = [];

  for (const alias of parent.aliases ?? []) {
    const key = String(alias).toLocaleLowerCase("az");
    const target = `${parent.slug}:`;
    const previous = aliasTargets.get(key);
    if (previous && previous !== target) errors.push(`alias ${alias} maps to multiple targets`);
    aliasTargets.set(key, target);
  }

  for (const group of parent.groups ?? []) {
    if (groupKeys.has(group.key)) errors.push(`${parent.slug} duplicate group ${group.key}`);
    groupKeys.add(group.key);
    if (!group.key || !group.label || typeof group.order !== "number") {
      errors.push(`${parent.slug} malformed group metadata`);
    }
    if (leafSlugs.has(group.key)) {
      errors.push(`${parent.slug} group key ${group.key} must not be selectable`);
    }

    for (const leaf of group.leaves ?? []) {
      leaves.push(leaf);
      if (leafSlugs.has(leaf.slug)) errors.push(`${parent.slug} duplicate leaf slug ${leaf.slug}`);
      leafSlugs.add(leaf.slug);
      const leafNameKey = String(leaf.name).toLocaleLowerCase("az");
      if (leafNames.has(leafNameKey)) errors.push(`${parent.slug} duplicate leaf name ${leaf.name}`);
      leafNames.add(leafNameKey);
      if (leafOrders.has(leaf.order)) errors.push(`${parent.slug} duplicate leaf order ${leaf.order}`);
      leafOrders.add(leaf.order);
      if (!leaf.slug || !leaf.name || typeof leaf.order !== "number") {
        errors.push(`${parent.slug} malformed leaf`);
      }
      if (NON_SUBCATEGORY_TERMS.has(String(leaf.slug).toLocaleLowerCase("az"))) {
        errors.push(`${parent.slug} forbidden subcategory term ${leaf.slug}`);
      }
      for (const alias of leaf.aliases ?? []) {
        const key = String(alias).toLocaleLowerCase("az");
        const target = `${parent.slug}:${leaf.slug}`;
        const previous = aliasTargets.get(key);
        if (previous && previous !== target) errors.push(`alias ${alias} maps to multiple targets`);
        aliasTargets.set(key, target);
      }
    }
  }

  const expectedLeafCount = REQUIRED_LEAF_COUNTS.get(parent.key);
  if (typeof expectedLeafCount !== "number") {
    errors.push(`${parent.slug} missing expected leaf count`);
  } else if (leaves.length !== expectedLeafCount) {
    errors.push(`${parent.slug} expected ${expectedLeafCount} leaves, got ${leaves.length}`);
  }
  for (let order = 1; order <= (expectedLeafCount ?? 0); order += 1) {
    if (!leafOrders.has(order)) errors.push(`${parent.slug} missing leaf order ${order}`);
  }
}

const forbiddenLeafNames = ["Apple", "Samsung", "Xiaomi", "SUV", "Sedan", "Kupe"];
for (const name of forbiddenLeafNames) {
  const lowerName = name.toLocaleLowerCase("az");
  const found = (snapshot.parents ?? []).some((parent) =>
    (parent.groups ?? []).some((group) =>
      (group.leaves ?? []).some((leaf) => String(leaf.name).toLocaleLowerCase("az") === lowerName),
    ),
  );
  if (found) errors.push(`${name} must not be a leaf subcategory`);
}

if (errors.length > 0) fail(errors);
console.log(`taxonomy_validate=pass snapshot=${snapshotPath}`);
