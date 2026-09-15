"use client";

import type { AuditEvent, Paginated } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  rowHoverClass,
  tableWrapClass,
  tbodyRowClass,
  tdClass,
  theadRowClass,
  thClass,
} from "@/components/ui/styles";

export function AuditView({
  initialPage,
}: {
  initialPage: Paginated<AuditEvent>;
}) {
  return (
    <section className="space-y-4">
      <PageHeader
        title="Auditoría"
        description="Eventos de seguridad y cambios realizados en la organización."
      />
      <p className="text-sm text-muted">
        {initialPage.meta.total} eventos registrados
      </p>
      <div className={tableWrapClass}>
        <table className="w-full text-sm">
          <caption className="sr-only">Registro de auditoría</caption>
          <thead>
            <tr className={theadRowClass}>
              <th className={thClass}>Fecha</th>
              <th className={thClass}>Acción</th>
              <th className={thClass}>Resultado</th>
              <th className={thClass}>Objetivo</th>
            </tr>
          </thead>
          <tbody className={tbodyRowClass}>
            {initialPage.data.map((event) => (
              <tr key={event.id} className={rowHoverClass}>
                <td className={tdClass}>{formatDate(event.occurredAt)}</td>
                <td className={tdClass}>
                  <p className="font-medium text-foreground">{event.action}</p>
                  <p className="text-xs text-muted">
                    {event.actorType}
                    {event.actorId ? ` · ${event.actorId}` : ""}
                  </p>
                </td>
                <td className={tdClass}><Outcome outcome={event.outcome} /></td>
                <td className={tdClass}>{target(event)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function target(event: AuditEvent): string {
  if (!event.targetType) return "—";
  return `${event.targetType}${event.targetId ? ` · ${event.targetId}` : ""}`;
}

function Outcome({ outcome }: { outcome: AuditEvent["outcome"] }) {
  const tone = outcome === "SUCCEEDED" ? "success" : outcome === "DENIED" ? "warning" : "danger";
  const label = outcome === "SUCCEEDED" ? "Correcto" : outcome === "DENIED" ? "Denegado" : "Fallido";
  return <Badge tone={tone}>{label}</Badge>;
}
