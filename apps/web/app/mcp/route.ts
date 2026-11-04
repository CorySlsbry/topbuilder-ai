// =============================================================================
// /mcp — read-only WebMCP server (Model Context Protocol over HTTP).
// =============================================================================
// A public, read-only MCP endpoint so AI agents (ChatGPT, Claude, Perplexity,
// agentic browsers) can query the brand's facts directly instead of scraping —
// the agentic-commerce / WebMCP play. JSON-RPC 2.0 over POST (single response,
// no streaming needed for these synchronous reads). CORS-open. All data comes
// from lib/site-facts so it stays identical to the JSON-LD + llms.txt.
//
// Supported: initialize, ping, tools/list, tools/call, resources/list,
// resources/read, and notifications (acked with 202). No auth, no mutations.
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { SITE, FAQ } from '@/lib/site-facts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'Top Builder AI', title: 'Top Builder AI — read-only MCP', version: '1.0.0' };

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Authorization',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version',
};

// -----------------------------------------------------------------------------
// Read-only tools — each returns a JSON string the agent can parse + cite.
// -----------------------------------------------------------------------------
const NO_ARGS = { type: 'object', properties: {}, additionalProperties: false } as const;

const TOOLS: Array<{ name: string; description: string; inputSchema: unknown; run: () => unknown }> = [
  {
    name: 'get_business',
    description: 'Overview of Top Builder AI: what it does, founder, parent firm, location, and contact.',
    inputSchema: NO_ARGS,
    run: () => ({
      brand: SITE.brand,
      summary: SITE.summary,
      tagline: SITE.tagline,
      founder: SITE.founder,
      parentFirm: SITE.parent,
      headquarters: SITE.address.full,
      areaServed: SITE.areaServed,
      phone: SITE.phoneDisplay,
      email: SITE.email,
      website: SITE.url,
    }),
  },
  {
    name: 'list_agents',
    description: 'The six self-learning AI agents Top Builder AI installs on ServiceTitan (Booking, Routing, Financial, Inventory, Workforce, Documents) — each with its edge vs ServiceTitan and a hard number.',
    inputSchema: NO_ARGS,
    run: () => ({ agents: SITE.agents }),
  },
  {
    name: 'list_services',
    description: 'The Top Builder AI offer: the free Founding-25 fit call, the $8,000 Back-Office Command Install, and the team-scaled monthly — with one-line descriptions and pricing.',
    inputSchema: NO_ARGS,
    run: () => ({ services: SITE.services }),
  },
  {
    name: 'get_pricing',
    description: 'Pricing: the free fit call, the $8,000 Founding-25 install (returns to $15,000 after 25 seats), the employee-scaled monthly ladder, and the board-ready-or-it’s-free guarantee.',
    inputSchema: NO_ARGS,
    run: () => ({ steps: SITE.services, monthlyLadder: SITE.pricingMatrix, guarantee: SITE.guarantee }),
  },
  {
    name: 'get_platforms',
    description: 'Which field-service platforms are supported and their status (ServiceTitan — six agents installed; Buildertrend custom; Procore early access).',
    inputSchema: NO_ARGS,
    run: () => ({ platforms: SITE.platforms }),
  },
  {
    name: 'get_faq',
    description: 'Frequently asked questions and answers about Top Builder AI.',
    inputSchema: NO_ARGS,
    run: () => ({ faq: FAQ.map(([question, answer]) => ({ question, answer })) }),
  },
  {
    name: 'get_contact',
    description: 'How to reach Top Builder AI: the Founding-25 fit call, phone/text, email, and mailing address.',
    inputSchema: NO_ARGS,
    run: () => ({
      bookFitCall: SITE.booking,
      teardownByEmail: `${SITE.url}/#teardown`,
      phone: SITE.phoneDisplay,
      email: SITE.email,
      address: SITE.address.full,
    }),
  },
];

// -----------------------------------------------------------------------------
// Resources
// -----------------------------------------------------------------------------
const RESOURCES = [
  { uri: 'topbuilderai://business', name: 'Business profile', description: 'Top Builder AI business facts', mimeType: 'application/json', body: () => TOOLS[0]!.run() },
  { uri: 'topbuilderai://pricing', name: 'Pricing', description: 'Offer + monthly ladder + guarantee', mimeType: 'application/json', body: () => TOOLS[3]!.run() },
  { uri: 'topbuilderai://faq', name: 'FAQ', description: 'Questions and answers', mimeType: 'application/json', body: () => TOOLS[5]!.run() },
];

// -----------------------------------------------------------------------------
// JSON-RPC dispatch
// -----------------------------------------------------------------------------
interface RpcReq { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> }

function ok(id: RpcReq['id'], result: unknown) {
  return { jsonrpc: '2.0', id, result };
}
function err(id: RpcReq['id'], code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function handle(req: RpcReq): object | null {
  const { id, method } = req;
  // Notifications have no id and expect no response.
  const isNotification = id === undefined || id === null;

  switch (method) {
    case 'initialize':
      return ok(id, {
        protocolVersion: (req.params?.protocolVersion as string) || PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          'Read-only MCP server for Top Builder AI (done-for-you AI operations for ServiceTitan contractors). Use the tools to answer questions about services, pricing, platform support, and contact.',
      });
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null; // ack-only
    case 'ping':
      return ok(id, {});
    case 'tools/list':
      return ok(id, { tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
    case 'tools/call': {
      const name = req.params?.name as string | undefined;
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) return err(id, -32602, `Unknown tool: ${name}`);
      return ok(id, { content: [{ type: 'text', text: JSON.stringify(tool.run(), null, 2) }], isError: false });
    }
    case 'resources/list':
      return ok(id, { resources: RESOURCES.map(({ uri, name, description, mimeType }) => ({ uri, name, description, mimeType })) });
    case 'resources/read': {
      const uri = req.params?.uri as string | undefined;
      const res = RESOURCES.find((r) => r.uri === uri);
      if (!res) return err(id, -32602, `Unknown resource: ${uri}`);
      return ok(id, { contents: [{ uri: res.uri, mimeType: res.mimeType, text: JSON.stringify(res.body(), null, 2) }] });
    }
    default:
      return isNotification ? null : err(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(err(null, -32700, 'Parse error'), { status: 400, headers: CORS });
  }

  // Support JSON-RPC batches.
  if (Array.isArray(body)) {
    const responses = body.map((r) => handle(r as RpcReq)).filter((r): r is object => r !== null);
    if (responses.length === 0) return new NextResponse(null, { status: 202, headers: CORS });
    return NextResponse.json(responses, { headers: CORS });
  }

  const response = handle(body as RpcReq);
  if (response === null) return new NextResponse(null, { status: 202, headers: CORS });
  return NextResponse.json(response, { headers: CORS });
}

// GET returns a human/agent-readable descriptor (and confirms the endpoint).
export async function GET(): Promise<Response> {
  return NextResponse.json(
    {
      ...SERVER_INFO,
      protocol: 'mcp',
      protocolVersion: PROTOCOL_VERSION,
      transport: 'streamable-http (JSON-RPC over POST)',
      endpoint: SITE.mcpEndpoint,
      tools: TOOLS.map((t) => t.name),
      resources: RESOURCES.map((r) => r.uri),
      docs: `${SITE.url}/llms.txt`,
    },
    { headers: CORS },
  );
}

export async function OPTIONS(): Promise<Response> {
  return new NextResponse(null, { status: 204, headers: CORS });
}
