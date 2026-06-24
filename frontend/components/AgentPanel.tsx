type Status = "idle" | "streaming" | "done";

export default function AgentPanel({
  label,
  text,
  status,
  sources,
}: {
  label: string;
  text: string;
  status: Status;
  sources: string[];
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-emerald-300">{label}</h3>
        <Badge status={status} />
      </div>
      {text ? (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">
          {text}
          {status === "streaming" && <span className="ml-0.5 animate-pulse">▍</span>}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-800" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-neutral-800" />
        </div>
      )}
      {sources.length > 0 && (
        <p className="mt-3 text-xs text-neutral-500">Grounded in: {sources.join(", ")}</p>
      )}
    </div>
  );
}

function Badge({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    idle: "bg-neutral-700 text-neutral-300",
    streaming: "bg-amber-500/20 text-amber-300",
    done: "bg-emerald-500/20 text-emerald-300",
  };
  const label = { idle: "queued", streaming: "analyzing…", done: "done" }[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs ${map[status]}`}>{label}</span>;
}
