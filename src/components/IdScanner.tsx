"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Guided capture of both sides of a government ID.
 *
 * BOTH SIDES, because they answer different questions. The front is what a
 * person recognises — photo, name, the printed birth date. The back carries
 * the PDF417 barcode, which is the only part a machine can read, and reading
 * it is what turns "we collected a photo" into "we checked the ID". The
 * server does that reading (src/lib/identity); this component's whole job is
 * to hand it a photograph good enough to decode.
 *
 * Which is why capture is guided rather than a file picker: a barcode
 * photographed at an angle, cropped, or downscaled by a messaging app will not
 * decode, and the customer has no way to know that. A framed live viewfinder
 * gets a usable frame on the first try far more often.
 *
 * Every photo is re-encoded through a canvas before it leaves the page —
 * capped at 1920px on the long edge, JPEG. That normalises the twelve formats
 * phone cameras produce (HEIC included), keeps the upload small enough to
 * survive a bad connection, and means the server can insist on JPEG and treat
 * anything else as not having come from here.
 */

/** ID-1, the international card size (85.6 × 54 mm) every licence uses. */
const CARD_ASPECT = 85.6 / 54;
/** Long-edge cap. Enough for a PDF417 to decode, small enough to upload. */
const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.85;

type Side = "front" | "back";

const COPY: Record<Side, { title: string; hint: string }> = {
  front: {
    title: "Front of your ID",
    hint: "Fill the frame with the card. Keep it flat and avoid glare.",
  },
  back: {
    title: "Back of your ID",
    hint: "The barcode side. This is the part we read to confirm your age.",
  },
};

function drawToJpeg(source: CanvasImageSource, width: number, height: number): Promise<File> {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(new File([blob], "id.jpg", { type: "image/jpeg" }))
          : reject(new Error("capture failed")),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  );
}

export function IdScanner({
  onChange,
  disabled,
}: {
  onChange: (images: { front: File; back: File } | null) => void;
  disabled?: boolean;
}) {
  const [shots, setShots] = useState<Partial<Record<Side, { file: File; url: string }>>>({});
  const [capturing, setCapturing] = useState<Side | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // The camera light must go out when this component does — on unmount, on
  // navigation, on the flow finishing. Nothing else stops the tracks.
  useEffect(() => stopCamera, [stopCamera]);

  const publish = useCallback(
    (next: Partial<Record<Side, { file: File; url: string }>>) => {
      onChange(next.front && next.back ? { front: next.front.file, back: next.back.file } : null);
    },
    [onChange],
  );

  const accept = useCallback(
    (side: Side, file: File) => {
      setShots((prev) => {
        URL.revokeObjectURL(prev[side]?.url ?? "");
        const next = { ...prev, [side]: { file, url: URL.createObjectURL(file) } };
        publish(next);
        return next;
      });
    },
    [publish],
  );

  async function startCamera(side: Side) {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      // No camera API at all (older desktop browser, insecure context) — the
      // file input below is the whole path for this visitor, not an error.
      setError("no_camera");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
      });
      streamRef.current = stream;
      setCapturing(side);
      // The element only exists once `capturing` renders it.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      });
    } catch {
      setError("no_camera");
    }
  }

  async function shoot(side: Side) {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    try {
      accept(side, await drawToJpeg(video, video.videoWidth, video.videoHeight));
      stopCamera();
      setCapturing(null);
    } catch {
      setError("capture_failed");
    }
  }

  async function pickFile(side: Side, file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      // Re-encode through an <img> so HEIC, huge JPEGs and PNGs all arrive as
      // one predictable format.
      const bitmap = await createImageBitmap(file);
      accept(side, await drawToJpeg(bitmap, bitmap.width, bitmap.height));
      bitmap.close();
    } catch {
      setError("bad_image");
    }
  }

  const errorText =
    error === "no_camera"
      ? "We couldn't open your camera. Choose a photo instead — make sure the barcode is sharp."
      : error === "bad_image"
        ? "We couldn't read that image. Try another photo."
        : error === "capture_failed"
          ? "That didn't capture. Please try again."
          : null;

  return (
    <div className="idscan">
      {errorText ? (
        <p className="idscan-error" role="status">
          {errorText}
        </p>
      ) : null}

      {(["front", "back"] as const).map((side) => {
        const shot = shots[side];
        const live = capturing === side;
        return (
          <div className="idscan-side" key={side}>
            <div className="idscan-head">
              <strong>{COPY[side].title}</strong>
              {shot ? <span className="idscan-done">Captured</span> : null}
            </div>

            <div className="idscan-stage" style={{ aspectRatio: String(CARD_ASPECT) }}>
              {live ? (
                <>
                  <video ref={videoRef} className="idscan-video" playsInline muted />
                  <span className="idscan-guide" aria-hidden />
                </>
              ) : shot ? (
                // eslint-disable-next-line @next/next/no-img-element -- a local
                // object URL for a photo that never leaves this device unsent.
                <img className="idscan-shot" src={shot.url} alt={`${COPY[side].title}, captured`} />
              ) : (
                <span className="idscan-empty" aria-hidden />
              )}
            </div>

            <p className="idscan-hint">{COPY[side].hint}</p>

            <div className="idscan-actions">
              {live ? (
                <>
                  <button type="button" className="btn btn-sm" onClick={() => void shoot(side)}>
                    Take photo
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      stopCamera();
                      setCapturing(null);
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={disabled}
                    onClick={() => void startCamera(side)}
                  >
                    {shot ? "Retake" : "Open camera"}
                  </button>
                  <label className="btn btn-sm btn-ghost idscan-file">
                    Choose photo
                    <input
                      type="file"
                      accept="image/*"
                      disabled={disabled}
                      onChange={(e) => void pickFile(side, e.target.files?.[0])}
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
