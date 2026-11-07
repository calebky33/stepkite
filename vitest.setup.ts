// Clear Supabase env vars before any module imports. In CI these are populated from GitHub
// Actions secrets so the production build can bake them into the client bundle, but tests must
// always run with Supabase disabled: otherwise `createSupabaseServer` would call `next/headers`
// `cookies()` outside a request scope and throw. Tests that need a signed-in user mock
// `requireSession` directly.
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_ANON_KEY;

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// jsdom gaps that Radix relies on.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;
// Node-environment tests (such as the check:copy script test) have no DOM.
if (typeof Element !== "undefined") {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}
