import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '@/lib/mcp-client';
import { SOLSCAN_TOOL_DEFINITIONS, ToolDefinition } from '@/lib/solscan-tools';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const toolName = searchParams.get('tool');

    // If no tool specified, list all available MCP tools with documentation
    if (!toolName) {
      return NextResponse.json({
        message: 'Solscan MCP Tools Catalog',
        count: SOLSCAN_TOOL_DEFINITIONS.length,
        tools: SOLSCAN_TOOL_DEFINITIONS,
        usage: {
          get: '/api/tools?tool=account_detail&address=<SOLANA_ADDRESS>',
          post: 'POST /api/tools with JSON body: { "tool": "account_detail", "params": { "address": "..." } }',
        },
      });
    }

    // Convert searchParams into params object (excluding 'tool')
    const params: Record<string, any> = {};
    searchParams.forEach((val, key) => {
      if (key !== 'tool') {
        if (/^\d+$/.test(val)) {
          params[key] = parseInt(val, 10);
        } else {
          params[key] = val;
        }
      }
    });

    const execResult = await mcpClient.callTool(toolName, params);

    return NextResponse.json({
      success: true,
      tool: toolName,
      params,
      source: execResult.source,
      data: execResult.data,
      warning: execResult.warning,
      durationMs: execResult.durationMs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error executing tool',
      },
      { status: 400 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tool, params = {} } = body;

    if (!tool || typeof tool !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid "tool" parameter in request body.',
          availableTools: SOLSCAN_TOOL_DEFINITIONS.map((t: ToolDefinition) => t.name),
        },
        { status: 400 }
      );
    }

    const execResult = await mcpClient.callTool(tool, params);

    return NextResponse.json({
      success: true,
      tool,
      params,
      source: execResult.source,
      data: execResult.data,
      warning: execResult.warning,
      durationMs: execResult.durationMs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error executing tool',
      },
      { status: 400 }
    );
  }
}
