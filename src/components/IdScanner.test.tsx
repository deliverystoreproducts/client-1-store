// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { IdScanner } from "./IdScanner";

/**
 * Regression test for the two bugs the owner hit in production.
 *
 * The one that mattered: the component told its parent about captured photos
 * from INSIDE a setState updater, which is a render-phase side effect. React
 * declines to apply a parent update raised while a child renders, so checkout
 * never received the images and its Next button stayed dead no matter how many
 * photos you took. Nothing threw and nothing logged at the user — it simply did
 * not work. This asserts the parent is actually told.
 */

beforeAll(() => {
  // jsdom has neither of these; the component re-encodes every photo through a
  // canvas, so both have to exist for the capture path to run at all.
  global.createImageBitmap = vi
    .fn()
    .mockResolvedValue({ width: 1200, height: 760, close: vi.fn() } as unknown as ImageBitmap);
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({ drawImage: vi.fn() });
  HTMLCanvasElement.prototype.toBlob = function (cb: BlobCallback) {
    cb(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }));
  };
  let n = 0;
  global.URL.createObjectURL = vi.fn(() => `blob:mock/${(n += 1)}`);
  global.URL.revokeObjectURL = vi.fn();
});

function pick(input: Element, name: string) {
  const file = new File([new Uint8Array([1, 2, 3])], name, { type: "image/jpeg" });
  fireEvent.change(input as HTMLElement, { target: { files: [file] } });
}

describe("IdScanner", () => {
  it("tells the parent only once BOTH sides are captured", async () => {
    const onChange = vi.fn();
    const { container } = render(<IdScanner onChange={onChange} />);

    const inputs = container.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(2);

    pick(inputs[0]!, "front.jpg");
    await waitFor(() => expect(screen.getAllByText("Captured")).toHaveLength(1));
    // One side is not enough — checkout must not unlock yet.
    expect(onChange).not.toHaveBeenCalledWith(expect.objectContaining({ front: expect.anything(), back: expect.anything() }));

    pick(inputs[1]!, "back.jpg");
    await waitFor(() => {
      const both = onChange.mock.calls.at(-1)?.[0];
      expect(both).toBeTruthy();
      expect(both.front).toBeInstanceOf(File);
      expect(both.back).toBeInstanceOf(File);
    });
  });

  it("renders a preview of each captured side", async () => {
    const { container } = render(<IdScanner onChange={vi.fn()} />);
    const inputs = container.querySelectorAll('input[type="file"]');

    pick(inputs[0]!, "front.jpg");
    await waitFor(() => {
      const img = container.querySelector("img.idscan-shot") as HTMLImageElement | null;
      expect(img).not.toBeNull();
      // A blob: URL — which is exactly what the Content-Security-Policy has to
      // permit under img-src, or this renders as nothing at all.
      expect(img!.src.startsWith("blob:")).toBe(true);
    });
  });

  it("mints one object URL per capture, not two", async () => {
    const { container } = render(<IdScanner onChange={vi.fn()} />);
    const before = (global.URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls.length;
    pick(container.querySelectorAll('input[type="file"]')[0]!, "front.jpg");
    await waitFor(() =>
      expect(container.querySelector("img.idscan-shot")).not.toBeNull(),
    );
    expect(
      (global.URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls.length - before,
    ).toBe(1);
  });
});
