import * as api from "@/lib/kamui/client";
import { json } from "@/lib/http";

/**
 * GET /api/delivery-zone?address=… — the minimum order for an address.
 *
 * This exists to move a piece of bad news EARLIER. The minimum is already
 * enforced at checkout, where a rejected order returns "Orders to {city} start
 * at ${X}" — good copy at a terrible moment, because by then the customer has
 * typed an address and photographed both sides of their driving licence. This
 * route lets the address step say it while they are still on the address step.
 *
 * WHAT IT DELIBERATELY DOES NOT RETURN: `deliveryFee`. Upstream sends it, the
 * operator can see it in their settings, and no order path anywhere adds it to
 * a total. Showing it would advertise a charge the driver does not collect.
 *
 * A failure here is not the customer's problem: the checkout still enforces the
 * minimum server-side, so an unreachable lookup returns "no opinion" rather
 * than an error. Nothing about this route is a gate — it is a courtesy.
 */

export const dynamic = "force-dynamic";

const MAX_ADDRESS = 300;

export async function GET(req: Request): Promise<Response> {
  const raw = new URL(req.url).searchParams.get("address") ?? "";
  const address = raw.trim().slice(0, MAX_ADDRESS);

  // Too short to mean anything. Upstream would 400; there is nothing to tell
  // the customer while they are still typing house numbers.
  if (address.length < 6) return json({ zone: null });

  try {
    const res = await api.lookupDeliveryZone(address);
    const z = res.zone;
    return json({
      zone: z
        ? {
            city: z.city,
            // Rounded to whole dollars because that is how it is written on the
            // page ("Orders to Encino start at $60").
            minimumOrder: Number(z.minimumOrder) || 0,
          }
        : null,
    });
  } catch {
    // No opinion, not an error. The real enforcement is at checkout.
    return json({ zone: null });
  }
}
