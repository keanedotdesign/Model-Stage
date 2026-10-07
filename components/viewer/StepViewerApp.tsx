"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useViewerStore } from "@/lib/store";
import { parseStep, warmupOcct } from "@/lib/occt";
import { parseUsdz } from "@/lib/load-usdz";
import { parseFbx } from "@/lib/load-fbx";
import { parseDwg } from "@/lib/load-dwg";
import { Viewer } from "./Viewer";
import { Toolbar } from "./Toolbar";
import { ControlsPanel } from "./ControlsPanel";
import { useSettingsStore } from "./settings";
import { useHistoryStore } from "./history-store";

const SAMPLE_URL = "/samples/persiana.step";
const SAMPLE_NAME = "Persiana.STEP";
const MODEL_PATTERN = /\.(step|stp|usdz|fbx|dwg)$/i;
const STEP_PATTERN = /\.(step|stp)$/i;
const USDZ_PATTERN = /\.usdz$/i;
const DWG_PATTERN = /\.dwg$/i;

export function StepViewerApp() {
  const reset = useSettingsStore((s) => s.reset);
  const status = useViewerStore((s) => s.status);
  const error = useViewerStore((s) => s.error);
  const setLoading = useViewerStore((s) => s.setLoading);
  const setModel = useViewerStore((s) => s.setModel);
  const setError = useViewerStore((s) => s.setError);
  const setSource = useViewerStore((s) => s.setSource);
  const quality = useViewerStore((s) => s.quality);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dragging, setDragging] = useState(false);

  const load = useCallback(
    async (input: File | { url: string; name: string }) => {
      const name = input instanceof File ? input.name : input.name;
      setLoading(name);
      try {
        // Let the loading overlay paint before the (blocking) wasm parse.
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const buffer =
          input instanceof File
            ? await input.arrayBuffer()
            : await (await fetch(input.url)).arrayBuffer();
        const isStep = STEP_PATTERN.test(name);
        let model;
        if (isStep) {
          model = await parseStep(buffer, useViewerStore.getState().quality);
        } else if (USDZ_PATTERN.test(name)) {
          model = await parseUsdz(buffer);
        } else if (DWG_PATTERN.test(name)) {
          model = await parseDwg(buffer);
        } else {
          model = await parseFbx(buffer);
        }
        // Retain STEP bytes so a mesh-quality change can re-tessellate them.
        // Mesh formats (USDZ/FBX/DWG) aren't tessellated, so nothing to keep.
        setSource(isStep ? { buffer, name } : null);
        setModel(model, name);
        toast.success(`Loaded ${name}`, {
          description: `${model.meshes.length} part${model.meshes.length === 1 ? "" : "s"}`,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        toast.error("Could not load file", { description: message });
      }
    },
    [setLoading, setModel, setError, setSource],
  );

  // Re-tessellate the retained STEP file whenever mesh quality changes.
  const firstQuality = useRef(true);
  useEffect(() => {
    if (firstQuality.current) {
      firstQuality.current = false;
      return;
    }
    const source = useViewerStore.getState().source;
    if (!source) return;
    let cancelled = false;
    void (async () => {
      setLoading(source.name);
      try {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        const model = await parseStep(source.buffer, quality);
        if (!cancelled) setModel(model, source.name);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(message);
        toast.error("Could not re-tessellate model", { description: message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quality, setLoading, setModel, setError]);

  const onFile = useCallback(
    (file: File) => {
      if (!MODEL_PATTERN.test(file.name)) {
        toast.error("Unsupported file", {
          description: "Please choose a .step, .stp, .usdz, .fbx, or .dwg file.",
        });
        return;
      }
      void load(file);
    },
    [load],
  );

  // Load the sample model once on first mount.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    warmupOcct();
    void load({ url: SAMPLE_URL, name: SAMPLE_NAME });
  }, [load]);

  // Undo / redo keyboard shortcuts: ⌘Z / Ctrl+Z, and ⌘⇧Z / Ctrl+Y.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      const isRedo = (key === "z" && e.shiftKey) || key === "y";
      const isUndo = key === "z" && !e.shiftKey;
      if (!isUndo && !isRedo) return;
      e.preventDefault();
      const history = useHistoryStore.getState();
      if (isRedo) history.redo();
      else history.undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <Toolbar
        onFile={onFile}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex min-h-0 flex-1">
        <main
          className="relative min-w-0 flex-1"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <Viewer />

          {status === "loading" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 rounded-lg bg-card/90 px-4 py-2.5 text-sm shadow-lg ring-1 ring-border">
                <Loader2 className="size-4 animate-spin text-primary" />
                Parsing model…
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div className="pointer-events-auto flex max-w-sm flex-col items-center gap-2 rounded-xl bg-card/90 p-6 text-center shadow-lg ring-1 ring-border">
                <AlertTriangle className="size-6 text-destructive" />
                <p className="text-sm font-medium">Couldn&apos;t open model</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

          {dragging && (
            <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/60 bg-primary/5">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <MousePointerClick className="size-4" />
                Drop a .step, .usdz, .fbx, or .dwg file to load
              </div>
            </div>
          )}
        </main>

        <aside
          className={
            sidebarOpen
              ? "flex w-80 shrink-0 flex-col border-l border-border/60 bg-card/40"
              : "hidden"
          }
        >
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs font-semibold text-muted-foreground">
              Controls
            </span>
            <Button variant="ghost" size="xs" onClick={reset}>
              Reset all
            </Button>
          </div>
          <Separator />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ControlsPanel />
          </div>
          <Separator />
          <p className="px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
            Drag to orbit · scroll to zoom · right-drag to pan. Drop a{" "}
            <span className="font-medium text-foreground">.step</span>,{" "}
            <span className="font-medium text-foreground">.usdz</span>,{" "}
            <span className="font-medium text-foreground">.fbx</span>, or{" "}
            <span className="font-medium text-foreground">.dwg</span> file
            anywhere on the canvas to load your own model.
          </p>
        </aside>
      </div>
    </div>
  );
}
