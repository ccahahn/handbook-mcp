"use client";

import { use } from "react";
import { TranscriptClient } from "@/components/TranscriptClient";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <TranscriptClient id={id} />;
}
