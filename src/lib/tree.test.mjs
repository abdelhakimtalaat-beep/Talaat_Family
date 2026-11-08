import assert from "node:assert/strict";
import { layout, searchPeople, mapsLink, whatsappLink, validatePerson, descendantsCount, ancestors, BOX } from "./tree.ts";
const P = (id, n) => ({ id, full_name: n, occupation: null, birth_date: null, death_date: null, phone: null, address: null, maps_url: null, photo: null, notes: null });
const people = ["r","a","b","c","a1","a2"].map((i) => P(i, i === "a" ? "أحمد" : i));
const edges = [["r","a",0],["r","b",1],["r","c",2],["a","a1",0],["a","a2",1]].map(([parent,child,position]) => ({ parent, child, position }));
const L = layout(people, edges, new Set());
assert.equal(L.nodes.length, 6); assert.equal(L.edges.length, 5);
const pos = Object.fromEntries(L.nodes.map((n) => [n.id, n]));
assert.equal(pos.r.y, 0); assert.equal(pos.a1.y, 2 * (BOX.h + BOX.gapY));
// no overlaps on the same row
for (const y of new Set(L.nodes.map((n) => n.y))) { const row = L.nodes.filter((n) => n.y === y).sort((a, b) => a.x - b.x); for (let i = 1; i < row.length; i++) assert.ok(row[i].x - row[i-1].x >= BOX.w + BOX.gapX - 0.001); }
// parent centred over children
assert.ok(Math.abs(pos.a.x - (pos.a1.x + pos.a2.x) / 2) < 0.001);
const C = layout(people, edges, new Set(["a"]));
assert.equal(C.nodes.length, 4); assert.ok(C.nodes.find((n) => n.id === "a").collapsed);
assert.equal(descendantsCount("r", edges), 5); assert.deepEqual(ancestors("a1", edges), ["a", "r"]);
assert.equal(searchPeople(people, "احمد").length, 1);
assert.equal(mapsLink({ address: "الجيزة", maps_url: null }).startsWith("https://www.google.com/maps/search/"), true);
assert.equal(mapsLink({ address: "x", maps_url: "https://maps.app.goo.gl/abc" }), "https://maps.app.goo.gl/abc");
assert.equal(mapsLink({ address: "x", maps_url: "javascript:alert(1)" }).includes("google.com/maps/search"), true);
assert.equal(mapsLink({ address: null, maps_url: null }), null);
assert.equal(whatsappLink("0100 123 4567"), "https://wa.me/201001234567"); assert.equal(whatsappLink("abc"), null);
assert.equal(validatePerson({ full_name: " " }).error, "name_required");
assert.equal(validatePerson({ full_name: "x", maps_url: "http://x" }).error, "bad_url");
assert.equal(validatePerson({ full_name: "x", birth_date: "2000-01-01", death_date: "1990-01-01" }).error, "bad_date");
assert.equal(validatePerson({ full_name: "x", birth_date: "2000-13-45" }).error, "bad_date");
assert.equal(validatePerson({ full_name: "x", phone: "<script>" }).error, "bad_phone");
assert.equal(validatePerson({ full_name: " س ", birth_date: "2000-01-01" }).value.full_name, "س");
console.log("tree tests ok");
