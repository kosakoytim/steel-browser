import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  handleLaunchBrowserSession,
  handleGetBrowserContext,
  handleExitBrowserSession,
  handleGetSessionDetails,
  handleGetSessions,
  handleGetSessionStream,
  handleGetSessionLiveDetails,
} from "./sessions.controller.js";
import { handleScrape, handleScreenshot, handlePDF } from "../actions/actions.controller.js";
import { $ref } from "../../plugins/schemas.js";
import {
  CreateSessionRequest,
  RecordedEvents,
  SessionStreamRequest,
  SessionsScrapeRequest,
  SessionsScreenshotRequest,
  SessionsPDFRequest,
} from "./sessions.schema.js";
import { BrowserEventType, EmitEvent } from "../../types/enums.js";

async function routes(server: FastifyInstance) {
  server.get(
    "/health",
    {
      schema: {
        operationId: "health",
        description: "Check if the server and browser are running",
        tags: ["Health"],
        summary: "Check if the server and browser are running",
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!server.cdpService.isRunning()) {
        return reply.status(503).send({ status: "service_unavailable" });
      }
      return reply.send({ status: "ok" });
    },
  );
  server.post(
    "/sessions",
    {
      schema: {
        operationId: "launch_browser_session",
        description: "Launch a browser session",
        tags: ["Sessions"],
        summary: "Launch a browser session",
        body: $ref("CreateSession"),
        response: {
          200: $ref("SessionDetails"),
        },
      },
    },
    async (request: CreateSessionRequest, reply: FastifyReply) =>
      handleLaunchBrowserSession(server, request, reply),
  );

  server.get(
    "/sessions",
    {
      schema: {
        operationId: "get_sessions",
        description: "Get all sessions",
        tags: ["Sessions"],
        summary: "Get all sessions",
        response: {
          200: $ref("MultipleSessions"),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) =>
      handleGetSessions(server, request, reply),
  );

  server.get(
    "/sessions/:sessionId",
    {
      schema: {
        operationId: "get_session_details",
        description: "Get session details",
        tags: ["Sessions"],
        summary: "Get session details",
        response: {
          200: $ref("SessionDetails"),
        },
      },
    },
    async (request: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) =>
      handleGetSessionDetails(server, request, reply),
  );

  server.get(
    "/sessions/:sessionId/context",
    {
      schema: {
        operationId: "get_browser_context",
        description: "Get a browser context",
        tags: ["Sessions"],
        summary: "Get a browser context",
        response: {
          200: $ref("SessionContextSchema"),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) =>
      handleGetBrowserContext(server.cdpService, request, reply),
  );

  server.post(
    "/sessions/:sessionId/release",
    {
      schema: {
        operationId: "release_browser_session",
        description: "Release a browser session",
        tags: ["Sessions"],
        summary: "Release a browser session",
        response: {
          200: $ref("ReleaseSession"),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) =>
      handleExitBrowserSession(server, request, reply),
  );

  server.post(
    "/sessions/release",
    {
      schema: {
        operationId: "release_browser_sessions",
        description: "Release browser sessions",
        tags: ["Sessions"],
        summary: "Release browser sessions",
        response: {
          200: $ref("ReleaseSession"),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) =>
      handleExitBrowserSession(server, request, reply),
  );

  server.get(
    "/sessions/debug",
    {
      onRequest: [],
      schema: {
        operationId: "get_session_debugger_stream",
        description: "Returns an HTML page with a live debugger view of the session",
        tags: ["Sessions"],
        summary: "Get session debugger view",
        querystring: $ref("SessionStreamQuery"),
        response: {
          200: $ref("SessionStreamResponse"),
        },
      },
    },
    async (request: SessionStreamRequest, reply: FastifyReply) =>
      handleGetSessionStream(server, request, reply),
  );

  server.post(
    "/events",
    {
      schema: {
        operationId: "receive_events",
        description: "Receive recorded events from the browser",
        tags: ["Sessions"],
        summary: "Receive recorded events from the browser",
        body: $ref("RecordedEvents"),
      },
    },
    async (request: FastifyRequest<{ Body: RecordedEvents }>, reply: FastifyReply) => {
      server.cdpService.getInstrumentationLogger().record({
        type: BrowserEventType.Recording,
        timestamp: new Date().toISOString(),
        data: request.body,
      });
      return reply.send({ status: "ok" });
    },
  );

  server.get(
    "/sessions/:id/live-details",
    {
      onRequest: [],
      schema: {
        operationId: "get_session_live_details",
        description:
          "Returns the live state of the session, including pages, tabs, and browser state",
        tags: ["Sessions"],
        summary: "Get session live details",
        response: {
          200: $ref("SessionLiveDetailsResponse"),
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) =>
      handleGetSessionLiveDetails(server, request, reply),
  );

  server.post(
    "/sessions/scrape",
    {
      schema: {
        operationId: "scrape_session",
        description: "Scrape Current Session",
        tags: ["Sessions"],
        summary: "Scrape Current Session",
        body: $ref("ScrapeRequest"),
        response: {
          200: $ref("ScrapeResponse"),
        },
      },
    },
    async (request: SessionsScrapeRequest, reply: FastifyReply) =>
      handleScrape(server.sessionService, server.cdpService, request, reply),
  );

  server.post(
    "/sessions/screenshot",
    {
      schema: {
        operationId: "screenshot_session",
        description: "Take Screenshot of Current Session",
        tags: ["Sessions"],
        summary: "Take Screenshot of Current Session",
        body: $ref("ScreenshotRequest"),
        response: {
          200: $ref("ScreenshotResponse"),
        },
      },
    },
    async (request: SessionsScreenshotRequest, reply: FastifyReply) =>
      handleScreenshot(server.sessionService, server.cdpService, request, reply),
  );

  server.post(
    "/sessions/pdf",
    {
      schema: {
        operationId: "pdf_session",
        description: "Generate PDF of Current Session",
        tags: ["Sessions"],
        summary: "Generate PDF of Current Session",
        body: $ref("PDFRequest"),
        response: {
          200: $ref("PDFResponse"),
        },
      },
    },
    async (request: SessionsPDFRequest, reply: FastifyReply) =>
      handlePDF(server.sessionService, server.cdpService, request, reply),
  );

  server.post(
    "/sessions/get-all-interactive",
    {
      schema: {
        operationId: "get_all_interactive_elements",
        description: "Get all interactive elements on the current page",
        tags: ["Sessions"],
        summary: "Get all interactive elements",
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const page = await server.cdpService.getPrimaryPage();

        const elements = await page.evaluate(() => {
          const result: {
            buttons: Array<{ text: string; selector: string | null }>;
            inputs: Array<{ name: string; type: string; placeholder: string; selector: string | null }>;
            checkboxes: Array<{ label: string; name: string; type: string; checked: boolean; selector: string | null }>;
            selects: Array<{ name: string; selector: string | null; options: string[] }>;
            links: Array<{ text: string; href: string; selector: string | null }>;
            clickableElements: Array<{ text: string; selector: string | null }>;
          } = {
            buttons: [],
            inputs: [],
            checkboxes: [],
            selects: [],
            links: [],
            clickableElements: []
          };

          // Get all buttons and button-like elements
          document.querySelectorAll('button, [role="button"], .btn, .button').forEach((el) => {
            const htmlEl = el as HTMLElement;
            const text = htmlEl.textContent?.trim() || htmlEl.getAttribute('aria-label') || '';
            if (text && htmlEl.offsetParent !== null) {
              result.buttons.push({
                text: text.substring(0, 100),
                selector: htmlEl.id
                  ? `#${htmlEl.id}`
                  : htmlEl.className
                  ? `.${htmlEl.className.split(' ')[0]}`
                  : htmlEl.getAttribute('data-testid')
                  ? `[data-testid="${htmlEl.getAttribute('data-testid')}"]`
                  : null,
              });
            }
          });

          // Get text inputs and textareas
          document
            .querySelectorAll(
              'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="hidden"]), textarea'
            )
            .forEach((el) => {
              const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
              result.inputs.push({
                name: inputEl.name || "",
                type: (inputEl as HTMLInputElement).type || "textarea",
                placeholder: (inputEl as any).placeholder || "",
                selector: inputEl.id
                  ? `#${inputEl.id}`
                  : inputEl.name
                  ? `[name="${inputEl.name}"]`
                  : null,
              });
            });

          // Get checkboxes and radio buttons with better label detection
          document
            .querySelectorAll('input[type="checkbox"], input[type="radio"]')
            .forEach((el) => {
              const inputEl = el as HTMLInputElement;
              // Try multiple ways to get a good label
              let label = "";
              if (inputEl.labels && inputEl.labels.length > 0) {
                label = inputEl.labels[0].textContent?.trim() || "";
              } else {
                // Look for parent label or nearby text
                const parentLabel = inputEl.closest("label");
                if (parentLabel) {
                  label = parentLabel.textContent?.trim() || "";
                } else {
                  // Try sibling elements
                  const nextSibling = inputEl.nextElementSibling;
                  if (nextSibling) {
                    label = nextSibling.textContent?.trim() || "";
                  }
                }
              }
              // Fallback to name or value
              label = label || inputEl.value || inputEl.name || "";

              result.checkboxes.push({
                label: label.substring(0, 100),
                name: inputEl.name || "",
                type: inputEl.type,
                checked: inputEl.checked,
                selector: inputEl.id
                  ? `#${inputEl.id}`
                  : inputEl.name
                  ? `[name="${inputEl.name}"]`
                  : null,
              });
            });

          // Get select dropdowns
          document.querySelectorAll("select").forEach((el) => {
            const selectEl = el as HTMLSelectElement;
            result.selects.push({
              name: selectEl.name || "",
              selector: selectEl.id
                ? `#${selectEl.id}`
                : selectEl.name
                ? `[name="${selectEl.name}"]`
                : null,
              options: Array.from(selectEl.options).map((opt) => opt.text),
            });
          });

          // Get ALL links (especially product links and filter links)
          document.querySelectorAll('a[href]').forEach((el) => {
            const linkEl = el as HTMLAnchorElement;
            const text = linkEl.textContent?.trim() || linkEl.getAttribute('aria-label') || '';
            // Skip navigation links, get product and utility links
            if (text && linkEl.offsetParent !== null && text.length > 0) {
              result.links.push({
                text: text.substring(0, 150),
                href: linkEl.href,
                selector: linkEl.id
                  ? `#${linkEl.id}`
                  : linkEl.className
                  ? `a.${linkEl.className.split(' ')[0]}`
                  : linkEl.getAttribute('data-testid')
                  ? `a[data-testid="${linkEl.getAttribute('data-testid')}"]`
                  : `a[href="${linkEl.getAttribute('href')}"]`,
              });
            }
          });

          // Get other clickable elements (filters, categories, custom divs)
          document
            .querySelectorAll(
              '[onclick], .filter, .category, [data-testid*="filter"], [data-testid*="category"], [role="menuitem"], [role="option"], [class*="click"], [class*="item"]'
            )
            .forEach((el) => {
              const htmlEl = el as HTMLElement;
              // Skip if already captured as button, link, or input
              if (
                !htmlEl.matches("button, a, input, select, textarea") &&
                htmlEl.offsetParent !== null
              ) {
                const text = htmlEl.textContent?.trim() || "";
                // Only include if has meaningful text and is reasonably sized
                if (text && text.length > 0 && text.length < 200) {
                  result.clickableElements.push({
                    text: text.substring(0, 150),
                    selector: htmlEl.id
                      ? `#${htmlEl.id}`
                      : htmlEl.className
                      ? `.${htmlEl.className.split(' ')[0]}`
                      : htmlEl.getAttribute('data-testid')
                      ? `[data-testid="${htmlEl.getAttribute('data-testid')}"]`
                      : htmlEl.getAttribute('data-unify')
                      ? `[data-unify="${htmlEl.getAttribute('data-unify')}"]`
                      : null,
                  });
                }
              }
            });

          // Remove nulls, deduplicate, and limit results
          return {
            url: window.location.href,
            title: document.title,
            buttons: result.buttons.filter((b) => b.selector).slice(0, 25),
            inputs: result.inputs.filter((i) => i.selector).slice(0, 15),
            checkboxes: result.checkboxes.filter((c) => c.selector).slice(0, 30),
            selects: result.selects.filter((s) => s.selector).slice(0, 10),
            links: result.links.filter((l) => l.selector).slice(0, 50), // Increased for product links
            clickableElements: result.clickableElements.filter((c) => c.selector).slice(0, 40),
          };
        });

        return reply.send(elements);
      } catch (error: any) {
        server.log.error({ err: error }, "Failed to get interactive elements");
        return reply.status(500).send({ error: error.message });
      }
    }
  );

  server.post(
    "/sessions/interact",
    {
      schema: {
        operationId: "interact_with_page",
        description: "Interact with page elements (click, type, navigate, go back)",
        tags: ["Sessions"],
        summary: "Interact with page elements",
      },
    },
    async (request: FastifyRequest<{
      Body: {
        action: 'click' | 'type' | 'navigate' | 'goBack' | 'select';
        selector?: string;
        text?: string;
        url?: string;
        value?: string;
      }
    }>, reply: FastifyReply) => {
      const { action, selector, text, url, value } = request.body;
      
      try {
        const page = await server.cdpService.getPrimaryPage();
        let result;
        
        switch(action) {
          case 'click':
            if (!selector) throw new Error('selector is required for click action');
            await page.click(selector);
            result = { success: true, action: 'clicked', selector };
            break;
            
          case 'type':
            if (!selector || !text) throw new Error('selector and text are required for type action');
            await page.type(selector, text, { delay: 50 });
            result = { success: true, action: 'typed', selector, text };
            break;
            
          case 'select':
            if (!selector || !value) throw new Error('selector and value are required for select action');
            await page.select(selector, value);
            result = { success: true, action: 'selected', selector, value };
            break;
            
          case 'navigate':
            if (!url) throw new Error('url is required for navigate action');
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            result = { success: true, action: 'navigated', url: page.url() };
            break;
            
          case 'goBack':
            await page.goBack({ waitUntil: 'domcontentloaded' });
            result = { success: true, action: 'went back', url: page.url() };
            break;
            
          default:
            throw new Error(`Unknown action: ${action}`);
        }
        
        return reply.send(result);
      } catch (error: any) {
        server.log.error({ err: error }, `Failed to ${action}`);
        return reply.status(500).send({ 
          success: false,
          error: error.message 
        });
      }
    }
  );
}

export default routes;
