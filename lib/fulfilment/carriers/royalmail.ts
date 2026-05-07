import "server-only";
import { z } from "zod";
import type { CarrierAdapter, ShipmentInput, ShipmentResult } from "./types";

// Implementation note: the request/response shapes below reflect the public
// Click & Drop schema as understood at spec writing. Verify against current
// vendor docs (https://developer.royalmail.net/) before flipping production
// to live mode. RM occasionally renames fields and changes endpoint paths.

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Royal Mail adapter requires env ${name}`);
  return v;
}

const BASE_URL = () =>
  process.env.ROYALMAIL_CLICK_AND_DROP_BASE_URL ?? "https://api.parcel.royalmail.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  // Click & Drop API uses an API key passed directly as Bearer — no token
  // exchange. If the account type moves to OAuth, add the exchange flow here.
  const apiKey = requireEnv("ROYALMAIL_CLICK_AND_DROP_API_KEY");

  cachedToken = {
    token: apiKey,
    expiresAt: Date.now() + 50 * 60 * 1000,
  };
  return cachedToken.token;
}

const createShipmentResponseSchema = z.object({
  createdOrders: z.array(
    z.object({
      orderIdentifier: z.string(),
      trackingNumber: z.string().optional(),
      labelUrl: z.string().url().optional(),
    })
  ),
  errorsCount: z.number().optional(),
  successCount: z.number().optional(),
});

export const royalMailCarrier: CarrierAdapter = {
  async createShipment(input: ShipmentInput): Promise<ShipmentResult> {
    const token = await getAccessToken();

    const body = {
      items: [
        {
          orderReference: input.orderNumber,
          recipient: {
            address: {
              fullName: input.destinationName,
              companyName: "",
              addressLine1: input.destinationAddress.line1,
              addressLine2: input.destinationAddress.line2 ?? "",
              addressLine3: "",
              city: input.destinationAddress.city,
              county: "",
              postcode: input.destinationAddress.postcode,
              countryCode: input.destinationAddress.country,
            },
            phoneNumber: input.destinationPhone ?? "",
            emailAddress: input.destinationEmail,
          },
          sender: {
            tradingName: input.senderName,
            phoneNumber: "",
            emailAddress: "",
          },
          packages: [
            {
              weightInGrams: input.weightGrams,
              packageFormatIdentifier: "smallParcel",
            },
          ],
          shipmentInformation: {
            shipmentPackageCount: 1,
            totalPackageWeightInGrams: input.weightGrams,
            serviceCode: input.serviceCode,
            ...(input.customs && {
              customsInformation: {
                commodities: input.customs.items.map((i) => ({
                  description: i.description,
                  quantity: i.quantity,
                  hsCode: i.hsCode,
                  valueInPence: i.valueInPence,
                  weightInGrams: i.weightGrams,
                })),
                totalValueInPence: input.customs.totalValueInPence,
              },
            }),
          },
          label: { includeLabelInResponse: true, includeCN: !!input.customs },
        },
      ],
    };

    const res = await fetch(`${BASE_URL()}/api/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Royal Mail createShipment failed: ${res.status} ${text.slice(0, 500)}`);
    }

    const json = await res.json();
    const parsed = createShipmentResponseSchema.parse(json);
    const created = parsed.createdOrders[0];
    if (!created) throw new Error("Royal Mail createShipment: no order returned");
    if (!created.trackingNumber) {
      throw new Error("Royal Mail: tracking number missing — check service code");
    }
    if (!created.labelUrl) {
      throw new Error("Royal Mail: label URL missing in response");
    }

    return {
      carrierOrderId: created.orderIdentifier,
      trackingNumber: created.trackingNumber,
      labelPdfUrl: created.labelUrl,
    };
  },

  async voidShipment(carrierOrderId: string): Promise<void> {
    const token = await getAccessToken();
    const res = await fetch(
      `${BASE_URL()}/api/v1/orders/${encodeURIComponent(carrierOrderId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    // 200/204 = voided. 404 = already gone (idempotent — treat as success).
    if (!res.ok && res.status !== 404) {
      const text = await res.text().catch(() => "");
      throw new Error(`Royal Mail voidShipment failed: ${res.status} ${text.slice(0, 500)}`);
    }
  },

  async subscribeTracking({
    trackingNumber,
    webhookUrl,
  }: {
    trackingNumber: string;
    webhookUrl: string;
  }): Promise<void> {
    const token = await getAccessToken();
    // Implementation note: RM tracking webhook subscription has changed twice
    // in two years. Verify against developer.royalmail.net before commit. If
    // the live API embeds webhook subscription in the original POST /orders
    // body, move this logic into createShipment.
    const res = await fetch(`${BASE_URL()}/api/v1/tracking/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ trackingNumber, webhookUrl }),
    });
    if (!res.ok) {
      // Non-fatal — log and return. Label generation is the primary success path.
      const text = await res.text().catch(() => "");
      console.warn(`Royal Mail subscribeTracking warn: ${res.status} ${text.slice(0, 200)}`);
    }
  },
};
