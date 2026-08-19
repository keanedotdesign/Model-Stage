"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useViewerStore } from "@/lib/store";
import { parseStep, warmupOcct } from "@/lib/occt";
import { parseUsdz } from "@/lib/load-usdz";
import { Viewer } from "./Viewer";
import { Toolbar } from "./Toolbar";
import { ControlsPanel } from "./ControlsPanel";
import { useSettingsStore } from "./settings";

const SAMPLE_URL = "/samples/persiana.step";
const SAMPLE_NAME = "Persiana.STEP";
const MODEL_PATTERN = /\.(step|stp|usdz)$/i;
const USDZ_PATTERN = /\.usdz$/i;

export function StepViewerApp() {
  const reset = useSettingsStore((s) => s.reset);
  const status = useViewerStore((s) => s.status);
  const error = useViewerStore((s) => s.error);
  const setLoading = useViewerStore((s) => s.setLoading);
  const setModel = useViewerStore((s) => s.setModel);
  const setError = useViewerStore((s) => s.setError);

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
        const model = USDZ_PATTERN.test(name)
          ? await parseUsdz(buffer)
          : await parseStep(buffer);
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
    [setLoading, setModel, setError],
  );

  const onFile = useCallback(
    (file: File) => {
      if (!MODEL_PATTERN.test(file.name)) {
        toast.error("Unsupported file", {
          description: "Please choose a .step, .stp, or .usdz file.",
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
                Parsing STEP model…
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
                Drop a .step or .usdz file to load
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
            <span className="font-medium text-foreground">.step</span> or{" "}
            <span className="font-medium text-foreground">.usdz</span> file
            anywhere on the canvas to load your own model.
          </p>
        </aside>
      </div>
    </div>
  );
}
