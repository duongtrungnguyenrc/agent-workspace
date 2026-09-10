import { useState } from "react";
import { PlusIcon } from "lucide-react";
import type { TicketKind, TicketListItem, TicketType } from "../types/kanban";
import { formatKind, formatType, ticketCode } from "../lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

interface TicketComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: TicketType[];
  kinds: TicketKind[];
  tickets: TicketListItem[];
  onCreate: (data: Record<string, FormDataEntryValue>) => Promise<void>;
}

const NONE = "__none__";

export function eligibleParents(type: TicketType, tickets: TicketListItem[], excludeId?: number) {
  if (type === "feature") return tickets.filter((ticket) => ticket.type === "group" && ticket.id !== excludeId);
  if (type === "task") return tickets.filter((ticket) => ["group", "feature"].includes(ticket.type) && ticket.id !== excludeId);
  return [];
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid min-w-0 gap-1.5 ${className || ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function TicketComposer({ open, onOpenChange, types, kinds, tickets, onCreate }: TicketComposerProps) {
  const [type, setType] = useState<TicketType>("group");
  const [parentId, setParentId] = useState(NONE);
  const [kind, setKind] = useState(NONE);
  const [busy, setBusy] = useState(false);
  const parents = eligibleParents(type, tickets);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>New ticket</SheetTitle>
          <SheetDescription>
            Capture a group, feature, or task with its source context. Task execution plans use top-level checklist items.
          </SheetDescription>
        </SheetHeader>
        <form
          className="grid gap-4 px-4 pb-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = Object.fromEntries(new FormData(form).entries());
            data.type = type;
            if (parentId !== NONE) data.parent_id = parentId;
            else delete data.parent_id;
            if (kind !== NONE) data.kind = kind;
            else delete data.kind;
            setBusy(true);
            try {
              await onCreate(data);
              form.reset();
              setType("group");
              setParentId(NONE);
              setKind(NONE);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Title">
            <Input name="title" required autoFocus placeholder="Verb + noun, e.g. Approve Order" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Type">
              <Select
                value={type}
                onValueChange={(value) => {
                  setType(value as TicketType);
                  setParentId(NONE);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((item) => (
                    <SelectItem key={item} value={item}>
                      {formatType(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Kind">
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{type === "task" ? "Auto-detect" : "None"}</SelectItem>
                  {kinds.map((item) => (
                    <SelectItem key={item} value={item}>
                      {formatKind(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Parent">
              <Select value={parentId} onValueChange={setParentId} disabled={type === "group"}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {parents.map((ticket) => (
                    <SelectItem key={ticket.id} value={String(ticket.id)}>
                      {ticketCode(ticket)} · {ticket.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Raw requirement">
            <Textarea name="raw_requirement" rows={3} placeholder="Paste the original request or note" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Source type">
              <Input name="source_type" placeholder="jira, linear, github" />
            </Field>
            <Field label="Source id">
              <Input name="source_id" placeholder="PROJ-123" />
            </Field>
            <Field label="Source URL">
              <Input name="source_url" placeholder="https://" />
            </Field>
          </div>
          <Field label="Source snapshot">
            <Textarea name="source_snapshot" rows={4} />
          </Field>
          <Field label="Source evidence (JSON)">
            <Textarea
              name="source_evidence"
              rows={3}
              className="font-mono text-xs"
              placeholder='[{"type":"image","url":"https://…","label":"Screenshot"}]'
            />
          </Field>
          <Field label="Specification">
            <Textarea name="specification" rows={8} placeholder="Markdown" />
          </Field>
          {type === "task" ? (
            <Field label="Execution plan">
              <Textarea
                name="execution_plan"
                rows={8}
                className="font-mono text-xs"
                placeholder={"# Execution Plan\n\n- [ ] Inspect affected scope\n- [ ] Implement change\n- [ ] Verify behavior"}
              />
            </Field>
          ) : null}
          <SheetFooter className="flex-row justify-end px-0">
            <Button type="submit" disabled={busy}>
              <PlusIcon /> Create ticket
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
