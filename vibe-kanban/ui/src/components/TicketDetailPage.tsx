import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  GitCommitHorizontalIcon,
  ImageIcon,
  MessageSquareTextIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { eventLabel, eventSummary, eventTone } from "../lib/events";
import { formatDate, formatKind, formatLocalReview, formatStatus, formatType, progressFor, ticketCode } from "../lib/format";
import { Markdown } from "../lib/markdown";
import { kindTone, mutedTextClass, statusTone, ticketCodeClass, tone, typeTone } from "../lib/styles";
import type { TicketDetail, TicketKind, TicketListItem, TicketStatus, TicketType } from "../types/kanban";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";
import { ExternalLink } from "./ExternalLink";
import { LinkText } from "./LinkText";
import { PlanStepper } from "./PlanStepper";
import { ProgressBar } from "./ProgressBar";
import { Field, eligibleParents } from "./TicketComposer";

interface TicketDetailPageProps {
  ticket: TicketDetail;
  tickets: TicketListItem[];
  statuses: TicketStatus[];
  types: TicketType[];
  kinds: TicketKind[];
  onBack: () => void;
  onOpen: (id: number) => void;
  onMove: (id: number, status: TicketStatus) => Promise<void>;
  onAction: (id: number, action: string, body?: Record<string, unknown>) => Promise<void>;
  onSave: (id: number, data: Record<string, FormDataEntryValue | string>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const NONE = "__none__";

function Property({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-start gap-3 border-b py-2 text-sm last:border-b-0 max-sm:grid-cols-1 max-sm:gap-0.5">
      <span className="text-xs leading-5 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words font-medium">{value || <span className="text-muted-foreground">None</span>}</span>
    </div>
  );
}

function SectionCard({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("gap-3 py-4", className)}>
      <CardHeader className="flex items-center justify-between gap-3 px-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}

function derivedCommitUrl(prUrl: string | null, hash: string) {
  const match = prUrl?.match(/^(https?:\/\/(?:github\.com|gitlab\.com)\/[^/]+\/[^/]+)\//i);
  return match ? `${match[1]}/commit/${hash}` : null;
}

function textValue(value: string | null | undefined) {
  return value || "";
}

export function TicketDetailPage({ ticket, tickets, statuses, types, kinds, onBack, onOpen, onMove, onAction, onSave, onDelete }: TicketDetailPageProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editType, setEditType] = useState<TicketType>(ticket.type);
  const [editKind, setEditKind] = useState<string>(ticket.kind || NONE);
  const [editParent, setEditParent] = useState<string>(ticket.parent_id ? String(ticket.parent_id) : NONE);
  const [comment, setComment] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [tab, setTab] = useState("overview");
  const parents = eligibleParents(editType, tickets, ticket.id);
  const progress = progressFor(ticket);
  const isTask = ticket.type === "task";
  const needsApproval = isTask && !ticket.user_reviewed;
  const specification = textValue(ticket.specification);
  const executionPlan = textValue(ticket.execution_plan);
  const sourceSnapshot = textValue(ticket.source_snapshot);
  const sourceEvidence = ticket.source_evidence || [];
  const actionItems = textValue(ticket.action_items);
  const userComments = textValue(ticket.user_comments);
  const openQuestions = textValue(ticket.open_questions);
  const planSteps = ticket.plan_steps || [];
  const hasExecutionPlan = executionPlan.trim().length > 0;
  const canApprove = hasExecutionPlan && planSteps.length > 0;
  const completedSteps = planSteps.filter((step) => step.status === "completed").length;
  const localReview = ticket.local_review || "pending";
  const reviewRequested = isTask && localReview === "requested";
  const localReviewTone = localReview === "confirmed" ? "emerald" : localReview === "requested" ? "orange" : localReview === "changes_requested" ? "amber" : "neutral";

  useEffect(() => {
    setEditOpen(false);
    setDeleteOpen(false);
    setEditType(ticket.type);
    setEditKind(ticket.kind || NONE);
    setEditParent(ticket.parent_id ? String(ticket.parent_id) : NONE);
    setComment("");
    setReviewNote("");
    setTab("overview");
  }, [ticket.id, ticket.type, ticket.kind, ticket.parent_id]);

  return (
    <section className="grid gap-4">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Button variant="ghost" size="sm" className="-ml-2 h-7 px-2" onClick={onBack}>
              <ArrowLeftIcon /> Board
            </Button>
            {ticket.parent ? (
              <>
                <ChevronRightIcon className="size-3" />
                <button className="truncate hover:text-foreground hover:underline" type="button" onClick={() => onOpen(ticket.parent!.id)}>
                  {ticketCode(ticket.parent)} · {ticket.parent.title}
                </button>
              </>
            ) : null}
          </nav>
          <span className={cn(ticketCodeClass, "mt-3 block")}>{ticketCode(ticket)}</span>
          <h1 className="my-1 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{ticket.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={typeTone[ticket.type]}>{formatType(ticket.type)}</Badge>
            {ticket.kind ? <Badge tone={kindTone[ticket.kind]}>{formatKind(ticket.kind)}</Badge> : null}
            <Badge tone={statusTone[ticket.status]} className="capitalize">
              {formatStatus(ticket.status)}
            </Badge>
            {isTask ? (
              <Badge tone={ticket.user_reviewed ? "emerald" : "orange"}>{ticket.user_reviewed ? "Approved" : "Needs review"}</Badge>
            ) : null}
            {isTask && localReview !== "pending" ? <Badge tone={localReviewTone}>{formatLocalReview(localReview)}</Badge> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          <Select value={ticket.status} onValueChange={(value) => onMove(ticket.id, value as TicketStatus)}>
            <SelectTrigger className="w-40 capitalize" aria-label="Ticket status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status} value={status} className="capitalize">
                  <span className={cn("size-2 rounded-full", tone(statusTone[status]).fill)} />
                  {formatStatus(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {needsApproval ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button disabled={!canApprove} onClick={() => onAction(ticket.id, "approve")}>
                    <CheckIcon /> Approve
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {canApprove ? "Approve this plan for implementation" : "The execution plan needs at least one top-level checklist step"}
              </TooltipContent>
            </Tooltip>
          ) : null}
          {reviewRequested ? (
            <Button onClick={() => onAction(ticket.id, "local-review", { status: "confirmed", actor: "user" })}>
              <ClipboardCheckIcon /> Confirm local review
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <PencilIcon /> Edit
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2Icon /> Delete
          </Button>
        </div>
      </header>

      <Card className="gap-2 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-sm font-semibold">{isTask ? "Implementation progress" : "Progress"}</span>
            <p className="m-0 text-xs text-muted-foreground">
              {isTask && planSteps.length
                ? `${completedSteps} of ${planSteps.length} plan steps completed`
                : "Derived from status and recorded progress"}
            </p>
          </div>
          <span className="text-xl font-semibold tabular-nums">{progress}%</span>
        </div>
        <ProgressBar percent={progress} tone={statusTone[ticket.status]} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="grid content-start gap-4">
          <SectionCard title="Properties">
            <Property label="Type" value={formatType(ticket.type)} />
            <Property label="Kind" value={ticket.kind ? formatKind(ticket.kind) : null} />
            <Property
              label="Parent"
              value={
                ticket.parent ? (
                  <button className="text-left text-primary hover:underline" type="button" onClick={() => onOpen(ticket.parent!.id)}>
                    {ticketCode(ticket.parent)} · {ticket.parent.title}
                  </button>
                ) : null
              }
            />
            <Property label="Branch" value={ticket.branch ? <code className="font-mono text-xs">{ticket.branch}</code> : null} />
            <Property
              label="Base commit"
              value={ticket.base_commit ? <ExternalLink url={derivedCommitUrl(ticket.pr_url, ticket.base_commit)} label={ticket.base_commit.slice(0, 12)} className="font-mono text-xs" /> : null}
            />
            <Property
              label="Head commit"
              value={ticket.head_commit ? <ExternalLink url={derivedCommitUrl(ticket.pr_url, ticket.head_commit)} label={ticket.head_commit.slice(0, 12)} className="font-mono text-xs" /> : null}
            />
            <Property label="PR" value={ticket.pr_url ? <ExternalLink url={ticket.pr_url} label={ticket.pr_number ? `PR #${ticket.pr_number}` : undefined} /> : ticket.pr_number} />
            <Property label="PR status" value={ticket.pr_status} />
            <Property label="Pipeline" value={ticket.pipeline_status} />
            <Property label="Updated" value={formatDate(ticket.updated_at)} />
          </SectionCard>

          <SectionCard title={`Child tickets${ticket.children.length ? ` · ${ticket.children.length}` : ""}`}>
            {ticket.children.length ? (
              <div className="grid gap-1.5">
                {ticket.children.map((child) => (
                  <button
                    className="grid min-w-0 gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-accent"
                    key={child.id}
                    type="button"
                    onClick={() => onOpen(child.id)}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={ticketCodeClass}>{ticketCode(child)}</span>
                      <Badge tone={statusTone[child.status]} className="capitalize">
                        {formatStatus(child.status)}
                      </Badge>
                    </span>
                    <strong className="min-w-0 truncate text-sm font-medium">{child.title}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <p className={mutedTextClass}>No child tickets.</p>
            )}
          </SectionCard>

          <SectionCard title="Source ticket">
            <Property label="System" value={ticket.source_type} />
            <Property label="Id" value={ticket.source_id} />
            <Property label="URL" value={<ExternalLink url={ticket.source_url} />} />
            <div className="mt-3 max-h-72 overflow-auto rounded-lg bg-muted/60 p-3">
              {sourceSnapshot ? <Markdown value={sourceSnapshot} /> : <span className="text-sm text-muted-foreground">No source snapshot.</span>}
            </div>
            {sourceEvidence.length ? (
              <div className="mt-3 grid gap-3">
                {sourceEvidence.map((evidence, index) => (
                  <figure className="m-0 overflow-hidden rounded-lg border bg-muted/40" key={`${evidence.url}-${index}`}>
                    {evidence.type === "image" ? (
                      <a href={evidence.url} target="_blank" rel="noreferrer">
                        <img className="max-h-64 w-full bg-background object-contain" src={evidence.url} alt={evidence.label || `Source evidence ${index + 1}`} loading="lazy" />
                      </a>
                    ) : null}
                    <figcaption className="grid gap-0.5 p-2.5 text-sm">
                      <span className="flex items-center gap-1.5">
                        {evidence.type === "image" ? <ImageIcon className="size-3.5 text-muted-foreground" /> : null}
                        <ExternalLink url={evidence.url} label={evidence.label || `Evidence ${index + 1}`} />
                      </span>
                      {evidence.description ? <span className="text-xs leading-5 text-muted-foreground">{evidence.description}</span> : null}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
          </SectionCard>
        </aside>

        <div className="min-w-0">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="line" className="mb-1 w-full justify-start overflow-x-auto">
              <TabsTrigger value="overview" className="flex-none">
                Overview
              </TabsTrigger>
              {isTask ? (
                <TabsTrigger value="plan" className="flex-none">
                  Plan{planSteps.length ? <Badge tone={completedSteps === planSteps.length ? "emerald" : "neutral"} className="ml-1 px-1.5 py-0 text-[10px]">{completedSteps}/{planSteps.length}</Badge> : null}
                </TabsTrigger>
              ) : null}
              <TabsTrigger value="delivery" className="flex-none">
                Delivery{ticket.commits.length ? <Badge tone="neutral" className="ml-1 px-1.5 py-0 text-[10px]">{ticket.commits.length}</Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex-none">
                Activity{ticket.events.length ? <Badge tone="neutral" className="ml-1 px-1.5 py-0 text-[10px]">{ticket.events.length}</Badge> : null}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="grid gap-4">
              {isTask && localReview !== "pending" ? (
                <SectionCard
                  title={<span className={cn(reviewRequested && "text-orange-600 dark:text-orange-400")}>{formatLocalReview(localReview)}</span>}
                  className={cn(reviewRequested && "border-orange-500/30 bg-orange-500/5")}
                >
                  {ticket.local_review_note ? <Markdown value={ticket.local_review_note} /> : <p className={mutedTextClass}>No review notes recorded.</p>}
                  {reviewRequested ? (
                    <form
                      className="mt-4 grid gap-2"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        await onAction(ticket.id, "local-review", { status: "changes_requested", actor: "user", description: reviewNote.trim() || "Changes requested during local review" });
                        setReviewNote("");
                      }}
                    >
                      <p className="m-0 text-xs text-muted-foreground">Review the change locally first. Confirm to let the agent commit and open a PR, or send it back with notes.</p>
                      <Textarea value={reviewNote} rows={3} placeholder="What should change before commit?" onChange={(event) => setReviewNote(event.target.value)} />
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="submit" variant="outline">Request changes</Button>
                        <Button type="button" onClick={() => onAction(ticket.id, "local-review", { status: "confirmed", actor: "user" })}>
                          <ClipboardCheckIcon /> Confirm local review
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </SectionCard>
              ) : null}
              {openQuestions.trim() ? (
                <SectionCard title={<span className="text-amber-600 dark:text-amber-400">Open questions</span>} className="border-amber-500/30 bg-amber-500/5">
                  <Markdown value={openQuestions} />
                </SectionCard>
              ) : null}
              <SectionCard title="Specification">
                <Markdown value={specification} />
              </SectionCard>
              {needsApproval ? (
                <SectionCard title="Review feedback">
                  <form
                    className="grid gap-3"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const value = comment.trim();
                      if (!value) return;
                      await onAction(ticket.id, "comment", { comment: value, actor: "user" });
                      setComment("");
                    }}
                  >
                    <Textarea value={comment} rows={3} placeholder="Leave feedback for the agent before approving this task" onChange={(event) => setComment(event.target.value)} />
                    <div className="flex justify-end">
                      <Button type="submit" variant="secondary" disabled={!comment.trim()}>
                        <MessageSquareTextIcon /> Add comment
                      </Button>
                    </div>
                  </form>
                </SectionCard>
              ) : null}
              {userComments.trim() ? (
                <SectionCard title="User comments">
                  <Markdown value={userComments} />
                </SectionCard>
              ) : null}
            </TabsContent>

            {isTask ? (
              <TabsContent value="plan" className="grid gap-4">
                <SectionCard title="Execution steps">
                  <PlanStepper steps={planSteps} />
                </SectionCard>
                <SectionCard title="Execution plan">
                  <Markdown value={executionPlan} />
                </SectionCard>
              </TabsContent>
            ) : null}

            <TabsContent value="delivery" className="grid gap-4">
              <SectionCard title="Commits">
                {ticket.commits.length ? (
                  <ol className="m-0 grid list-none gap-1">
                    {ticket.commits.map((commit) => (
                      <li className="grid grid-cols-[16px_minmax(0,1fr)] items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-accent" key={commit.id}>
                        <GitCommitHorizontalIcon className="mt-1 size-4 text-muted-foreground" />
                        <div className="grid min-w-0 gap-0.5">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <ExternalLink url={commit.url || derivedCommitUrl(ticket.pr_url, commit.commit_hash)} label={commit.commit_hash.slice(0, 12)} className="font-mono text-xs" />
                            <span className="min-w-0 break-words text-sm">{commit.message || "No message"}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {commit.author || "Unknown"} · {commit.branch || "no branch"} · {formatDate(commit.created_at)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={mutedTextClass}>No commits recorded yet.</p>
                )}
              </SectionCard>
              <SectionCard title="Pull request and pipeline">
                <Property label="PR URL" value={<ExternalLink url={ticket.pr_url} />} />
                <Property label="PR number" value={ticket.pr_number} />
                <Property label="PR status" value={ticket.pr_status} />
                <Property label="Pipeline" value={ticket.pipeline_status} />
                <Property label="Pipeline URL" value={<ExternalLink url={ticket.pipeline_url} />} />
                {actionItems.trim() ? (
                  <div className="mt-3 rounded-lg bg-muted/60 p-3">
                    <h3 className="m-0 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Action items</h3>
                    <Markdown value={actionItems} />
                  </div>
                ) : null}
              </SectionCard>
            </TabsContent>

            <TabsContent value="activity">
              <SectionCard title="Activity history">
                {ticket.events.length ? (
                  <ol className="m-0 grid list-none gap-0">
                    {ticket.events
                      .slice()
                      .reverse()
                      .map((event) => {
                        const summary = eventSummary(event.type, event.payload);
                        return (
                          <li className="relative grid grid-cols-[14px_minmax(0,1fr)] gap-3 pb-4 last:pb-0" key={event.id}>
                            <span className="absolute top-3 bottom-0 left-[4px] w-px bg-border last:hidden" aria-hidden="true" />
                            <span className={cn("relative z-10 mt-1.5 size-2.5 rounded-full ring-4 ring-card", tone(eventTone(event.type)).fill)} />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                <strong className="text-sm font-semibold">{eventLabel(event.type)}</strong>
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  {event.actor} · {formatDate(event.created_at)}
                                </span>
                              </div>
                              {summary ? (
                                <p className="m-0 mt-0.5 break-words text-sm leading-6 text-foreground/80">
                                  <LinkText value={summary} />
                                </p>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                  </ol>
                ) : (
                  <p className={mutedTextClass}>No activity yet.</p>
                )}
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Edit {ticketCode(ticket)}</SheetTitle>
            <SheetDescription>Changing the specification or execution plan of an approved task invalidates its approval.</SheetDescription>
          </SheetHeader>
          <form
            className="grid gap-4 px-4 pb-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const data = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, FormDataEntryValue | string>;
              data.type = editType;
              data.kind = editKind === NONE ? "" : editKind;
              data.parent_id = editParent === NONE ? "" : editParent;
              if (data.progress_percent === "") delete data.progress_percent;
              await onSave(ticket.id, data);
              setEditOpen(false);
            }}
          >
            <Field label="Title">
              <Input name="title" defaultValue={ticket.title} required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Type">
                <Select value={editType} onValueChange={(value) => { setEditType(value as TicketType); setEditParent(NONE); }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {types.map((item) => (
                      <SelectItem key={item} value={item}>{formatType(item)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Kind">
                <Select value={editKind} onValueChange={setEditKind}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {kinds.map((item) => (
                      <SelectItem key={item} value={item}>{formatKind(item)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Parent">
                <Select value={editParent} onValueChange={setEditParent} disabled={editType === "group"}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {parents.map((candidate) => (
                      <SelectItem key={candidate.id} value={String(candidate.id)}>{ticketCode(candidate)} · {candidate.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Progress %">
                <Input name="progress_percent" type="number" min={0} max={100} defaultValue={ticket.progress_percent ?? ""} />
              </Field>
            </div>
            <Field label="Specification">
              <Textarea name="specification" rows={10} defaultValue={specification} />
            </Field>
            {editType === "task" ? (
              <Field label="Execution plan">
                <Textarea name="execution_plan" rows={10} defaultValue={executionPlan} className="font-mono text-xs" />
              </Field>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Source type"><Input name="source_type" defaultValue={ticket.source_type || ""} /></Field>
              <Field label="Source id"><Input name="source_id" defaultValue={ticket.source_id || ""} /></Field>
              <Field label="Source URL"><Input name="source_url" defaultValue={ticket.source_url || ""} /></Field>
            </div>
            <Field label="Source snapshot"><Textarea name="source_snapshot" rows={4} defaultValue={sourceSnapshot} /></Field>
            <Field label="Source evidence (JSON)">
              <Textarea name="source_evidence" rows={4} className="font-mono text-xs" defaultValue={JSON.stringify(sourceEvidence, null, 2)} placeholder='[{"type":"image","url":"https://…","label":"Screenshot"}]' />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="PR URL"><Input name="pr_url" defaultValue={ticket.pr_url || ""} /></Field>
              <Field label="PR number"><Input name="pr_number" defaultValue={ticket.pr_number || ""} /></Field>
              <Field label="PR status"><Input name="pr_status" defaultValue={ticket.pr_status || ""} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Pipeline status"><Input name="pipeline_status" defaultValue={ticket.pipeline_status || ""} /></Field>
              <Field label="Pipeline URL"><Input name="pipeline_url" defaultValue={ticket.pipeline_url || ""} /></Field>
            </div>
            <Field label="Action items"><Textarea name="action_items" rows={3} defaultValue={actionItems} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="User comments"><Textarea name="user_comments" rows={4} defaultValue={userComments} /></Field>
              <Field label="Open questions"><Textarea name="open_questions" rows={4} defaultValue={openQuestions} /></Field>
            </div>
            <SheetFooter className="flex-row justify-end px-0">
              <Button type="submit">Save changes</Button>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {ticketCode(ticket)}?</AlertDialogTitle>
            <AlertDialogDescription>
              {ticket.children.length
                ? `This removes "${ticket.title}" together with its ${ticket.children.length} child ticket(s) and their descendants. `
                : `This removes "${ticket.title}". `}
              Activity history is kept for the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => onDelete(ticket.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
