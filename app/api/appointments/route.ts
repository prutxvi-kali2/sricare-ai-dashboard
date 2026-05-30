import { supabaseAdmin } from "@/lib/supabase";

type WebhookPayload = Record<string, unknown>;

type AppointmentInsert = {
  patient_name?: string;
  phone_number?: string;
  department?: string;
  doctor?: string;
  appointment_date?: string;
  appointment_time?: string;
  source: string;
};

type AppointmentRow = {
  id: string | number;
  patient_name: string | null;
  phone_number: string | null;
  department: string | null;
  doctor: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  status: string | null;
  source: string | null;
  created_at: string | null;
};

export const dynamic = "force-dynamic";

function findPayloadValue(payload: unknown, key: string): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const value = findPayloadValue(item, key);

      if (value) {
        return value;
      }
    }

    return undefined;
  }

  const objectPayload = payload as WebhookPayload;
  const directValue = objectPayload[key];

  if (typeof directValue === "string" && directValue.trim()) {
    return directValue.trim();
  }

  if (typeof directValue === "number") {
    return String(directValue);
  }

  for (const value of Object.values(objectPayload)) {
    const nestedValue = findPayloadValue(value, key);

    if (nestedValue) {
      return nestedValue;
    }
  }

  return undefined;
}

function extractAppointment(payload: WebhookPayload): AppointmentInsert {
  return {
    patient_name: findPayloadValue(payload, "patient_name"),
    phone_number: findPayloadValue(payload, "phone_number"),
    department: findPayloadValue(payload, "department"),
    doctor: findPayloadValue(payload, "doctor_name"),
    appointment_date: findPayloadValue(payload, "appointment_date"),
    appointment_time: findPayloadValue(payload, "appointment_time"),
    source: "OmniDimension",
  };
}

export async function GET() {
  try {
    if (!supabaseAdmin) {
      console.error("Supabase service role client is not configured.");

      return Response.json(
        {
          success: false,
          error: "Supabase is not configured",
          appointments: [],
          fetchedAt: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("appointments")
      .select(
        "id, patient_name, phone_number, department, doctor, appointment_date, appointment_time, status, source, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch appointments:", error.message);

      return Response.json(
        {
          success: false,
          error: "Failed to fetch appointments",
          appointments: [],
          fetchedAt: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    return Response.json(
      {
        success: true,
        appointments: (data ?? []) as AppointmentRow[],
        fetchedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to process appointments request:", error);

    return Response.json(
      {
        success: false,
        error: "Invalid request",
        appointments: [],
        fetchedAt: new Date().toISOString(),
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as WebhookPayload;

    console.log("OmniDimension appointment webhook payload:", payload);

    if (!supabaseAdmin) {
      console.error("Supabase service role client is not configured.");

      return Response.json(
        { success: false, error: "Supabase is not configured" },
        { status: 500 },
      );
    }

    const appointment = extractAppointment(payload);

    console.log("Extracted appointment data:", appointment);

    const { error } = await supabaseAdmin
      .from("appointments")
      .insert(appointment);

    if (error) {
      console.error("Failed to insert appointment:", error);

      return Response.json(
        { success: false, error: "Failed to create appointment" },
        { status: 500 },
      );
    }

    console.log("Appointment inserted successfully.");

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to process OmniDimension webhook:", error);

    return Response.json(
      { success: false, error: "Invalid webhook payload" },
      { status: 400 },
    );
  }
}
