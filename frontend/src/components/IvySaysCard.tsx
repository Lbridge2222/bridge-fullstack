import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  summary?: string;
  chips?: string[];
}

export default function IvySaysCard({ summary, chips = [] }: Props) {
  if (!summary) return null;
  return (
    <Card className="rounded-2xl shadow-sm border">
      <CardContent className="p-5 space-y-3">
        <div className="text-sm text-muted-foreground">Ivy says</div>
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, "<br/>") }} />
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {chips.map((c, i) => <Badge key={i} variant="secondary" className="rounded-2xl">{c}</Badge>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
