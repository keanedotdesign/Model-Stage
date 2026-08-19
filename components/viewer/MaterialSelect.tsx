"use client";

import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MATERIAL_PRESETS,
  matchMaterial,
  type MaterialProps,
} from "./material-presets";

function Swatch({ color }: { color: string }) {
  return (
    <span
      className="size-3 shrink-0 rounded-sm ring-1 ring-border ring-inset"
      style={{ backgroundColor: color }}
    />
  );
}

export function MaterialSelect({
  current,
  onApply,
}: {
  current: MaterialProps;
  onApply: (material: MaterialProps) => void;
}) {
  const matched = matchMaterial(current);
  const label = matched?.name ?? "Custom";
  const topLevel = MATERIAL_PRESETS.filter((p) => !p.group);
  const painted = MATERIAL_PRESETS.filter((p) => p.group === "Painted");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex h-7 min-w-0 items-center gap-1.5 rounded-md border border-input bg-input/30 px-1.5 text-xs transition-colors hover:bg-input/50"
          />
        }
      >
        <Swatch color={current.color} />
        <span className="max-w-[92px] truncate text-muted-foreground">
          {label}
        </span>
        <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {topLevel.map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onClick={() => onApply(preset.material)}
          >
            <Swatch color={preset.swatch ?? preset.material.color} />
            {preset.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Painted</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            {painted.map((preset) => (
              <DropdownMenuItem
                key={preset.name}
                onClick={() => onApply(preset.material)}
              >
                <Swatch color={preset.swatch ?? preset.material.color} />
                {preset.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
