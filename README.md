# ProductPop

**Your product deserves to be seen.** Tell your own Claude about your product; ProductPop turns what it writes into on-brand LinkedIn/X posts, Instagram carousels, visual posts and Reels/Shorts that you can edit, download and publish.

- **No AI inside.** Claude (the customer's own plan) does the thinking and writing via MCP. ProductPop stores, edits, renders (deterministic templates → PNG / in-browser video) and keeps it live.
- **Stack:** Next.js 16 on Vercel · Vercel Blob (private JSON docs + media) · `next/og` (Satori) templates · hand-rolled stateless MCP server (Streamable HTTP, JSON responses).

## MCP
Each workspace gets a private URL: `https://<app>/api/mcp/<token>` (Settings → Connect Claude). Add it in Claude → Settings → Connectors → Add custom connector.

Tools: `get_workspace`, `save_product`, `get_product`, `create_campaign`, `add_assets`, `get_campaign`, `update_asset`, `update_campaign`, `delete_asset`, `get_content_calendar`.

## Local dev
```
npm install
npm run dev   # without BLOB_READ_WRITE_TOKEN, data is stored in ./.data
```
Env: `BLOB_READ_WRITE_TOKEN`, `SESSION_SECRET`, `DEMO_MCP_TOKEN` (optional), `DEMO_PASSWORD` (optional, default productpop2026).

## Live
- App: https://productpop-kohl.vercel.app — demo login `demo` / `productpop2026` (or create your own workspace)
- Demo MCP link: `https://productpop-kohl.vercel.app/api/mcp/demo_RLXXdxK6oOo6jwAR5gXpcIX2`
- Health: https://productpop-kohl.vercel.app/api/health

### Connect to Claude
1. claude.ai → Settings → Connectors → **Add custom connector**
2. Name: `ProductPop`, URL: your MCP link (above, or from the app's *Connect Claude* page). No OAuth.
3. In a chat, enable ProductPop in the tools menu and ask: *"Using my FlowDesk product in ProductPop, create a 7-day launch campaign for LinkedIn, X, Instagram and Reels and save everything in ProductPop."*
