import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import OpenAI from "openai";
import { NextRequest } from "next/server";

// ponytail: constructed lazily (not at module scope) so `next build` can collect this
// route's metadata without FIREWORKS_API_KEY set in the build environment.
export const POST = async (req: NextRequest) => {
  const openai = new OpenAI({
    apiKey: process.env.FIREWORKS_API_KEY,
    baseURL: "https://api.fireworks.ai/inference/v1",
  });
  const serviceAdapter = new OpenAIAdapter({ openai, model: "accounts/fireworks/models/deepseek-v4-pro" });
  const runtime = new CopilotRuntime();

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
