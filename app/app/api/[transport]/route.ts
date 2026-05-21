import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { SERVER_INSTRUCTIONS } from "@/lib/instructions";
import { saveToHandbook } from "@/lib/tools/save_to_handbook";
import { searchHandbook } from "@/lib/tools/search_handbook";
import { getHandbookEntry } from "@/lib/tools/get_entry";
import { listHandbookEntries } from "@/lib/tools/list_entries";

export const dynamic = "force-dynamic";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "save_to_handbook",
      {
        title: "Save to Handbook",
        description:
          "Save a user-confirmed reasoning entry to the Handbook. Only call after the user has articulated a judgment call and explicitly confirmed they want it saved. The transcript field is optional: include it only if the user gave a separate second consent to save the full conversation. When included, the transcript must be verbatim and complete. Returns the entry, the transcript URL when applicable, and the markdown rendering.",
        inputSchema: {
          decision: z
            .string()
            .min(1)
            .describe("Short title of the decision, in the user's framing"),
          filing_year: z
            .string()
            .regex(/^\d{4}$/)
            .describe("4-digit tax year the user is filing for"),
          rationale: z
            .string()
            .min(1)
            .describe("The why, in the user's words, lifted verbatim where possible"),
          alternatives: z
            .string()
            .optional()
            .describe(
              "What was weighed and rejected, in the user's words. Empty if no alternatives were weighed.",
            ),
          sources: z
            .array(z.string())
            .optional()
            .describe("Sources the user actually cited (IRS pubs, regs, conversations)"),
          transcript: z
            .string()
            .optional()
            .describe(
              "Full conversation verbatim. Only include if the user gave a separate second consent. Never summarize or partial.",
            ),
        },
      },
      async (args) => {
        const result = await saveToHandbook({
          decision: args.decision,
          filing_year: args.filing_year,
          rationale: args.rationale,
          alternatives: args.alternatives ?? "",
          sources: args.sources ?? [],
          transcript: args.transcript,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  entry: result.entry,
                  transcript_url: result.transcript_url,
                  markdown: result.markdown,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    server.registerTool(
      "search_handbook",
      {
        title: "Search Handbook",
        description:
          "Search for prior Handbook entries relevant to a current decision. Use only when the user explicitly references the Handbook (\"did I do this last year?\", \"what did I decide about X?\"). Returns matching entries with their full content.",
        inputSchema: {
          query: z
            .string()
            .min(1)
            .describe("Natural-language description of what the user just asked about"),
        },
      },
      async ({ query }) => {
        const entries = await searchHandbook(query);
        return {
          content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
        };
      },
    );

    server.registerTool(
      "get_entry",
      {
        title: "Get Handbook entry",
        description:
          "Fetch a full Handbook entry by id. Use when an entry id is already known (e.g., from a prior search result) and full content is needed.",
        inputSchema: {
          id: z.string().min(1).describe("Entry id (uuid)"),
        },
      },
      async ({ id }) => {
        const entry = await getHandbookEntry(id);
        return {
          content: [
            {
              type: "text",
              text: entry ? JSON.stringify(entry, null, 2) : "Entry not found",
            },
          ],
        };
      },
    );

    server.registerTool(
      "list_entries",
      {
        title: "List Handbook entries",
        description:
          "List all entries in the Handbook ordered by most recently saved first. Use when the user wants to browse what they've saved.",
        inputSchema: {},
      },
      async () => {
        const entries = await listHandbookEntries();
        return {
          content: [{ type: "text", text: JSON.stringify(entries, null, 2) }],
        };
      },
    );
  },
  { instructions: SERVER_INSTRUCTIONS },
  { basePath: "/api", maxDuration: 60, verboseLogs: false },
);

export { handler as GET, handler as POST };
