import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

import { NO_EXPERIMENTS, type ExperimentBootstrap } from "./experiments/flags";
import {
  marketplaceHtmlCacheControl,
  marketplaceResponseStatus,
} from "./marketplace/marketplace-response-status.js";

const handleRequest = createStartHandler(async (context) => {
  const pathname = new URL(context.request.url).pathname;
  const status = marketplaceResponseStatus(
    pathname,
    context.router.state.matches.map((match) => match.loaderData),
  );
  const result = await defaultStreamHandler(context);
  const response = "response" in result ? result.response : result;
  const responseStatus = status ?? response.status;
  const cacheControl = marketplaceHtmlCacheControl(pathname, responseStatus);
  if (status === null && cacheControl === null) return result;
  const headers = new Headers(response.headers);
  if (cacheControl !== null) headers.set("cache-control", cacheControl);
  const updatedResponse = new Response(response.body, {
    status: responseStatus,
    statusText: status === null ? response.statusText : "",
    headers,
  });
  return "response" in result
    ? { ...result, response: updatedResponse }
    : updatedResponse;
});

// cc runs no site experiments and no analytics proxy: every visitor gets the
// default page variants and no request is forwarded to an analytics service.
export default {
  async fetch(request: Request): Promise<Response> {
    return handleRequest(request, {
      context: { experiments: NO_EXPERIMENTS },
    });
  },
};

declare module "@tanstack/react-start" {
  interface Register {
    server: { requestContext: { experiments: ExperimentBootstrap } };
  }
}
