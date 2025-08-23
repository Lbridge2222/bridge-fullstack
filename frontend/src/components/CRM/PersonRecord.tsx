import React, { useEffect, useState, useMemo } from 'react';
import { peopleApi, PersonEnriched } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Mail, Phone, Building2, MapPin, Zap, Calendar, FileText, Users, ChevronRight } from 'lucide-react';

type Props = {
  personId: string;
};

export const PersonRecord: React.FC<Props> = ({ personId }) => {
  const [person, setPerson] = useState<(PersonEnriched & Record<string, any>) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    peopleApi
      .getPersonEnriched(personId)
      .then((data) => {
        if (mounted) setPerson(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load person'))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [personId]);

  const initials = useMemo(() => {
    const f = person?.first_name?.[0] || '';
    const l = person?.last_name?.[0] || '';
    return `${f}${l}`.toUpperCase() || '?';
  }, [person]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading…</div>
    );
  }
  if (error) {
    return (
      <div className="p-6 text-sm text-destructive">{error}</div>
    );
  }
  if (!person) {
    return (
      <div className="p-6 text-sm text-muted-foreground">No data.</div>
    );
  }

  return (
    <div className="min-w-[760px] max-w-[960px]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center text-foreground font-bold border border-border">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">{`${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed Person'}</h2>
                <Badge variant="secondary" className="capitalize">{person.lifecycle_state}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                {person.email && (
                  <div className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{person.email}</div>
                )}
                {person.phone && (
                  <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{person.phone}</div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-md bg-accent/10 text-accent text-sm flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span>{Math.round((person.conversion_probability || 0) * 100)}% convert</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-12 gap-4 p-6">
        {/* Left column */}
        <div className="col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Core Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="text-muted-foreground">Programme</div>
                <div className="font-medium text-foreground">{person.latest_programme_name || '—'}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Campus</div>
                <div className="font-medium text-foreground">{person.latest_campus_name || '—'}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Academic Year</div>
                <div className="font-medium text-foreground">{person.latest_academic_year || '—'}</div>
              </div>
              <Separator />
              <div className="text-sm">
                <div className="text-muted-foreground">Latest Application Stage</div>
                <div className="font-medium text-foreground">{person.latest_application_stage || '—'}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center column */}
        <div className="col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground truncate">{person.last_activity_title || 'No recent activity'}</div>
                  <div className="text-xs text-muted-foreground">{person.last_activity_kind || '—'}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-muted text-center">
                <div className="text-xl font-semibold text-foreground">{person.lead_score ?? 0}</div>
                <div className="text-xs text-muted-foreground">Lead Score</div>
              </div>
              <div className="p-3 rounded-md bg-muted text-center">
                <div className="text-xl font-semibold text-foreground">{Math.round((person.conversion_probability || 0) * 100)}%</div>
                <div className="text-xs text-muted-foreground">Conversion</div>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <Button className="flex-1" variant="default"><Mail className="h-4 w-4 mr-2" />Email</Button>
            <Button className="flex-1" variant="secondary"><Phone className="h-4 w-4 mr-2" />Call</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonRecord;


