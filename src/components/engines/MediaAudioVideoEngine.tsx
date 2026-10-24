"use client";

/**
 * The engine of the media tools.
 *
 * The work lives in ./media: the converters do the real decoding, encoding
 * and recording, the workspace renders the controls. This file only hands
 * the slug of the tool to the workspace.
 */

import { MediaConverterWorkspace } from "./media/MediaConverterWorkspace";

interface MediaAudioVideoEngineProps {
  slug: string;
}

export function MediaAudioVideoEngine({ slug }: MediaAudioVideoEngineProps) {
  return <MediaConverterWorkspace slug={slug} />;
}
