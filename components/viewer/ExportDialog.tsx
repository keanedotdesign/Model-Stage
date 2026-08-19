"use client";

import { useState } from "react";
import { Box, Download, ImageDown, Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Segmented } from "./Segmented";
import { usePartsStore } from "./parts-store";
import { useSettingsStore } from "./settings";
import { useViewerStore } from "@/lib/store";
import { isVideoExportSupported } from "@/lib/video";
import { exportGlb, exportUsdz } from "@/lib/export-model";

export function ExportDialog() {
  const handles = useViewerStore((s) => s.handles);
  const status = useViewerStore((s) => s.status);
  const isRecording = useViewerStore((s) => s.isRecording);
  const recordProgress = useViewerStore((s) => s.recordProgress);
  const model = useViewerStore((s) => s.model);
  const edits = usePartsStore((s) => s.edits);
  const ready = status === "ready" && !!handles;

  const totalParts = model?.meshes.length ?? 0;
  const hiddenCount = Object.values(edits).filter((e) => e?.hidden).length;
  const includedParts = totalParts - hiddenCount;

  const [transparent, setTransparent] = useState(false);
  const [scale, setScale] = useState(2);
  const [savingPng, setSavingPng] = useState(false);

  const [duration, setDuration] = useState(6);
  const [fps, setFps] = useState(30);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [fullRotation, setFullRotation] = useState(true);
  const videoSupported = isVideoExportSupported();

  const [modelFormat, setModelFormat] = useState<"glb" | "usdz">("glb");
  const [savingModel, setSavingModel] = useState(false);

  const handlePng = async () => {
    if (!handles) return;
    setSavingPng(true);
    try {
      await handles.capturePng({ transparent, scale });
      toast.success("Image exported");
    } catch (error) {
      toast.error("Image export failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSavingPng(false);
    }
  };

  const handleVideo = async () => {
    if (!handles) return;
    try {
      await handles.captureVideo({ duration, fps, direction, fullRotation });
      toast.success("Video exported");
    } catch (error) {
      toast.error("Video export failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleModelExport = async () => {
    const current = useViewerStore.getState().model;
    if (!current) return;
    setSavingModel(true);
    try {
      const s = useSettingsStore.getState().settings;
      const material = {
        colorMode: s.colorMode,
        color: s.color,
        metalness: s.metalness,
        roughness: s.roughness,
        opacity: s.opacity,
        emissive: s.emissive,
        emissiveIntensity: s.emissiveIntensity,
      };
      const partEdits = usePartsStore.getState().edits;
      const name = useViewerStore.getState().fileName;
      const count =
        modelFormat === "glb"
          ? await exportGlb(current, partEdits, material, name)
          : await exportUsdz(current, partEdits, material, name);
      toast.success("Model exported", {
        description: `${count} part${count === 1 ? "" : "s"} · ${modelFormat.toUpperCase()}`,
      });
    } catch (error) {
      toast.error("Model export failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSavingModel(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger
        render={<Button size="sm" disabled={!ready} />}
      >
        <Download />
        Export
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
          <DialogDescription>
            Save the current view as an image or 360° video, or the edited model
            as a 3D file.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="image">
          <TabsList className="w-full">
            <TabsTrigger value="image">
              <ImageDown />
              Image
            </TabsTrigger>
            <TabsTrigger value="video">
              <Video />
              Video
            </TabsTrigger>
            <TabsTrigger value="model">
              <Box />
              3D
            </TabsTrigger>
          </TabsList>

          {/* Image */}
          <TabsContent value="image" className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="transparent">Transparent background</Label>
                <span className="text-xs text-muted-foreground">
                  Export a PNG with no background.
                </span>
              </div>
              <Switch
                id="transparent"
                checked={transparent}
                onCheckedChange={setTransparent}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <Label>Resolution</Label>
                <span className="text-xs text-muted-foreground">
                  Supersample the canvas for a crisper image.
                </span>
              </div>
              <Segmented
                value={scale}
                onChange={setScale}
                options={[
                  { label: "1×", value: 1 },
                  { label: "2×", value: 2 },
                  { label: "4×", value: 4 },
                ]}
              />
            </div>

            <Button onClick={handlePng} disabled={!ready || savingPng}>
              {savingPng ? <Loader2 className="animate-spin" /> : <ImageDown />}
              Export PNG
            </Button>
          </TabsContent>

          {/* Video */}
          <TabsContent value="video" className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Duration</Label>
                <span className="text-xs text-muted-foreground">
                  {duration}s
                </span>
              </div>
              <Slider
                value={[duration]}
                min={2}
                max={20}
                step={1}
                disabled={isRecording}
                onValueChange={(value) =>
                  setDuration(Array.isArray(value) ? value[0] : value)
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label>Frame rate</Label>
              <Segmented
                value={fps}
                onChange={setFps}
                disabled={isRecording}
                options={[
                  { label: "24", value: 24 },
                  { label: "30", value: 30 },
                  { label: "60", value: 60 },
                ]}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label>Direction</Label>
              <Segmented<1 | -1>
                value={direction}
                onChange={setDirection}
                disabled={isRecording}
                options={[
                  { label: "CCW", value: 1 },
                  { label: "CW", value: -1 },
                ]}
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2.5">
              <Checkbox
                className="mt-0.5"
                checked={fullRotation}
                disabled={isRecording}
                onCheckedChange={(v) => setFullRotation(v === true)}
              />
              <span className="flex flex-col">
                <span className="text-sm">Full 360° rotation</span>
                <span className="text-xs text-muted-foreground">
                  Rotation speed is set by the video duration.
                </span>
              </span>
            </label>

            <p className="text-xs text-muted-foreground">
              {fullRotation
                ? "Renders exactly one full turn using the current background and grid."
                : "Spins at the viewer's auto-rotate speed using the current background and grid."}
            </p>

            {isRecording && (
              <div className="flex flex-col gap-1.5">
                <Progress value={Math.round(recordProgress * 100)} />
                <span className="text-xs text-muted-foreground">
                  Recording… {Math.round(recordProgress * 100)}%
                </span>
              </div>
            )}

            {!videoSupported ? (
              <p className="text-xs text-destructive">
                Video export isn&apos;t supported in this browser.
              </p>
            ) : (
              <Button
                onClick={handleVideo}
                disabled={!ready || isRecording}
              >
                {isRecording ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Video />
                )}
                Render 360° video
              </Button>
            )}
          </TabsContent>

          {/* 3D model */}
          <TabsContent value="model" className="mt-4 flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Exports the model as you&apos;ve adjusted it — removed parts are
              excluded and per-part colors + materials are baked in.
            </p>

            <div className="flex items-center justify-between gap-4">
              <Label>Format</Label>
              <Segmented<"glb" | "usdz">
                value={modelFormat}
                onChange={setModelFormat}
                options={[
                  { label: "GLB", value: "glb" },
                  { label: "USDZ", value: "usdz" },
                ]}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <Label>Parts included</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {includedParts} / {totalParts}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              {modelFormat === "usdz"
                ? "USDZ opens in iOS / macOS AR Quick Look."
                : "GLB works with most 3D tools, engines, and web viewers."}
            </p>

            <Button onClick={handleModelExport} disabled={!model || savingModel}>
              {savingModel ? <Loader2 className="animate-spin" /> : <Box />}
              Export {modelFormat.toUpperCase()}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
