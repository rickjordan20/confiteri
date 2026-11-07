import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCountry, normalizeSource, shouldIgnoreVisit } from "../api/visit.js";

test("normaliza país e rejeita códigos inválidos", () => {
  assert.equal(normalizeCountry("br"), "BR");
  assert.equal(normalizeCountry(" pt "), "PT");
  assert.equal(normalizeCountry("BRA"), "XX");
  assert.equal(normalizeCountry(""), "XX");
  assert.equal(normalizeCountry("B1"), "XX");
});

test("limita a origem e usa direct como fallback", () => {
  assert.equal(normalizeSource(" Instagram "), "instagram");
  assert.equal(normalizeSource("google_ads"), "google_ads");
  assert.equal(normalizeSource("x".repeat(51)), "direct");
  assert.equal(normalizeSource("a'; DROP TABLE"), "direct");
  assert.equal(normalizeSource(null), "direct");
});

test("filtra robôs e chamadas cross-site sem bloquear navegação legítima", () => {
  assert.equal(shouldIgnoreVisit({ headers: { "user-agent": "Googlebot" } }), true);
  assert.equal(shouldIgnoreVisit({ headers: { "user-agent": "Mozilla/5.0", "sec-fetch-site": "cross-site" } }), true);
  assert.equal(shouldIgnoreVisit({ headers: { "user-agent": "Mozilla/5.0", origin: "https://evil.example", host: "confiteri.com.br" } }), true);
  assert.equal(shouldIgnoreVisit({ headers: { "user-agent": "Mozilla/5.0", origin: "https://confiteri.com.br", host: "confiteri.com.br" } }), false);
});
