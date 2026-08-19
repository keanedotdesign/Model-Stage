"use client";

import { useRef } from "react";
import {
  Boxes,
  ChevronDown,
  Maximize2,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useViewerStore } from "@/lib/store";
import type { ViewDirection } from "@/lib/types";
import { ExportDialog } from "./ExportDialog";

const VIEWS: { label: string; value: ViewDirection }[] = [
  { label: "Isometric", value: "iso" },
  { label: "Front", value: "front" },
  { label: "Back", value: "back" },
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
  { label: "Top", value: "top" },
  { label: "Bottom", value: "bottom" },
];

export function Toolbar({
  onFile,
  onToggleSidebar,
  sidebarOpen,
}: {
  onFile: (file: File) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handles = useViewerStore((s) => s.handles);
  const fileName = useViewerStore((s) => s.fileName);
  const partCount = useViewerStore((s) => s.partCount);
  const status = useViewerStore((s) => s.status);
  const ready = status === "ready";

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 bg-card/60 px-3 backdrop-blur">
      <div className="flex items-center gap-2 pr-1">
        <Boxes className="size-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight">
          Model Stage
        </span>
      </div>

      {fileName && (
        <Badge variant="secondary" className="max-w-[220px] gap-1.5 font-normal">
          <span className="truncate">{fileName}</span>
          {ready && (
            <span className="text-muted-foreground">· {partCount} parts</span>
          )}
        </Badge>
      )}

      <div className="flex-1" />

      <input
        ref={inputRef}
        type="file"
        accept=".step,.stp,.usdz,.STEP,.STP,.USDZ"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        <Upload />
        Open model
      </Button>

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" disabled={!ready} />
          }
        >
          View
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {VIEWS.map((view) => (
            <DropdownMenuItem
              key={view.value}
              onClick={() => handles?.frameView(view.value)}
            >
              {view.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!ready}
              onClick={() => handles?.fitView()}
            />
          }
        >
          <Maximize2 />
        </TooltipTrigger>
        <TooltipContent>Fit to view</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={!ready}
              onClick={() => handles?.resetView()}
            />
          }
        >
          <RotateCcw />
        </TooltipTrigger>
        <TooltipContent>Reset view</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      <ExportDialog />

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleSidebar}
            />
          }
        >
          {sidebarOpen ? <PanelRightClose /> : <PanelRightOpen />}
        </TooltipTrigger>
        <TooltipContent>
          {sidebarOpen ? "Hide controls" : "Show controls"}
        </TooltipContent>
      </Tooltip>
    </header>
  );
}
