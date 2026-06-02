"use client";

import {
  type ComponentType,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type IconProps = {
  className?: string;
};

type AppointmentStatus = "Confirmed" | "Waiting" | "Rescheduled" | "Cancelled";

type Appointment = {
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

type AppointmentsResponse = {
  success: boolean;
  appointments: Appointment[];
  fetchedAt: string;
  error?: string;
};

type Kpi = {
  label: string;
  value: number;
  suffix?: string;
  trend: string;
  icon: ComponentType<IconProps>;
  progress?: number;
};

const refreshIntervalMs = 10_000;

const statusStyles: Record<AppointmentStatus, string> = {
  Confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Waiting: "border-amber-200 bg-amber-50 text-amber-700",
  Rescheduled: "border-blue-200 bg-blue-50 text-blue-700",
  Cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

function getAppointmentStatus(status: string | null): AppointmentStatus {
  const normalizedStatus = status?.trim().toLowerCase();

  if (normalizedStatus === "waiting") {
    return "Waiting";
  }

  if (normalizedStatus === "rescheduled") {
    return "Rescheduled";
  }

  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return "Cancelled";
  }

  return "Confirmed";
}

function isSameDay(timestamp: string | null) {
  if (!timestamp) {
    return false;
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function formatLastUpdated(timestamp: string | null) {
  if (!timestamp) {
    return "Waiting for first sync";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatReceivedTime(timestamp: string | null) {
  if (!timestamp) {
    return "Not received yet";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Not received yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getKpis(appointments: Appointment[]): Kpi[] {
  const appointmentsBooked = appointments.length;
  const activePatients = new Set(
    appointments.map((appointment) => appointment.phone_number).filter(Boolean),
  ).size;
  const callsToday = appointments.filter(
    (appointment) =>
      isSameDay(appointment.created_at) &&
      appointment.source?.toLowerCase().includes("call"),
  ).length;
  const successfulBookings = appointments.filter(
    (appointment) => getAppointmentStatus(appointment.status) === "Confirmed",
  ).length;
  const bookingSuccessRate =
    appointmentsBooked > 0
      ? Math.round((successfulBookings / appointmentsBooked) * 100)
      : 0;

  return [
    {
      label: "Calls Today",
      value: callsToday,
      trend: "From live appointment records",
      icon: PhoneIcon,
    },
    {
      label: "Appointments Booked",
      value: appointmentsBooked,
      trend: "Sorted by created_at DESC",
      icon: CalendarIcon,
    },
    {
      label: "Success Rate",
      value: bookingSuccessRate,
      suffix: "%",
      trend: "Confirmed appointments",
      icon: SparkIcon,
      progress: bookingSuccessRate,
    },
    {
      label: "Active Patients",
      value: activePatients,
      trend: "Unique phone numbers",
      icon: UsersIcon,
    },
  ];
}

function useCountUp(value: number, durationMs = 700) {
  const [displayValue, setDisplayValue] = useState(value);
  const displayValueRef = useRef(value);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;

    if (mediaQuery.matches) {
      animationFrame = window.requestAnimationFrame(() => {
        setDisplayValue(value);
        displayValueRef.current = value;
      });

      return () => {
        window.cancelAnimationFrame(animationFrame);
      };
    }

    if (value === displayValueRef.current) {
      return;
    }

    const startTime = window.performance.now();
    const startValue = displayValueRef.current;
    const change = value - startValue;

    const updateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(startValue + change * easedProgress);

      setDisplayValue(nextValue);
      displayValueRef.current = nextValue;

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(updateValue);
      }
    };

    animationFrame = window.requestAnimationFrame(updateValue);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [durationMs, value]);

  return displayValue;
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon;
  const animatedValue = useCountUp(kpi.value);

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_20px_45px_rgba(37,99,235,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
            {animatedValue}
            {kpi.suffix}
          </p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {typeof kpi.progress === "number" ? (
        <div
          aria-label={`${kpi.label} progress`}
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={kpi.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-700 ease-out"
            style={{ width: `${kpi.progress}%` }}
          />
        </div>
      ) : null}

      <p className="mt-5 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        {kpi.trend}
      </p>
    </article>
  );
}

function PhoneIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 5.25 9.2 4.4a1.5 1.5 0 0 1 2 .67l1.06 2.12a1.5 1.5 0 0 1-.36 1.77l-1.03.91a10.9 10.9 0 0 0 3.26 3.26l.91-1.03a1.5 1.5 0 0 1 1.77-.36l2.12 1.06a1.5 1.5 0 0 1 .67 2l-.85 1.7a2.25 2.25 0 0 1-2.22 1.23C10.72 17.1 6.9 13.28 6.27 7.47A2.25 2.25 0 0 1 7.5 5.25Z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 4.75v2.5M17 4.75v2.5M5.75 9.25h12.5M6.75 6.25h10.5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z"
      />
    </svg>
  );
}

function SparkIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m12 4.75 1.6 4.15L17.75 10.5l-4.15 1.6L12 16.25l-1.6-4.15-4.15-1.6 4.15-1.6L12 4.75ZM18 15.25l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"
      />
    </svg>
  );
}

function UsersIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.5 18.25a4.5 4.5 0 0 0-9 0M11 12.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM18 17.25a3.5 3.5 0 0 0-2.75-3.42M15.75 5.95a2.75 2.75 0 0 1 0 5.35"
      />
    </svg>
  );
}

function ClipboardPulseIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 5.75h4.5m-4.5 0a2.25 2.25 0 0 1 4.5 0m-4.5 0H7.5a2 2 0 0 0-2 2v10.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7.75a2 2 0 0 0-2-2h-2.25M8.75 13.25l2.25 2.25 4.25-5"
      />
    </svg>
  );
}

async function fetchAppointments() {
  const response = await fetch("/api/appointments", {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json()) as AppointmentsResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? "Failed to fetch appointments");
  }

  return payload;
}

export default function Home() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAppointments = async () => {
      try {
        const payload = await fetchAppointments();

        if (!isMounted) {
          return;
        }

        setAppointments(payload.appointments);
        setLastUpdated(payload.fetchedAt);
        setError(null);
      } catch (loadError) {
        console.error("Failed to fetch appointments:", loadError);

        if (!isMounted) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to fetch appointments",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAppointments();

    const intervalId = window.setInterval(() => {
      void loadAppointments();
    }, refreshIntervalMs);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const kpis = useMemo(() => getKpis(appointments), [appointments]);
  const latestAppointment = appointments[0] ?? null;
  const callsHandledToday = kpis[0]?.value ?? 0;
  const confirmedAppointments = appointments.filter(
    (appointment) => getAppointmentStatus(appointment.status) === "Confirmed",
  ).length;

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:px-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-3 inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Clinic AI Front Desk
              </p>
              <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
                SriCare AI Receptionist
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                AI-powered appointment booking and patient call management
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.16)]" />
              </span>
              <div>
                <p className="text-xs font-medium text-emerald-700">
                  Receptionist Status
                </p>
                <p className="text-sm font-semibold text-emerald-900">
                  Online and syncing
                </p>
              </div>
            </div>
          </div>
        </header>

        <section
          aria-label="AI receptionist metrics"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-5 sm:px-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-normal text-slate-950">
                  Recent Appointments
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Bookings captured by the AI receptionist today
                </p>
              </div>
              <div className="text-sm text-slate-500">
                <p>
                  Last updated: <span className="font-medium text-slate-700">{formatLastUpdated(lastUpdated)}</span>
                </p>
                <p className="mt-1">Auto-refreshes every 10 seconds</p>
              </div>
            </div>

            {error ? (
              <div className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700 sm:px-6">
                {error}
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                    <th className="px-5 py-3 sm:px-6">Patient Name</th>
                    <th className="px-5 py-3 sm:px-6">Phone Number</th>
                    <th className="px-5 py-3 sm:px-6">Department</th>
                    <th className="px-5 py-3 sm:px-6">Doctor</th>
                    <th className="px-5 py-3 sm:px-6">Appointment Time</th>
                    <th className="px-5 py-3 sm:px-6">Status</th>
                    <th className="px-5 py-3 sm:px-6">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm font-medium text-slate-500 sm:px-6"
                      >
                        Loading appointments...
                      </td>
                    </tr>
                  ) : appointments.length > 0 ? (
                    appointments.map((appointment) => {
                      const status = getAppointmentStatus(appointment.status);

                      return (
                        <tr
                          key={appointment.id}
                          className="text-sm text-slate-700 transition-colors hover:bg-blue-50/40"
                        >
                          <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                                {(appointment.patient_name ?? "NA")
                                  .split(" ")
                                  .map((name) => name[0])
                                  .join("")
                                  .slice(0, 2)}
                              </span>
                              <span className="font-semibold text-slate-950">
                                {appointment.patient_name ?? "Not provided"}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                            {appointment.phone_number ?? "Not provided"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                            {appointment.department ?? "Not provided"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                            {appointment.doctor ?? "Not provided"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950 sm:px-6">
                            {appointment.appointment_time ?? "Not provided"}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 sm:px-6">
                            {appointment.source ?? "Not provided"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-14 text-center sm:px-6"
                      >
                        <div className="mx-auto flex max-w-md flex-col items-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-[0_12px_28px_rgba(37,99,235,0.12)]">
                            <ClipboardPulseIcon className="h-7 w-7" />
                          </div>
                          <p className="mt-4 text-base font-semibold text-slate-950">
                            AI Receptionist Ready
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-500">
                            Appointments booked through calls will appear here automatically.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="flex flex-col gap-6">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Latest Appointment
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-950">
                    {latestAppointment?.patient_name ?? "Awaiting booking"}
                  </h2>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
                  <CalendarIcon className="h-6 w-6" />
                </div>
              </div>

              <dl className="mt-5 grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3">
                  <dt className="text-slate-500">Department</dt>
                  <dd className="font-semibold text-slate-950">
                    {latestAppointment?.department ?? "Not provided"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3">
                  <dt className="text-slate-500">Time received</dt>
                  <dd className="text-right font-semibold text-slate-950">
                    {formatReceivedTime(latestAppointment?.created_at ?? null)}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.07)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-normal text-slate-950">
                    Live Overview
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Real-time snapshot from the appointments table
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Live
                </span>
              </div>

              <dl className="mt-6 grid gap-4">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-sm text-slate-500">Appointments tracked</dt>
                  <dd className="text-sm font-semibold text-slate-950">
                    {appointments.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-sm text-slate-500">Confirmed bookings</dt>
                  <dd className="text-sm font-semibold text-slate-950">
                    {confirmedAppointments}
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-sm text-slate-500">Calls handled today</dt>
                  <dd className="text-sm font-semibold text-slate-950">
                    {callsHandledToday}
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-sm text-slate-500">Latest appointment</dt>
                  <dd className="text-sm font-semibold text-slate-950">
                    {latestAppointment?.patient_name ?? "No appointments yet"}
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <dt className="text-sm text-slate-500">Last updated</dt>
                  <dd className="text-sm font-semibold text-slate-950">
                    {formatLastUpdated(lastUpdated)}
                  </dd>
                </div>
              </dl>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
