import { put } from "@vercel/blob";

const namespace = process.env.HANDBOOK_NAMESPACE || "default";

export async function putTranscript(
  entryId: string,
  transcript: string,
): Promise<string> {
  const pathname = `${namespace}/transcripts/${entryId}.txt`;
  const blob = await put(pathname, transcript, {
    access: "public",
    contentType: "text/plain; charset=utf-8",
    addRandomSuffix: true,
  });
  return blob.url;
}
