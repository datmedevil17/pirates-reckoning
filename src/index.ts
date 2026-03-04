import { serve } from "bun";
import index from "./index.html";
import { join } from "path";

// HTMLBundle (from HTML imports) can only be used via Bun.serve's `static`
// option — it cannot be returned from the fetch handler. The `static` key
// is supported at runtime but missing from older @types/bun type definitions,
// so we cast to `any` to bypass the type error.
const server = (serve as any)({
  static: {
    "/": index,
    "/test": index,
  },

  async fetch(req: Request) {
    const url = new URL(req.url);

    // 1. Serve static files from the public directory
    const publicPath = join("public", url.pathname);
    const publicFile = Bun.file(publicPath);
    if (await publicFile.exists()) {
      return new Response(publicFile);
    }

    // 2. API Routes
    if (url.pathname === "/api/hello") {
      return Response.json({
        message: "Hello, world!",
        method: req.method,
      });
    }

    if (url.pathname.startsWith("/api/hello/")) {
      const name = url.pathname.slice("/api/hello/".length);
      return Response.json({
        message: `Hello, ${name}!`,
      });
    }

    // 3. SPA fallback for any unmatched routes
    return new Response(Bun.file("src/index.html"), {
      headers: { "Content-Type": "text/html" },
    });
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
