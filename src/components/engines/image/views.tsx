"use client";

/**
 * The workspaces of the image suite.
 *
 * Every tool of the suite has its own entry in this map. There is no generic
 * editor behind the map: a tool that needs a brush gets a brush, a tool that
 * needs a grid gets a grid and a tool that needs a text field gets a text
 * field.
 */

import React from "react";
import { BasicImageView, type OutputFormat } from "./basic";
import {
  PixelateView,
  RegionEditorView,
  SplitView,
  type RegionEffect,
  type RegionMode,
} from "./editors";
import {
  FaviconGeneratorView,
  GifFromPictureView,
  GifToMp4View,
  IcoView,
  VideoToGifView,
} from "./media";
import { CodeView, LatexView, OgImageView, QuoteView } from "./creators";
import {
  DataMatrixView,
  IconPickerView,
  SvgToCssView,
  SvgViewerView,
} from "./svgTools";
import {
  GiftExchangeView,
  GiftTrackerView,
  InstagramFontsView,
  OgCheckerView,
  SocialPreviewView,
  WordMetadataView,
  YoutubeThumbnailView,
} from "./lists";
import { AiView, HeicView, PsdView, TiffView } from "./decoders";
import { useImageT } from "./kit";

export type ImageView = React.ComponentType;

/* ------------------------------------------------------------- the views -- */

function ConverterView({ defaultFormat }: { defaultFormat: OutputFormat }) {
  const t = useImageT();
  return (
    <BasicImageView
      title={t("convertTitle")}
      subtitle={t("convertSubtitle")}
      defaultFormat={defaultFormat}
      dimensions
      note={t("convertNote")}
    />
  );
}

function ResizeView() {
  const t = useImageT();
  return (
    <BasicImageView
      title={t("resizeTitle")}
      subtitle={t("resizeSubtitle")}
      dimensions
      defaultFormat="image/png"
      note={t("resizeNote")}
    />
  );
}

function BlurView() {
  const t = useImageT();
  return (
    <BasicImageView
      title={t("blurTitle")}
      subtitle={t("blurSubtitle")}
      dimensions
      filters
      defaultFormat="image/png"
      note={t("blurNote")}
    />
  );
}

function BackgroundView() {
  const t = useImageT();
  return (
    <BasicImageView
      title={t("backgroundTitle")}
      subtitle={t("backgroundSubtitle")}
      background
      defaultFormat="image/png"
      note={t("backgroundNote")}
    />
  );
}

function MetadataRemoverView() {
  const t = useImageT();
  return (
    <BasicImageView
      title={t("metadataRemoveTitle")}
      subtitle={t("metadataRemoveSubtitle")}
      defaultFormat="image/jpeg"
      note={t("metadataRemoveNote")}
    />
  );
}

function MetadataViewerView() {
  const t = useImageT();
  return (
    <BasicImageView
      title={t("metadataViewTitle")}
      subtitle={t("metadataViewSubtitle")}
      defaultFormat="image/png"
      metadata
      note={t("metadataViewNote")}
    />
  );
}

function IcoConverterView({ accept }: { accept: string }) {
  const t = useImageT();
  return (
    <IcoView
      title={t("icoTitle")}
      subtitle={t("icoSubtitle")}
      accept={accept}
      note={t("icoNote")}
    />
  );
}

/** A region tool: mark a region and change it. */
function makeRegionTool(
  effect: RegionEffect,
  modes: RegionMode[],
  regionKey: "censorRegion" | "faceRegions" | "textRegion" | "objectRegion" | "eraserRegion",
  noteKey: "censorNote" | "faceNote" | "textRegionNote" | "eraseNote" | "magicEraserNote",
) {
  return function RegionTool() {
    const t = useImageT();
    return (
      <RegionEditorView
        title={t("regionTitle")}
        subtitle={t("regionSubtitle")}
        effect={effect}
        modes={modes}
        regionLabel={t(regionKey)}
        note={t(noteKey)}
      />
    );
  };
}

const CensorImageTool = makeRegionTool(
  "censor",
  ["rect", "ellipse", "brush"],
  "censorRegion",
  "censorNote",
);
const BlurTextTool = makeRegionTool(
  "blur",
  ["rect", "ellipse", "brush"],
  "textRegion",
  "textRegionNote",
);
const RemoveTextTool = makeRegionTool(
  "erase",
  ["brush", "rect"],
  "textRegion",
  "eraseNote",
);
const RemoveObjectTool = makeRegionTool(
  "erase",
  ["brush", "rect"],
  "objectRegion",
  "eraseNote",
);
const MagicEraserTool = makeRegionTool(
  "erase",
  ["brush"],
  "eraserRegion",
  "magicEraserNote",
);

function FaceView({ effect }: { effect: "blur" | "censor" | "pixelate" }) {
  const t = useImageT();
  return (
    <RegionEditorView
      title={t("faceTitle")}
      subtitle={t("faceSubtitle")}
      effect={effect}
      modes={["rect", "brush"]}
      regionLabel={t("faceRegions")}
      note={t("faceNote")}
    />
  );
}

function InstagramSplitView() {
  const t = useImageT();
  return (
    <SplitView
      title={t("instagramSplitTitle")}
      subtitle={t("instagramSplitSubtitle")}
    />
  );
}

function QuoteCardView() {
  const t = useImageT();
  return <QuoteView title={t("quoteTitle")} subtitle={t("quoteSubtitle")} />;
}

function ShareCardView() {
  const t = useImageT();
  return <OgImageView title={t("ogCardTitle")} subtitle={t("ogCardSubtitle")} />;
}

function OgCheckerTool() {
  const t = useImageT();
  return (
    <OgCheckerView
      title={t("ogCheckerTitle")}
      subtitle={t("ogCheckerSubtitle")}
      note={t("ogCheckerNote")}
    />
  );
}

function YoutubeTool() {
  const t = useImageT();
  return (
    <YoutubeThumbnailView
      title={t("youtubeTitle")}
      subtitle={t("youtubeSubtitle")}
      note={t("youtubeNote")}
    />
  );
}

function PsdTool({ jpeg }: { jpeg: boolean }) {
  const t = useImageT();
  return (
    <PsdView
      title={t("psdTitle")}
      subtitle={jpeg ? t("psdSubtitleJpeg") : t("psdSubtitlePng")}
    />
  );
}

function TiffTool() {
  const t = useImageT();
  return <TiffView title={t("tiffTitle")} subtitle={t("tiffSubtitle")} />;
}

function IconTool({ mode }: { mode: "png" | "svg" }) {
  const t = useImageT();
  return (
    <IconPickerView
      title={mode === "svg" ? t("svgFaviconTitle") : t("faviconMakerTitle")}
      subtitle={mode === "svg" ? t("svgFaviconSubtitle") : t("faviconMakerSubtitle")}
      mode={mode}
    />
  );
}

function WebpGifTool() {
  const t = useImageT();
  return (
    <GifFromPictureView
      title={t("webpGifTitle")}
      subtitle={t("webpGifSubtitle")}
      note={t("gifNote")}
      frames={6}
    />
  );
}

/* ---------------------------------------------------------------- the map -- */

export const VIEW_BY_SLUG: Record<string, ImageView> = {
  /* ---- format conversion ---- */
  "png-to-webp-converter": () => <ConverterView defaultFormat="image/webp" />,
  "jpg-to-png-converter": () => <ConverterView defaultFormat="image/png" />,
  "png-to-jpg-converter": () => <ConverterView defaultFormat="image/jpeg" />,
  "jpg-to-webp-converter": () => <ConverterView defaultFormat="image/webp" />,
  "webp-to-png-converter": () => <ConverterView defaultFormat="image/png" />,
  "webp-to-jpg-converter": () => <ConverterView defaultFormat="image/jpeg" />,
  "webp-converter": () => <ConverterView defaultFormat="image/webp" />,
  "bmp-to-jpg": () => <ConverterView defaultFormat="image/jpeg" />,
  "gif-to-png": () => <ConverterView defaultFormat="image/png" />,
  "jfif-to-jpg": () => <ConverterView defaultFormat="image/jpeg" />,
  "ico-to-png": () => <ConverterView defaultFormat="image/png" />,
  "svg-to-png": () => <ConverterView defaultFormat="image/png" />,
  "svg-to-jpg": () => <ConverterView defaultFormat="image/jpeg" />,
  "avif-to-png": () => <ConverterView defaultFormat="image/png" />,
  "avif-to-jpg": () => <ConverterView defaultFormat="image/jpeg" />,

  /* ---- resize ---- */
  "image-resizer": () => <ResizeView />,
  "photo-resizer": () => <ResizeView />,
  "resize-png": () => <ResizeView />,

  /* ---- filters ---- */
  "blur-image": () => <BlurView />,
  "pixelate-image": () => <PixelateView />,
  "censor-image": () => <CensorImageTool />,

  /* ---- background ---- */
  "background-remover": () => <BackgroundView />,
  "png-background-remover": () => <BackgroundView />,
  "transparent-background-maker": () => <BackgroundView />,

  /* ---- metadata ---- */
  "exif-remover": () => <MetadataRemoverView />,
  "photo-metadata-remover": () => <MetadataRemoverView />,
  "remove-photo-location": () => <MetadataRemoverView />,
  "exif-viewer": () => <MetadataViewerView />,
  "photo-metadata-viewer": () => <MetadataViewerView />,
  "image-metadata-viewer": () => <MetadataViewerView />,

  /* ---- formats the browser cannot open ---- */
  "psd-to-png": () => <PsdTool jpeg={false} />,
  "psd-to-jpg": () => <PsdTool jpeg={true} />,
  "tiff-to-jpg": () => <TiffTool />,
  "heic-to-jpg-converter": () => <HeicView />,
  "ai-to-png": () => <AiView />,

  /* ---- icons ---- */
  "jpg-to-ico": () => <IcoConverterView accept="image/jpeg" />,
  "png-to-ico": () => <IcoConverterView accept="image/png" />,
  "svg-to-ico": () => <IcoConverterView accept="image/svg+xml" />,
  "webp-to-ico": () => <IcoConverterView accept="image/webp" />,
  "ico-converter": () => <IcoConverterView accept="image/*" />,
  "favicon-generator": () => <FaviconGeneratorView />,
  "favicon-maker": () => <IconTool mode="png" />,
  "svg-favicon-generator": () => <IconTool mode="svg" />,

  /* ---- animation and video ---- */
  "gif-to-mp4": () => <GifToMp4View />,
  "webp-to-gif": () => <WebpGifTool />,
  "video-to-gif": () => <VideoToGifView />,

  /* ---- faces, regions and brushes ---- */
  "blur-face": () => <FaceView effect="blur" />,
  "censor-face": () => <FaceView effect="censor" />,
  "face-pixelator": () => <FaceView effect="pixelate" />,
  "blur-text-in-image": () => <BlurTextTool />,
  "remove-text-from-image": () => <RemoveTextTool />,
  "remove-object-from-photo": () => <RemoveObjectTool />,
  "magic-eraser": () => <MagicEraserTool />,

  /* ---- instagram ---- */
  "instagram-image-splitter": () => <InstagramSplitView />,
  "instagram-grid-maker": () => <InstagramSplitView />,
  "instagram-photo-splitter": () => <InstagramSplitView />,
  "instagram-fonts": () => <InstagramFontsView />,

  /* ---- pictures that are drawn ---- */
  "quote-maker": () => <QuoteCardView />,
  "quote-image-generator": () => <QuoteCardView />,
  "quote-image-maker": () => <QuoteCardView />,
  "code-to-image": () => <CodeView />,
  "latex-to-image": () => <LatexView />,
  "data-matrix-generator": () => <DataMatrixView />,
  "og-image-generator": () => <ShareCardView />,
  "og-image-maker": () => <ShareCardView />,
  "open-graph-image-generator": () => <ShareCardView />,

  /* ---- svg source ---- */
  "svg-viewer": () => <SvgViewerView />,
  "svg-to-css": () => <SvgToCssView />,

  /* ---- links ---- */
  "open-graph-checker": () => <OgCheckerTool />,
  "open-graph-preview": () => <OgCheckerTool />,
  "social-media-preview": () => <SocialPreviewView />,
  "youtube-thumbnail-downloader": () => <YoutubeTool />,
  "youtube-thumbnail-grabber": () => <YoutubeTool />,

  /* ---- lists and documents ---- */
  "christmas-gift-tracker": () => <GiftTrackerView />,
  "gift-exchange-generator": () => <GiftExchangeView />,
  "remove-metadata-from-word": () => <WordMetadataView />,
};
