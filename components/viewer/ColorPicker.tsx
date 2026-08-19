"use client";

import { HexColorInput, HexColorPicker } from "react-colorful";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const NEUTRAL_SWATCHES = [
  "#ffffff",
  "#c8c8c8",
  "#888888",
  "#444444",
  "#191919",
  "#000000",
];

export function ColorPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Pick a color"
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-md border border-input bg-input/30 px-1.5 transition-colors hover:bg-input/50",
              className,
            )}
          />
        }
      >
        <span
          className="size-4 rounded-sm ring-1 ring-border ring-inset"
          style={{ backgroundColor: value }}
        />
        <span className="max-w-[110px] truncate font-mono text-xs text-muted-foreground">
          {value}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto gap-3">
        <HexColorPicker color={value} onChange={onChange} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Hex</span>
          <HexColorInput
            prefixed
            color={value}
            onChange={onChange}
            className="h-7 w-full rounded-md border border-input bg-input/30 px-2 font-mono text-xs text-foreground outline-none focus:border-ring"
          />
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {NEUTRAL_SWATCHES.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={hex}
              onClick={() => onChange(hex)}
              className={cn(
                "size-6 rounded ring-inset transition-transform hover:scale-110",
                value.toLowerCase() === hex ? "ring-2 ring-sky-400" : "ring-1 ring-border",
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
