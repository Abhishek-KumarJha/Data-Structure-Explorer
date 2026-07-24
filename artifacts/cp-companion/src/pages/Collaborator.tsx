import { Users, Github, Code2, ChevronRight } from 'lucide-react';
import Page from '../components/layout/Page';

export default function Collaborator() {
  return (
    <Page
      eyebrow="Collaborator"
      title="Study with a partner."
      description="Pair sessions and collaborative practice — coming soon."
    >
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-8 py-24 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Users size={28} />
        </div>
        <h2 className="text-2xl font-bold">Collaborative sessions</h2>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          Real-time pair programming sessions, shared problem lists, and collaborative revision queues are in development.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground opacity-50 cursor-not-allowed">
            <Users size={15} /> Start a session
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold opacity-50 cursor-not-allowed">
            <Github size={15} /> Connect GitHub
          </button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Track updates on the roadmap. <ChevronRight className="inline" size={12} />
        </p>
      </div>
    </Page>
  );
}
