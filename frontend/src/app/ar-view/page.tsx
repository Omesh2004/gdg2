"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Cuboid, FileUp, Layers3, Move3D, RotateCcw, ScanEye } from "lucide-react";
import { useAppSelector } from "@/store/hooks";

const supportedFormats = [".glb", ".gltf", ".obj", ".fbx"];

export default function ArViewPage() {
  const router = useRouter();
  const profile = useAppSelector((state) => state.auth.profile);
  const userRole = profile?.role ?? "staff";
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  useEffect(() => {
    if (userRole === "staff" || userRole === "maintenance") {
      router.replace("/");
    }
  }, [userRole, router]);

  const formatsLabel = useMemo(() => supportedFormats.join("  "), []);

  if (userRole === "staff" || userRole === "maintenance") return null;

  return (
    <div className="mx-auto max-w-[1320px] space-y-4 pb-20">
      <section className="surface-card overflow-hidden">
        <div className="border-b border-gray-200 bg-[linear-gradient(110deg,#eff6ff_0%,#ffffff_65%)] px-5 py-5 md:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">CrisisControl AR Studio</p>
          <h1 className="mt-1 text-xl font-semibold text-gray-900 md:text-2xl">Hotel AR Building View</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload your hotel model later and use this workspace for emergency route overlays, hazard visualization,
            and live response simulation.
          </p>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-12 md:p-6">
          <div className="space-y-4 md:col-span-8">
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(59,130,246,0.08),transparent_45%),radial-gradient(circle_at_90%_88%,rgba(15,23,42,0.08),transparent_40%)]" />
              <div className="relative grid h-[380px] place-items-center border-b border-gray-200 bg-[linear-gradient(0deg,#f8fafc_1px,transparent_1px),linear-gradient(90deg,#f8fafc_1px,transparent_1px)] bg-[size:22px_22px] p-4">
                <div className="space-y-3 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">AR Canvas Ready</p>
                    <p className="mt-1 text-xs text-gray-600">
                      Your interactive hotel model preview area will appear here after model upload integration.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 p-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                  <p className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800"><Move3D size={13} /> Navigation</p>
                  <p className="mt-1 text-xs text-gray-600">Orbit, pan, and zoom controls for floor-by-floor inspection.</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                  <p className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800"><Layers3 size={13} /> Overlay Layer</p>
                  <p className="mt-1 text-xs text-gray-600">Future fire spread, exit routes, and zone risk overlays.</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                  <p className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800"><ScanEye size={13} /> Incident Focus</p>
                  <p className="mt-1 text-xs text-gray-600">Quick jump to affected room, floor, and nearest safe path.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 md:col-span-4">
            <section className="surface-card p-3.5">
              <h2 className="text-sm font-semibold text-gray-900">Model Upload</h2>
              <p className="mt-1 text-xs text-gray-600">Use this now as a staging area before backend model ingestion is connected.</p>

              <label className="mt-3 block rounded-lg border border-dashed border-blue-200 bg-blue-50/40 p-4 text-center hover:bg-blue-50">
                <input
                  type="file"
                  accept={supportedFormats.join(",")}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setSelectedFileName(file?.name ?? null);
                  }}
                />
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-blue-700">
                  <FileUp size={18} />
                </div>
                <p className="text-xs font-semibold text-gray-900">Choose model file</p>
                <p className="mt-1 text-[11px] text-gray-600">Supported: {formatsLabel}</p>
              </label>

              <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                {selectedFileName ? (
                  <p className="inline-flex items-center gap-1"><Cuboid size={12} /> Selected: {selectedFileName}</p>
                ) : (
                  <p>No file selected yet.</p>
                )}
              </div>

              <button
                type="button"
                disabled
                className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md border border-gray-300 bg-white text-xs font-semibold text-gray-500"
              >
                Upload Pipeline (Coming Soon)
              </button>
            </section>

            <section className="surface-card p-3.5">
              <h2 className="text-sm font-semibold text-gray-900">Operations Shortcuts</h2>
              <div className="mt-2 space-y-2">
                <Link href="/routing" className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                  Open Evacuation Routing
                  <RotateCcw size={13} />
                </Link>
                <Link href="/alerts" className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50">
                  Open Active Alerts
                  <RotateCcw size={13} />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}