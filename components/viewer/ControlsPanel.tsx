"use client";

import type { ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "./Segmented";
import { ColorPicker } from "./ColorPicker";
import { MaterialSelect } from "./MaterialSelect";
import type { MaterialProps } from "./material-presets";
import { useSettingsStore, type ViewerSettings } from "./settings";
import { SCENE_PRESETS, matchScene } from "./scene-presets";
import { useCameraStore, type CameraPose } from "./camera-store";
import { modeFromModifiers, useSelectionStore } from "./selection-store";
import {
  usePartsStore,
  type PartEdit,
  type PartMaterialPatch,
} from "./parts-store";
import { useViewerStore } from "@/lib/store";
import type { ParsedModel } from "@/lib/types";
import { cn } from "@/lib/utils";

function rgbToHex(rgb: [number, number, number]): string {
  return (
    "#" +
    rgb
      .map((c) =>
        Math.round(Math.max(0, Math.min(1, c)) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function partHex(
  model: ParsedModel,
  settings: ViewerSettings,
  edits: Record<number, PartEdit>,
  i: number,
): string {
  const override = edits[i]?.color;
  if (override) return override;
  const mesh = model.meshes[i];
  if (settings.colorMode === "original" && mesh.color) {
    return rgbToHex(mesh.color);
  }
  return settings.color;
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function LinkButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] text-sky-400 hover:text-sky-300"
    >
      {children}
    </button>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-normal">{label}</Label>
        <span className="font-mono text-xs text-muted-foreground">
          {format(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs font-normal">{label}</Label>
      <ColorPicker value={value} onChange={onChange} />
    </div>
  );
}

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);
const fdeg = (v: number) => `${v.toFixed(0)}°`;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

function PartsSection() {
  const model = useViewerStore((state) => state.model);
  const settings = useSettingsStore((state) => state.settings);
  const selected = useSelectionStore((state) => state.selected);
  const hovered = useSelectionStore((state) => state.hovered);
  const select = useSelectionStore((state) => state.select);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const clear = useSelectionStore((state) => state.clear);
  const hover = useSelectionStore((state) => state.hover);
  const edits = usePartsStore((state) => state.edits);
  const setHidden = usePartsStore((state) => state.setHidden);
  const showAll = usePartsStore((state) => state.showAll);

  if (!model || model.meshes.length === 0) return null;

  const anyHidden = Object.values(edits).some((e) => e?.hidden);
  const allSelected = selected.length === model.meshes.length;

  return (
    <Section
      title={`Parts (${model.meshes.length})`}
      action={
        <div className="flex items-center gap-2.5">
          {anyHidden && <LinkButton onClick={showAll}>Show all</LinkButton>}
          <LinkButton
            onClick={() =>
              allSelected ? clear() : selectAll(model.meshes.length)
            }
          >
            {allSelected ? "Clear" : "Select all"}
          </LinkButton>
        </div>
      }
    >
      <div className="-mx-1 flex max-h-60 flex-col gap-0.5 overflow-y-auto pr-0.5">
        {model.meshes.map((mesh, i) => {
          const isSelected = selected.includes(i);
          const isHovered = hovered === i;
          const hidden = edits[i]?.hidden ?? false;
          return (
            <div
              key={i}
              onPointerEnter={() => hover(i)}
              onPointerLeave={() => hover(null)}
              className={cn(
                "flex items-center gap-1.5 rounded-md pr-1 text-xs transition-colors",
                isSelected
                  ? "bg-sky-500/15 text-foreground ring-1 ring-sky-500/40"
                  : isHovered
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <button
                type="button"
                onClick={(e) =>
                  select(i, modeFromModifiers(e.shiftKey, e.metaKey, e.ctrlKey))
                }
                className="flex min-w-0 flex-1 items-center gap-2 py-1 pl-2 text-left"
              >
                <span
                  className="size-2.5 shrink-0 rounded-sm ring-1 ring-border ring-inset"
                  style={{ backgroundColor: partHex(model, settings, edits, i) }}
                />
                <span
                  className={cn("truncate", hidden && "line-through opacity-50")}
                >
                  {mesh.name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setHidden(i, !hidden)}
                aria-label={hidden ? "Show part" : "Hide part"}
                className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {hidden ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function MaterialSection() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const model = useViewerStore((s) => s.model);
  const selected = useSelectionStore((s) => s.selected);
  const edits = usePartsStore((s) => s.edits);
  const setColor = usePartsStore((s) => s.setColor);
  const setMaterial = usePartsStore((s) => s.setMaterial);
  const resetPart = usePartsStore((s) => s.resetPart);

  const parts = model
    ? selected.filter((i) => i < model.meshes.length)
    : [];
  const isGlobal = parts.length === 0;
  const primary = parts[0];
  const primaryEdit = isGlobal ? undefined : edits[primary];

  const title = isGlobal
    ? "Global material"
    : parts.length === 1
      ? model!.meshes[primary].name
      : `${parts.length} parts`;

  const colorValue = isGlobal
    ? settings.color
    : partHex(model!, settings, edits, primary);
  const metalness = isGlobal
    ? settings.metalness
    : primaryEdit?.metalness ?? settings.metalness;
  const roughness = isGlobal
    ? settings.roughness
    : primaryEdit?.roughness ?? settings.roughness;
  const opacity = isGlobal
    ? settings.opacity
    : primaryEdit?.opacity ?? settings.opacity;
  const emissive = isGlobal
    ? settings.emissive
    : primaryEdit?.emissive ?? settings.emissive;
  const emissiveIntensity = isGlobal
    ? settings.emissiveIntensity
    : primaryEdit?.emissiveIntensity ?? settings.emissiveIntensity;
  const castLight = isGlobal
    ? settings.castLight
    : primaryEdit?.castLight ?? settings.castLight;
  const lightStrength = isGlobal
    ? settings.lightStrength
    : primaryEdit?.lightStrength ?? settings.lightStrength;

  const eachPart = (patch: PartMaterialPatch) =>
    parts.forEach((p) => setMaterial(p, patch));

  const onColor = isGlobal
    ? (hex: string) => update({ color: hex, colorMode: "custom" })
    : (hex: string) => parts.forEach((p) => setColor(p, hex));
  const onMetalness = isGlobal
    ? (v: number) => update({ metalness: v })
    : (v: number) => eachPart({ metalness: v });
  const onRoughness = isGlobal
    ? (v: number) => update({ roughness: v })
    : (v: number) => eachPart({ roughness: v });
  const onOpacity = isGlobal
    ? (v: number) => update({ opacity: v })
    : (v: number) => eachPart({ opacity: v });
  const onEmissive = isGlobal
    ? (hex: string) => update({ emissive: hex })
    : (hex: string) => eachPart({ emissive: hex });
  const onEmissiveIntensity = isGlobal
    ? (v: number) => update({ emissiveIntensity: v })
    : (v: number) => eachPart({ emissiveIntensity: v });
  const onCastLight = isGlobal
    ? (v: boolean) => update({ castLight: v })
    : (v: boolean) => eachPart({ castLight: v });
  const onLightStrength = isGlobal
    ? (v: number) => update({ lightStrength: v })
    : (v: number) => eachPart({ lightStrength: v });

  const hasOverrides =
    !isGlobal &&
    parts.some((p) => {
      const e = edits[p];
      return !!(
        e?.color ||
        e?.metalness != null ||
        e?.roughness != null ||
        e?.opacity != null ||
        e?.emissive ||
        e?.emissiveIntensity != null ||
        e?.castLight != null ||
        e?.lightStrength != null
      );
    });

  const currentMaterial: MaterialProps = {
    color: colorValue,
    metalness,
    roughness,
    opacity,
    emissive,
    emissiveIntensity,
    castLight,
    lightStrength,
  };
  const applyMaterial = (m: MaterialProps) => {
    if (isGlobal) {
      update({
        color: m.color,
        colorMode: "custom",
        metalness: m.metalness,
        roughness: m.roughness,
        opacity: m.opacity,
        emissive: m.emissive,
        emissiveIntensity: m.emissiveIntensity,
        castLight: m.castLight,
        lightStrength: m.lightStrength,
      });
    } else {
      parts.forEach((p) => {
        setColor(p, m.color);
        setMaterial(p, {
          metalness: m.metalness,
          roughness: m.roughness,
          opacity: m.opacity,
          emissive: m.emissive,
          emissiveIntensity: m.emissiveIntensity,
          castLight: m.castLight,
          lightStrength: m.lightStrength,
        });
      });
    }
  };

  return (
    <Section
      title={title}
      action={
        !isGlobal && hasOverrides ? (
          <LinkButton onClick={() => parts.forEach(resetPart)}>Reset</LinkButton>
        ) : undefined
      }
    >
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-normal">Material</Label>
        <MaterialSelect current={currentMaterial} onApply={applyMaterial} />
      </div>
      <ColorRow label="Color" value={colorValue} onChange={onColor} />
      <SliderRow
        label="Metalness"
        value={metalness}
        min={0}
        max={1}
        step={0.01}
        format={f2}
        onChange={onMetalness}
      />
      <SliderRow
        label="Roughness"
        value={roughness}
        min={0}
        max={1}
        step={0.01}
        format={f2}
        onChange={onRoughness}
      />
      <SliderRow
        label="Opacity"
        value={opacity}
        min={0.1}
        max={1}
        step={0.01}
        format={f2}
        onChange={onOpacity}
      />
      <SliderRow
        label="Emission"
        value={emissiveIntensity}
        min={0}
        max={4}
        step={0.05}
        format={f2}
        onChange={onEmissiveIntensity}
      />
      <ColorRow
        label="Emission color"
        value={emissive}
        onChange={onEmissive}
      />
      <SwitchRow label="Cast light" checked={castLight} onChange={onCastLight} />
      {castLight && (
        <SliderRow
          label="Light strength"
          value={lightStrength}
          min={0}
          max={5}
          step={0.1}
          format={f2}
          onChange={onLightStrength}
        />
      )}
    </Section>
  );
}

function DisplaySection() {
  const s = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);

  return (
    <Section title="Display">
      <SwitchRow
        label="Wireframe"
        checked={s.wireframe}
        onChange={(v) => update({ wireframe: v })}
      />
      <SwitchRow
        label="Flat shading"
        checked={s.flatShading}
        onChange={(v) => update({ flatShading: v })}
      />
      <SwitchRow
        label="Show edges"
        checked={s.edges}
        onChange={(v) => update({ edges: v })}
      />
      <ColorRow
        label="Edge color"
        value={s.edgeColor}
        onChange={(hex) => update({ edgeColor: hex })}
      />
      <SwitchRow
        label="Highlight selection"
        checked={s.highlightSelection}
        onChange={(v) => update({ highlightSelection: v })}
      />
    </Section>
  );
}

function CameraSection() {
  const s = useSettingsStore((st) => st.settings);
  const update = useSettingsStore((st) => st.update);
  const radius = useViewerStore((st) => st.modelRadius) || 1;
  const distMin = radius * 0.2;
  const distMax = Math.max(radius * 8, 1);
  const distStep = Math.max(distMax / 200, 0.01);
  const heightRange = Math.max(radius * 4, 1);
  const heightStep = Math.max(heightRange / 100, 0.01);
  const pose = useCameraStore(
    useShallow((st) => ({
      distance: st.distance,
      height: st.height,
      angle: st.angle,
    })),
  );
  const command = useCameraStore((st) => st.command);

  // Manual posing only holds when auto-rotate is off, so pause it on first move.
  const move = (patch: Partial<CameraPose>) => {
    if (useSettingsStore.getState().settings.autoRotate) {
      useSettingsStore.getState().update({ autoRotate: false });
    }
    command(patch);
  };

  return (
    <Section title="Camera">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs font-normal">Projection</Label>
        <Segmented<"orthographic" | "perspective">
          value={s.projection}
          onChange={(v) => update({ projection: v })}
          options={[
            { label: "Ortho", value: "orthographic" },
            { label: "Persp", value: "perspective" },
          ]}
        />
      </div>
      {s.projection === "perspective" && (
        <SliderRow
          label="Field of view"
          value={s.fov}
          min={15}
          max={90}
          step={1}
          format={fdeg}
          onChange={(v) => update({ fov: v })}
        />
      )}
      <SliderRow
        label="Distance"
        value={clamp(pose.distance, distMin, distMax)}
        min={distMin}
        max={distMax}
        step={distStep}
        format={f1}
        onChange={(v) => move({ distance: v })}
      />
      <SliderRow
        label="Height"
        value={clamp(pose.height, -heightRange, heightRange)}
        min={-heightRange}
        max={heightRange}
        step={heightStep}
        format={f1}
        onChange={(v) => move({ height: v })}
      />
      <SliderRow
        label="Angle"
        value={clamp(pose.angle, -180, 180)}
        min={-180}
        max={180}
        step={1}
        format={fdeg}
        onChange={(v) => move({ angle: v })}
      />
      <SwitchRow
        label="Auto-rotate"
        checked={s.autoRotate}
        onChange={(v) => update({ autoRotate: v })}
      />
      <SliderRow
        label="Rotate speed"
        value={s.autoRotateSpeed}
        min={0.1}
        max={6}
        step={0.1}
        format={f1}
        onChange={(v) => update({ autoRotateSpeed: v })}
      />
      <SliderRow
        label="Explode"
        value={s.explode}
        min={0}
        max={1}
        step={0.01}
        format={f2}
        onChange={(v) => update({ explode: v })}
      />
    </Section>
  );
}

export function ControlsPanel() {
  const s = useSettingsStore((state) => state.settings);
  const update = useSettingsStore((state) => state.update);

  const sceneMatch = matchScene(s);
  const applyScene = (name: string) => {
    const preset = SCENE_PRESETS.find((p) => p.name === name);
    if (preset) update(preset.settings);
  };

  return (
    <div className="flex flex-col divide-y divide-border/60 px-4">
      <PartsSection />
      <MaterialSection />

      <Section title="Scene">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs font-normal">Preset</Label>
          <Segmented
            value={sceneMatch?.name ?? "custom"}
            onChange={applyScene}
            options={[
              { label: "Lab", value: "Lab" },
              { label: "Stage", value: "Stage" },
            ]}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs font-normal">Background</Label>
          <Segmented<"solid" | "gradient">
            value={s.backgroundMode}
            onChange={(v) => update({ backgroundMode: v })}
            options={[
              { label: "Solid", value: "solid" },
              { label: "Gradient", value: "gradient" },
            ]}
          />
        </div>
        {s.backgroundMode === "solid" ? (
          <ColorRow
            label="Color"
            value={s.background}
            onChange={(hex) => update({ background: hex })}
          />
        ) : (
          <>
            <ColorRow
              label="Top"
              value={s.gradientTop}
              onChange={(hex) => update({ gradientTop: hex })}
            />
            <ColorRow
              label="Bottom"
              value={s.gradientBottom}
              onChange={(hex) => update({ gradientBottom: hex })}
            />
          </>
        )}
        <SliderRow
          label="Environment"
          value={s.envIntensity}
          min={0}
          max={3}
          step={0.05}
          format={f2}
          onChange={(v) => update({ envIntensity: v })}
        />
        <SliderRow
          label="Ambient light"
          value={s.ambient}
          min={0}
          max={2}
          step={0.05}
          format={f2}
          onChange={(v) => update({ ambient: v })}
        />
        <SliderRow
          label="Key light"
          value={s.keyLight}
          min={0}
          max={3}
          step={0.05}
          format={f2}
          onChange={(v) => update({ keyLight: v })}
        />
        <SwitchRow
          label="Grid"
          checked={s.grid}
          onChange={(v) => update({ grid: v })}
        />
        <ColorRow
          label="Grid color"
          value={s.gridColor}
          onChange={(hex) => update({ gridColor: hex })}
        />
        <SwitchRow
          label="Contact shadow"
          checked={s.shadow}
          onChange={(v) => update({ shadow: v })}
        />
        {s.shadow && (
          <SliderRow
            label="Shadow opacity"
            value={s.shadowOpacity}
            min={0}
            max={1}
            step={0.05}
            format={f2}
            onChange={(v) => update({ shadowOpacity: v })}
          />
        )}
      </Section>

      <CameraSection />
      <DisplaySection />
    </div>
  );
}
