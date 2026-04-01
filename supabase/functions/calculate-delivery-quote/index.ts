import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  deliveryAddress: z.string().min(5),
  validateOnly: z.boolean().optional(),
});

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const getSupabaseAuthClient = (authHeader: string) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public credentials.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
};

const getSupabaseAdmin = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase server credentials.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
};

type Coordinates = {
  lat: number;
  lon: number;
};

class BadRequestError extends Error {
  name = "BadRequestError";
}

const getRoutingBaseUrl = () =>
  Deno.env.get("ROUTING_API_BASE_URL")?.trim() || "https://router.project-osrm.org";

const getRoutingProfile = () =>
  Deno.env.get("ROUTING_PROFILE")?.trim() || "driving";

const normalizeAddress = (address: string) =>
  address
    .toLowerCase()
    .replace(/[,\t\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const addressHasIntersection = (address: string) => {
  const normalized = normalizeAddress(address);
  if (!normalized) return false;

  if (/\b(corner|coner|cnr|intersection|crossroads|junction|between)\b/.test(normalized)) {
    return true;
  }

  if (/\b(and|&|\/)\b/.test(normalized)) {
    const roadMatches = normalized.match(
      /\b(road|rd|street|st|avenue|ave|boulevard|blvd|drive|dr|lane|ln|way|crescent|cres|circle|cir|court|ct|place|pl|terrace|ter)\b/g,
    );
    if (roadMatches && roadMatches.length >= 2) {
      return true;
    }
  }

  return false;
};

const validateDeliveryAddress = (address: string): string | null => {
  const normalized = normalizeAddress(address);
  if (normalized.length < 5) {
    return "Please enter a full street address.";
  }

  if (addressHasIntersection(normalized)) {
    return "Please enter a single road address only (no corners or intersections).";
  }

  return null;
};

const geocodeAddress = async (address: string): Promise<Coordinates> => {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "jaymimicakes-delivery-quote/1.0",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to geocode address.");
  }

  const payload = await response.json() as Array<{ lat?: string; lon?: string }>;
  const match = payload[0];
  const lat = Number(match?.lat ?? NaN);
  const lon = Number(match?.lon ?? NaN);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new BadRequestError("Could not locate the supplied address.");
  }

  return { lat, lon };
};

const getDrivingDistanceKm = async (
  start: Coordinates,
  end: Coordinates,
): Promise<number> => {
  const routingBaseUrl = getRoutingBaseUrl().replace(/\/$/, "");
  const routingProfile = getRoutingProfile();
  const coordinates = `${start.lon},${start.lat};${end.lon},${end.lat}`;
  const url = new URL(
    `${routingBaseUrl}/route/v1/${routingProfile}/${coordinates}`,
  );
  url.searchParams.set("overview", "false");
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("steps", "false");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to calculate driving route.");
  }

  const payload = await response.json() as {
    routes?: Array<{ distance?: number }>;
  };
  const distanceMeters = Number(payload.routes?.[0]?.distance ?? NaN);

  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    throw new Error("Could not calculate a driving route for the supplied addresses.");
  }

  return Number((distanceMeters / 1000).toFixed(2));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed." });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { error: "Missing authorization header." });
    }

    const authClient = getSupabaseAuthClient(authHeader);
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) {
      return jsonResponse(401, { error: "Invalid or expired session." });
    }

    const body = BodySchema.parse(await req.json());
    const deliveryAddress = body.deliveryAddress.trim();
    const addressError = validateDeliveryAddress(deliveryAddress);
    if (addressError) {
      return jsonResponse(400, { error: addressError });
    }
    const supabase = getSupabaseAdmin();

    if (body.validateOnly) {
      await geocodeAddress(deliveryAddress);
      return jsonResponse(200, { ok: true, deliveryAddress });
    }

    const { data: settings, error: settingsError } = await supabase
      .from("delivery_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (settingsError) {
      return jsonResponse(500, { error: settingsError.message });
    }

    const collectionAddress = settings?.collection_address?.trim() ?? "";
    const deliveryRate = Number(settings?.delivery_rate ?? 0);

    if (!collectionAddress) {
      return jsonResponse(400, {
        error: "Collection address is not configured by the administrator.",
      });
    }

    if (!Number.isFinite(deliveryRate) || deliveryRate <= 0) {
      return jsonResponse(400, {
        error: "Delivery rate is not configured by the administrator.",
      });
    }

    const [collectionCoordinates, destinationCoordinates] = await Promise.all([
      geocodeAddress(collectionAddress),
      geocodeAddress(deliveryAddress),
    ]);

    const distanceKm = await getDrivingDistanceKm(
      collectionCoordinates,
      destinationCoordinates,
    );
    const MIN_DELIVERY_FEE = 50;
    const calculatedFee = Number((distanceKm * deliveryRate).toFixed(2));
    const deliveryFee = Math.max(calculatedFee, MIN_DELIVERY_FEE);

    return jsonResponse(200, {
      collectionAddress,
      deliveryAddress,
      deliveryRate,
      distanceKm,
      deliveryFee,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    const status = error instanceof BadRequestError ? 400 : 500;
    return jsonResponse(status, { error: message });
  }
});
