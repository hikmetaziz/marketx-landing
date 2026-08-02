import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isStoreApplicationMessage,
  isStoreApplicationSubject,
  parseStoreApplicationMessage,
} from "../src/lib/stores/parse-store-application.ts";

const VALID_MESSAGE = [
  "MÜRACİƏT NÖVÜ: Yeni mağaza",
  "Mağaza adı: Magnoliya",
  "Kateqoriya: Elektronika",
  "Şəhər: Cəlilabad",
  "Təsvir: test",
  "Ünvan: Bakı, Nizami 12",
  "İş günləri: Bazar ertəsi, Çərşənbə axşamı",
  "İş saatları: 09:00–18:00",
  "Telefon: +994514171118",
  "WhatsApp: Qeyd edilməyib",
  "E-poçt: test@example.com",
  "",
  "Qeyd: Bu müraciət mağaza və sahiblik yaratmır.",
].join("\n");

describe("parse-store-application", () => {
  it("detects store application subject", () => {
    assert.equal(isStoreApplicationSubject("Yeni mağaza müraciəti"), true);
    assert.equal(isStoreApplicationSubject("Yeni mağaza müraciəti: Magnoliya"), true);
    assert.equal(isStoreApplicationSubject("Texniki problem"), false);
    assert.equal(isStoreApplicationSubject(null), false);
  });

  it("detects store application message", () => {
    assert.equal(isStoreApplicationMessage("MÜRACİƏT NÖVÜ: Yeni mağaza"), true);
    assert.equal(isStoreApplicationMessage("  MÜRACİƏT NÖVÜ: Yeni mağaza"), true);
    assert.equal(isStoreApplicationMessage("Salam"), false);
    assert.equal(isStoreApplicationMessage(null), false);
  });

  it("parses valid message", () => {
    const parsed = parseStoreApplicationMessage(VALID_MESSAGE);
    assert.ok(parsed);
    assert.equal(parsed.name, "Magnoliya");
    assert.equal(parsed.category, "Elektronika");
    assert.equal(parsed.city, "Cəlilabad");
    assert.equal(parsed.description, "test");
    assert.equal(parsed.address, "Bakı, Nizami 12");
    assert.equal(parsed.weekdays, "Bazar ertəsi, Çərşənbə axşamı");
    assert.equal(parsed.openingTime, "09:00");
    assert.equal(parsed.closingTime, "18:00");
    assert.equal(parsed.phone, "+994514171118");
    assert.equal(parsed.whatsapp, "");
    assert.equal(parsed.email, "test@example.com");
    assert.equal(parsed.raw, VALID_MESSAGE);
  });

  it("preserves colons inside values", () => {
    const message = [
      "MÜRACİƏT NÖVÜ: Yeni mağaza",
      "Təsvir: Əlaqə: 10:00-da zəng",
    ].join("\n");
    const parsed = parseStoreApplicationMessage(message);
    assert.ok(parsed);
    assert.equal(parsed.description, "Əlaqə: 10:00-da zəng");
  });

  it("handles missing optional fields", () => {
    const message = [
      "MÜRACİƏT NÖVÜ: Yeni mağaza",
      "Mağaza adı: Test",
    ].join("\n");
    const parsed = parseStoreApplicationMessage(message);
    assert.ok(parsed);
    assert.equal(parsed.name, "Test");
    assert.equal(parsed.category, "");
    assert.equal(parsed.city, "");
    assert.equal(parsed.openingTime, "09:00");
    assert.equal(parsed.closingTime, "18:00");
  });

  it("returns null for malformed message", () => {
    assert.equal(parseStoreApplicationMessage("Salam\nMağaza adı: Test"), null);
    assert.equal(parseStoreApplicationMessage(""), null);
    assert.equal(parseStoreApplicationMessage(null), null);
  });

  it("returns null for unrelated support message", () => {
    const message = [
      "Mövzu: Texniki problem",
      "Mesaj: Sayt açılmır.",
    ].join("\n");
    assert.equal(parseStoreApplicationMessage(message), null);
  });
});
