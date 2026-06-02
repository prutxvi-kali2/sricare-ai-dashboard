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
  tone: "sky" | "emerald" | "amber" | "violet";
  progress?: number;
};

const refreshIntervalMs = 10_000;

const kpiToneStyles: Record<
  Kpi["tone"],
  {
    card: string;
    icon: string;
    progress: string;
  }
> = {
  sky: {
    card: "from-sky-50/95 via-white to-white",
    icon: "bg-sky-600 text-white shadow-[0_16px_32px_rgba(2,132,199,0.26)]",
    progress: "bg-sky-500",
  },
  emerald: {
    card: "from-emerald-50/95 via-white to-white",
    icon: "bg-emerald-600 text-white shadow-[0_16px_32px_rgba(16,185,129,0.24)]",
    progress: "bg-emerald-500",
  },
  amber: {
    card: "from-amber-50/95 via-white to-white",
    icon: "bg-amber-500 text-white shadow-[0_16px_32px_rgba(245,158,11,0.24)]",
    progress: "bg-amber-500",
  },
  violet: {
    card: "from-violet-50/95 via-white to-white",
    icon: "bg-violet-600 text-white shadow-[0_16px_32px_rgba(124,58,237,0.22)]",
    progress: "bg-violet-500",
  },
};

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

function formatHeroDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatHeroTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatAppointmentDate(timestamp: string | null) {
  if (!timestamp) {
    return "Not provided";
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}

function getInitials(name: string | null) {
  const fallback = "SR";

  if (!name) {
    return fallback;
  }

  const initials = name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || fallback;
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
  const peakCount = Math.max(callsToday, appointmentsBooked, activePatients, 1);

  return [
    {
      label: "Calls Today",
      value: callsToday,
      trend: "From live appointment records",
      icon: PhoneIcon,
      tone: "sky",
      progress: Math.round((callsToday / peakCount) * 100),
    },
    {
      label: "Appointments Booked",
      value: appointmentsBooked,
      trend: "Sorted by created_at DESC",
      icon: CalendarIcon,
      tone: "emerald",
      progress: Math.round((appointmentsBooked / peakCount) * 100),
    },
    {
      label: "Success Rate",
      value: bookingSuccessRate,
      suffix: "%",
      trend: "Confirmed appointments",
      icon: SparkIcon,
      tone: "violet",
      progress: bookingSuccessRate,
    },
    {
      label: "Active Patients",
      value: activePatients,
      trend: "Unique phone numbers",
      icon: UsersIcon,
      tone: "amber",
      progress: Math.round((activePatients / peakCount) * 100),
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
  const toneStyles = kpiToneStyles[kpi.tone];

  return (
    <article className={`group relative overflow-hidden rounded-[1.4rem] border border-white/70 bg-gradient-to-br p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,23,42,0.12)] ${toneStyles.card}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-70" />
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {kpi.label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {animatedValue}
            {kpi.suffix}
          </p>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            {kpi.trend}
          </p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-[1.15rem] ${toneStyles.icon} transition duration-300 group-hover:scale-105`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div
          aria-label={`${kpi.label} progress`}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/80 shadow-inner"
          role="progressbar"
          aria-valuenow={kpi.progress ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${toneStyles.progress}`}
            style={{ width: `${kpi.progress ?? 0}%` }}
          />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {kpi.progress ?? 0}%
        </span>
      </div>
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
  const [currentTime, setCurrentTime] = useState(() => new Date());

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

  useEffect(() => {
    const tick = () => setCurrentTime(new Date());

    tick();

    const intervalId = window.setInterval(tick, 1000);

    return () => {
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_30%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_28%,#ffffff_70%)] px-4 py-4 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
        <header className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-slate-950 px-5 py-4 text-white shadow-[0_24px_64px_rgba(15,23,42,0.22)] sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.28),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.24),_transparent_26%)]" />
          <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_auto] lg:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] border border-white/10 bg-white/10 text-sm font-semibold tracking-tight text-white shadow-[0_14px_30px_rgba(15,23,42,0.24)] backdrop-blur">
                SR
              </div>
              <div className="max-w-4xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 backdrop-blur">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  AI Receptionist Online
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-[2.65rem]">
                  SriCare front desk
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[0.95rem]">
                  Live appointment handling for clinic owners watching the front desk in real time.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <div className="rounded-[1.15rem] border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                      Current date
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-white">
                      {formatHeroDate(currentTime)}
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                      Current time
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-white">
                      {formatHeroTime(currentTime)}
                    </p>
                  </div>
                  <div className="rounded-[1.15rem] border border-white/10 bg-white/10 px-4 py-2.5 backdrop-blur">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                      Last synced
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-white">
                      {formatLastUpdated(lastUpdated)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative rounded-[1.35rem] border border-white/10 bg-white/10 p-3.5 backdrop-blur">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:min-w-[230px]">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-3.5 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Dashboard mode
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-white">
                    Front desk live view
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 px-3.5 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                    Appointments tracked
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-white">
                    {appointments.length}
                  </p>
                </div>
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

        <section className="grid gap-5 xl:grid-cols-[minmax(0,8.8fr)_minmax(280px,2.2fr)]">
          <article className="overflow-hidden rounded-[1.85rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.09)]">
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-6 py-5 sm:px-7 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
                  Incoming appointments
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Recent appointments
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  The first screen a clinic owner should focus on during a demo.
                </p>
              </div>
              <div className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
                Incoming queue
              </div>
            </div>

            {error ? (
              <div className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm text-rose-700 sm:px-7">
                {error}
              </div>
            ) : null}

            {isLoading ? (
              <div className="grid min-h-[620px] place-items-center px-6 py-16 sm:px-7">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-sky-100 bg-sky-50 text-sky-600 shadow-[0_12px_28px_rgba(37,99,235,0.12)]">
                    <ClipboardPulseIcon className="h-7 w-7 animate-pulse" />
                  </div>
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                    Syncing live data
                  </p>
                  <p className="text-base font-semibold text-slate-950">
                    Loading appointments...
                  </p>
                </div>
              </div>
            ) : appointments.length > 0 ? (
              <div className="max-h-[860px] overflow-auto">
                <table className="w-full min-w-[1400px] border-collapse text-left">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-50/95 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 backdrop-blur supports-[backdrop-filter]:bg-slate-50/90">
                      <th className="sticky top-0 border-b border-slate-200 px-6 py-4 sm:px-7 bg-inherit">Patient Name</th>
                      <th className="sticky top-0 border-b border-slate-200 px-6 py-4 sm:px-7 bg-inherit">Phone Number</th>
                      <th className="sticky top-0 border-b border-slate-200 px-6 py-4 sm:px-7 bg-inherit">Department</th>
                      <th className="sticky top-0 border-b border-slate-200 px-6 py-4 sm:px-7 bg-inherit">Doctor</th>
                      <th className="sticky top-0 border-b border-slate-200 px-6 py-4 sm:px-7 bg-inherit">Appointment Date</th>
                      <th className="sticky top-0 border-b border-slate-200 px-6 py-4 sm:px-7 bg-inherit">Appointment Time</th>
                      <th className="sticky top-0 border-b border-slate-200 px-6 py-4 sm:px-7 bg-inherit">Status</th>
                      <th className="sticky top-0 border-b border-slate-200 px-6 py-4 sm:px-7 bg-inherit">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {appointments.map((appointment) => {
                      const status = getAppointmentStatus(appointment.status);

                      return (
                        <tr
                          key={appointment.id}
                          className="text-[0.95rem] text-slate-700 transition-colors duration-200 hover:bg-sky-50/60"
                        >
                          <td className="whitespace-nowrap px-6 py-5 sm:px-7">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-600 to-blue-700 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(37,99,235,0.18)]">
                                {getInitials(appointment.patient_name)}
                              </span>
                              <span className="font-semibold text-slate-950">
                                {appointment.patient_name ?? "Not provided"}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-5 sm:px-7">
                            {appointment.phone_number ?? "Not provided"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-5 sm:px-7">
                            {appointment.department ?? "Not provided"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-5 sm:px-7">
                            {appointment.doctor ?? "Not provided"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-5 font-medium text-slate-950 sm:px-7">
                            {formatAppointmentDate(appointment.appointment_date)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-5 font-medium text-slate-950 sm:px-7">
                            {appointment.appointment_time ?? "Not provided"}
                          </td>
                          <td className="whitespace-nowrap px-6 py-5 sm:px-7">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-5 sm:px-7">
                            {appointment.source ?? "Not provided"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid min-h-[700px] place-items-center px-6 py-16 sm:px-7">
                <div className="max-w-xl rounded-[2rem] border border-sky-100 bg-gradient-to-b from-sky-50 via-white to-white p-10 text-center shadow-[0_18px_45px_rgba(37,99,235,0.12)]">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-sky-600 to-blue-700 text-white shadow-[0_18px_38px_rgba(37,99,235,0.2)]">
                    <ClipboardPulseIcon className="h-10 w-10" />
                  </div>
                  <p className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
                    Waiting for first patient booking
                  </p>
                  <p className="mt-4 text-sm leading-7 text-slate-500">
                    New appointments from Supabase will appear here automatically once the first patient books.
                  </p>
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
                      Live sync
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
                      Premium onboarding
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
                      No manual refresh
                    </div>
                  </div>
                </div>
              </div>
            )}
          </article>

          <aside className="flex flex-col gap-6">
            <article className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
              <div className="bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.2),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.16),_transparent_28%)] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
                      Latest appointment
                    </p>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                      {latestAppointment?.patient_name ?? "Waiting for first patient booking"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      What the front desk should see first.
                    </p>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-3 text-sky-100 backdrop-blur">
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                </div>

                {latestAppointment ? (
                  <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          Patient Name
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {latestAppointment.patient_name ?? "Not provided"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          Phone Number
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {latestAppointment.phone_number ?? "Not provided"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          Department
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {latestAppointment.department ?? "Not provided"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          Doctor
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {latestAppointment.doctor ?? "Not provided"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          Appointment Date
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {formatAppointmentDate(latestAppointment.appointment_date)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          Appointment Time
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {latestAppointment.appointment_time ?? "Not provided"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          Status
                        </p>
                        <div className="mt-2 inline-flex">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[getAppointmentStatus(latestAppointment.status)]}`}
                          >
                            {getAppointmentStatus(latestAppointment.status)}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                          Received
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {formatReceivedTime(latestAppointment.created_at)}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/10 px-5 py-8 text-center backdrop-blur">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white/10 text-white shadow-[0_16px_36px_rgba(15,23,42,0.2)]">
                      <ClipboardPulseIcon className="h-8 w-8" />
                    </div>
                    <p className="mt-5 text-lg font-semibold text-white">
                      Waiting for first patient booking
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      The latest appointment card will populate here once the first live booking arrives.
                    </p>
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
                    Reception status
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                    AI receptionist status
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Keep the assistant, sync, and queue state visible at a glance.
                  </p>
                </div>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Live
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-600">
                        <ClipboardPulseIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          Appointments tracked
                        </p>
                        <p className="text-2xl font-semibold tracking-tight text-slate-950">
                          {appointments.length}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Queue</div>
                  </div>
                </div>

                <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600">
                        <SparkIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          Confirmed bookings
                        </p>
                        <p className="text-2xl font-semibold tracking-tight text-slate-950">
                          {confirmedAppointments}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Today</div>
                  </div>
                </div>

                <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-amber-50 p-2.5 text-amber-600">
                        <PhoneIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          Calls handled today
                        </p>
                        <p className="text-2xl font-semibold tracking-tight text-slate-950">
                          {callsHandledToday}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Calls</div>
                  </div>
                </div>

                <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-violet-50 p-2.5 text-violet-600">
                        <UsersIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          Active patients
                        </p>
                        <p className="text-2xl font-semibold tracking-tight text-slate-950">
                          {kpis[3]?.value ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Patients</div>
                  </div>
                </div>

                <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50/80 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-slate-900 p-2.5 text-white">
                        <CalendarIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500">
                          Last updated
                        </p>
                        <p className="text-sm font-semibold text-slate-950">
                          {formatLastUpdated(lastUpdated)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Sync</div>
                  </div>
                </div>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
