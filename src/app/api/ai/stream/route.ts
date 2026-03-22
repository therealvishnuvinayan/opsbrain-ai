import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { resolveAiQuery } from "@/lib/ai/query";

interface StreamRequestBody {
  question?: string;
  conversationId?: string;
}

interface OpenAIStreamChunk {
  choices?: Array<{
    delta?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
}

function encodeSseEvent(
  encoder: TextEncoder,
  payload:
    | { type: "start"; sources: Array<{ type: string; endpoint?: string }> }
    | { type: "chunk"; delta: string; content: string }
    | { type: "done"; content: string; sources: Array<{ type: string; endpoint?: string }> }
    | { type: "error"; message: string }
) {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function extractDeltaText(payload: OpenAIStreamChunk) {
  const content = payload.choices?.[0]?.delta?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (item.type === "text" ? item.text ?? "" : ""))
      .join("");
  }

  return "";
}

function sseResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getApiSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  if (!session) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as StreamRequestBody;
  const question = body.question?.trim();

  if (!question) {
    return NextResponse.json({ message: "question is required." }, { status: 400 });
  }

  try {
    const resolved = await resolveAiQuery(question);
    const encoder = new TextEncoder();

    if (resolved.type === "unsupported" || resolved.type === "missing_order_id") {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encodeSseEvent(encoder, { type: "start", sources: resolved.sources }));
          controller.enqueue(
            encodeSseEvent(encoder, {
              type: "chunk",
              delta: resolved.answer,
              content: resolved.answer,
            })
          );
          controller.enqueue(
            encodeSseEvent(encoder, {
              type: "done",
              content: resolved.answer,
              sources: resolved.sources,
            })
          );
          controller.close();
        },
      });

      return sseResponse(stream);
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const model = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";

    if (!apiKey) {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encodeSseEvent(encoder, { type: "start", sources: resolved.sources }));
          controller.enqueue(
            encodeSseEvent(encoder, {
              type: "chunk",
              delta: resolved.fallbackAnswer,
              content: resolved.fallbackAnswer,
            })
          );
          controller.enqueue(
            encodeSseEvent(encoder, {
              type: "done",
              content: resolved.fallbackAnswer,
              sources: resolved.sources,
            })
          );
          controller.close();
        },
      });

      return sseResponse(stream);
    }

    console.info("AI stream start", {
      conversationId: body.conversationId ?? null,
      sourceCount: resolved.sources.length,
    });

    const upstreamResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        stream: true,
        messages: [
          { role: "system", content: resolved.prompt.system },
          { role: "user", content: resolved.prompt.user },
        ],
      }),
      cache: "no-store",
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const message = await upstreamResponse.text().catch(() => "");
      console.error("OpenAI stream request failed", {
        status: upstreamResponse.status,
        body: message.slice(0, 400),
      });

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encodeSseEvent(encoder, { type: "start", sources: resolved.sources }));
          controller.enqueue(
            encodeSseEvent(encoder, {
              type: "chunk",
              delta: resolved.fallbackAnswer,
              content: resolved.fallbackAnswer,
            })
          );
          controller.enqueue(
            encodeSseEvent(encoder, {
              type: "done",
              content: resolved.fallbackAnswer,
              sources: resolved.sources,
            })
          );
          controller.close();
        },
      });

      return sseResponse(stream);
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = upstreamResponse.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        controller.enqueue(encodeSseEvent(encoder, { type: "start", sources: resolved.sources }));

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";

            for (const event of events) {
              const lines = event
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.startsWith("data:"));

              for (const line of lines) {
                const data = line.slice(5).trim();

                if (!data) {
                  continue;
                }

                if (data === "[DONE]") {
                  const finalContent = fullContent || resolved.fallbackAnswer;
                  controller.enqueue(
                    encodeSseEvent(encoder, {
                      type: "done",
                      content: finalContent,
                      sources: resolved.sources,
                    })
                  );
                  console.info("AI stream done", {
                    conversationId: body.conversationId ?? null,
                    charCount: finalContent.length,
                  });
                  controller.close();
                  return;
                }

                const payload = JSON.parse(data) as OpenAIStreamChunk;
                const delta = extractDeltaText(payload);

                if (!delta) {
                  continue;
                }

                fullContent += delta;
                controller.enqueue(
                  encodeSseEvent(encoder, {
                    type: "chunk",
                    delta,
                    content: fullContent,
                  })
                );
              }
            }
          }

          const finalContent = fullContent || resolved.fallbackAnswer;
          controller.enqueue(
            encodeSseEvent(encoder, {
              type: "done",
              content: finalContent,
              sources: resolved.sources,
            })
          );
          console.info("AI stream done", {
            conversationId: body.conversationId ?? null,
            charCount: finalContent.length,
          });
          controller.close();
        } catch (error) {
          console.error("AI stream failed", {
            conversationId: body.conversationId ?? null,
            message: error instanceof Error ? error.message : "Unknown AI stream error",
          });
          controller.enqueue(
            encodeSseEvent(encoder, {
              type: "error",
              message: "Assistant streaming failed.",
            })
          );
          controller.close();
        } finally {
          reader.releaseLock();
        }
      },
    });

    return sseResponse(stream);
  } catch (error) {
    console.error("AI stream route failed", {
      message: error instanceof Error ? error.message : "Unknown AI stream failure",
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encodeSseEvent(encoder, {
            type: "error",
            message: "I couldn't retrieve Bamboo order data right now. Please try again in a moment.",
          })
        );
        controller.close();
      },
    });

    return sseResponse(stream);
  }
}
