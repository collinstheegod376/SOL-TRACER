import { NextRequest, NextResponse } from 'next/server';
import { executeOrchestrator } from '@/lib/orchestrator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, walletAddress, history } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing "message" parameter in request body.' },
        { status: 400 }
      );
    }

    const safeWallet = typeof walletAddress === 'string' ? walletAddress.trim() : undefined;

    // Optional stream check
    const isStreamRequested =
      req.headers.get('accept') === 'text/event-stream' ||
      new URL(req.url).searchParams.get('stream') === 'true';

    const result = await executeOrchestrator({
      message: message.trim(),
      walletAddress: safeWallet,
      history: Array.isArray(history) ? history : [],
    });

    if (isStreamRequested) {
      // Server-sent events stream response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          // Send metadata
          controller.enqueue(
            encoder.encode(
              `event: metadata\ndata: ${JSON.stringify({
                classification: result.classification,
                toolCalls: result.toolCalls,
                structuredData: result.structuredData,
                engineUsed: result.engineUsed,
              })}\n\n`
            )
          );

          // Chunk the answer for simulated/streamed chunks
          const words = result.answer.split(' ');
          for (let i = 0; i < words.length; i++) {
            const chunk = (i === 0 ? '' : ' ') + words[i];
            controller.enqueue(
              encoder.encode(`event: delta\ndata: ${JSON.stringify({ text: chunk })}\n\n`)
            );
            // tiny delay for smooth token feel
            await new Promise((r) => setTimeout(r, 10));
          }

          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
          controller.close();
        },
      });

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    }

    // Standard JSON response
    return NextResponse.json({
      answer: result.answer,
      classification: result.classification,
      toolCalls: result.toolCalls,
      structuredData: result.structuredData,
      engineUsed: result.engineUsed,
    });
  } catch (error: any) {
    console.error('[API /api/chat] Error processing request:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
