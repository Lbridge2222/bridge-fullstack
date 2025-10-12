import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, MoreHorizontal, Phone, Mail, Calendar, Eye, 
  Users, GraduationCap, UserCheck, UserX, Clock, Star, 
  ChevronDown, ChevronUp, RefreshCw, Download, Settings,
  BookUser, MapPin, Calendar as CalendarIcon, Target, TrendingUp, BookmarkPlus
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { peopleApi, type PersonEnriched } from '@/services/api';
import { Skeleton, SkeletonCircle } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';

type LifecycleState = 'enquiry' | 'applicant' | 'enrolled' | 'alumni';
type ViewMode = 'table' | 'cards' | 'list';

const Directory: React.FC = () => {
  const navigate = useNavigate();
  const { push: toast } = useToast();
  const [people, setPeople] = useState<PersonEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'lead_score' | 'lifecycle_state'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleState | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  // Saved Views (localStorage)
  type DirSavedView = {
    id: string;
    name: string;
    description?: string;
    lifecycle: LifecycleState | 'all';
    sortBy: 'name' | 'created_at' | 'lead_score' | 'lifecycle_state';
    sortOrder: 'asc' | 'desc';
    search?: string;
    created?: string;
    lastUsed?: string;
  };
  const [savedViews, setSavedViews] = useState<DirSavedView[]>(() => {
    try { return JSON.parse(localStorage.getItem('directorySavedViews') || '[]') as DirSavedView[]; } catch { return []; }
  });
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);
  const persistViews = (views: DirSavedView[]) => {
    setSavedViews(views);
    localStorage.setItem('directorySavedViews', JSON.stringify(views));
  };
  const buildCurrentView = useCallback((name: string, description?: string): DirSavedView => ({
    id: crypto.randomUUID(),
    name,
    description,
    lifecycle: lifecycleFilter,
    sortBy,
    sortOrder,
    search: searchTerm || undefined,
    created: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  }), [lifecycleFilter, sortBy, sortOrder, searchTerm]);
  const applyView = useCallback((v: DirSavedView) => {
    setLifecycleFilter(v.lifecycle);
    setSortBy(v.sortBy);
    setSortOrder(v.sortOrder);
    setSearchTerm(v.search || '');
    setCurrentViewId(v.id);
    const next = savedViews.map(sv => sv.id === v.id ? { ...sv, lastUsed: new Date().toISOString() } : sv);
    persistViews(next);
    toast({ title: 'View applied', description: `"${v.name}" active`, variant: 'success' });
  }, [savedViews, toast]);
  const clearView = useCallback(() => { setCurrentViewId(null); toast({ title: 'View cleared' }); }, [toast]);
  // Save dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveForm, setSaveForm] = useState<{ name: string; description?: string }>({ name: '', description: '' });
  const saveCurrentView = useCallback(() => {
    if (!saveForm.name.trim()) return;
    const v = buildCurrentView(saveForm.name.trim(), saveForm.description?.trim() || undefined);
    const next = [v, ...savedViews];
    persistViews(next);
    setCurrentViewId(v.id);
    setShowSaveDialog(false);
    setSaveForm({ name: '', description: '' });
    toast({ title: 'View saved', description: `"${v.name}" added`, variant: 'success' });
  }, [buildCurrentView, savedViews, saveForm, toast]);
  // Manage dialog
  const [showManageDialog, setShowManageDialog] = useState(false);
  const deleteView = useCallback((id: string) => {
    const next = savedViews.filter(v => v.id !== id);
    persistViews(next);
    if (currentViewId === id) setCurrentViewId(null);
    toast({ title: 'View deleted', variant: 'default' });
  }, [savedViews, currentViewId, toast]);

  // Fetch all people
  const fetchPeople = useCallback(async () => {
    try {
      setLoading(true);
      const data = await peopleApi.getAllPeople({ limit: 200 });
      setPeople(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load people');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  // Keyboard: '/' focuses search, Escape clears
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isTyping = (el: EventTarget | null) => el && (el as HTMLElement).closest('input,textarea,[contenteditable="true"]');
      if (isTyping(e.target)) return;
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchTerm('');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Filter and sort people
  const filteredAndSortedPeople = useMemo(() => {
    let filtered = people.filter(person => {
      const matchesSearch = searchTerm === '' || 
        `${person.first_name} ${person.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLifecycle = lifecycleFilter === 'all' || person.lifecycle_state === lifecycleFilter;
      
      return matchesSearch && matchesLifecycle;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
          bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        case 'lead_score':
          aValue = a.lead_score || 0;
          bValue = b.lead_score || 0;
          break;
        case 'lifecycle_state':
          aValue = a.lifecycle_state || '';
          bValue = b.lifecycle_state || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [people, searchTerm, lifecycleFilter, sortBy, sortOrder]);

  const togglePersonSelection = useCallback((personId: string) => {
    setSelectedPeople(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPeople(new Set());
  }, []);

  const getLifecycleIcon = (state: string) => {
    switch (state) {
      case 'enquiry': return <UserCheck className="h-4 w-4" />;
      case 'applicant': return <GraduationCap className="h-4 w-4" />;
      case 'enrolled': return <Users className="h-4 w-4" />;
      case 'alumni': return <Star className="h-4 w-4" />;
      default: return <UserX className="h-4 w-4" />;
    }
  };

  const getLifecycleColor = (state: string) => {
    switch (state) {
      case 'enquiry': return 'bg-info/10 text-info border-info/20';
      case 'applicant': return 'bg-warning/10 text-warning border-warning/20';
      case 'enrolled': return 'bg-success/10 text-success border-success/20';
      case 'alumni': return 'bg-chart-4/10 text-chart-4 border-chart-4/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (error) return <div className="p-6 text-destructive">Error: {error}</div>;

  // Rail color by lifecycle
  const lifecycleToColor = (state?: string) => {
    switch ((state || '').toLowerCase()) {
      case 'enquiry': return 'hsl(var(--info))';
      case 'applicant': return 'hsl(var(--warning))';
      case 'enrolled': return 'hsl(var(--success))';
      case 'alumni': return 'hsl(var(--accent))';
      default: return 'hsl(var(--slate-400))';
    }
  };

  const ColorBar = ({ color, w = 6 }: { color: string; w?: number }) => (
    <div
      aria-hidden
      className="opacity-90 group-hover:opacity-100 transition-opacity"
      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w, borderTopLeftRadius: w, borderBottomLeftRadius: w, background: color, boxShadow: '0 0 0 1px rgba(0,0,0,0.03)' }}
    />
  );

  return (
    <TooltipProvider>
    <div className="flex h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky Glass Header */}
        <div className="relative bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 border-b border-border/30 sticky top-0 z-40 shadow-sm overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-56 w-56 rounded-full blur-2xl glow-white" />
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full blur-2xl glow-green" />

          {/* Title Row */}
          <div className="px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-xl lg:text-2xl font-bold text-foreground truncate">Directory</h1>
                <span className="text-sm text-muted-foreground tabular-nums">{filteredAndSortedPeople.length.toLocaleString()} people</span>
                {selectedPeople.size > 0 && (
                  <span className="text-xs bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] px-2 py-1 rounded-full font-medium">
                    {selectedPeople.size} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="default" onClick={fetchPeople} className="h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="default" className="h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all gap-2">
                      <BookmarkPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Views</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                      <BookmarkPlus className="h-4 w-4 mr-2" /> Save current view…
                    </DropdownMenuItem>
                    {savedViews.length > 0 && <div className="border-t my-1" />}
                    {savedViews.length > 0 && (
                      <div className="max-h-64 overflow-auto">
                        {savedViews.map(v => (
                          <DropdownMenuItem key={v.id} onClick={() => applyView(v)} className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{v.name}</div>
                              {v.description && <div className="text-xs text-muted-foreground truncate">{v.description}</div>}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{v.lastUsed ? new Date(v.lastUsed).toLocaleDateString() : ''}</span>
                          </DropdownMenuItem>
                        ))}
                      </div>
                    )}
                    <div className="border-t my-1" />
                    <DropdownMenuItem onClick={() => setShowManageDialog(true)}>Manage saved views…</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="default" className="h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="default" className="h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="px-4 lg:px-6 py-3 border-t border-border/30 bg-muted/10 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  ref={searchInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search people… (name, email, phone)"
                  className="w-full pl-10 h-9 text-sm border-border/50 bg-background/60 backdrop-blur-sm focus:ring-2 focus:ring-ring/50 focus:bg-background/80 transition-all"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={lifecycleFilter} onValueChange={(v) => setLifecycleFilter(v as LifecycleState | 'all')}>
                  <SelectTrigger className="w-40 h-9 border-border text-sm">
                    <SelectValue placeholder="Lifecycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Lifecycle</SelectItem>
                    <SelectItem value="enquiry">Enquiry</SelectItem>
                    <SelectItem value="applicant">Applicant</SelectItem>
                    <SelectItem value="enrolled">Enrolled</SelectItem>
                    <SelectItem value="alumni">Alumni</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-40 h-9 border-border text-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="created_at">Created</SelectItem>
                    <SelectItem value="lead_score">Score</SelectItem>
                    <SelectItem value="lifecycle_state">Lifecycle</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all"
                >
                  {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode(prev => prev === 'table' ? 'cards' : prev === 'cards' ? 'list' : 'table')}
                  className="h-9 px-3 text-sm bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all"
                >
                  {viewMode === 'table' ? 'Table' : viewMode === 'cards' ? 'Cards' : 'List'}
                </Button>
                {selectedPeople.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection} className="h-9 px-3 text-sm">Clear ({selectedPeople.size})</Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 xl:p-8">
          {loading ? (
            <Card className="overflow-hidden border-0 shadow-xl">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[40px_1.5fr_1fr_1fr_120px_1fr_1fr] gap-0 bg-slate-50 border-b px-3 py-2">
                      <Skeleton className="h-4 w-5" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16 justify-self-end" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="divide-y">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="grid grid-cols-[40px_1.5fr_1fr_1fr_120px_1fr_1fr] items-center px-3 py-3">
                          <Skeleton className="h-5 w-5 rounded-sm" />
                          <div className="flex items-center gap-3">
                            <SkeletonCircle size={32} />
                            <div className="flex-1 min-w-0">
                              <Skeleton className="h-4 w-40" />
                              <Skeleton className="h-3 w-24 mt-1" />
                            </div>
                          </div>
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16 justify-self-end" />
                          <Skeleton className="h-4 w-24" />
                          <div className="justify-self-start flex gap-2">
                            <Skeleton className="h-7 w-7 rounded-md" />
                            <Skeleton className="h-7 w-7 rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Results header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{filteredAndSortedPeople.length} people</h2>
                  {currentViewId && (
                    <Badge variant="secondary" className="px-2 py-1 text-xs">
                      {savedViews.find(v => v.id === currentViewId)?.name}
                      <Button variant="ghost" size="icon" className="h-5 w-5 ml-1" onClick={clearView} aria-label="Clear view">×</Button>
                    </Badge>
                  )}
                </div>
              </div>
              {/* Filter chips */}
              {(lifecycleFilter !== 'all' || searchTerm) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {lifecycleFilter !== 'all' && (
                    <Badge variant="secondary" className="px-3 py-1.5 text-xs shadow-sm">
                      Lifecycle: {lifecycleFilter}
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => setLifecycleFilter('all')} aria-label="Clear lifecycle filter">
                        ×
                      </Button>
                    </Badge>
                  )}
                  {searchTerm && (
                    <Badge variant="secondary" className="px-3 py-1.5 text-xs shadow-sm">
                      Search: {searchTerm}
                      <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => setSearchTerm('')} aria-label="Clear search">
                        ×
                      </Button>
                    </Badge>
                  )}
                </div>
              )}

              {/* Empty state */}
              {filteredAndSortedPeople.length === 0 && (
                <Card className="p-8 text-center">
                  <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Users className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">No people found</h3>
                  <p className="text-sm text-muted-foreground mb-4">Try clearing filters or adjusting your search.</p>
                  <div className="flex gap-2 justify-center">
                    {lifecycleFilter !== 'all' && (
                      <Button variant="outline" onClick={() => setLifecycleFilter('all')}>Clear lifecycle</Button>
                    )}
                    {searchTerm && (
                      <Button variant="outline" onClick={() => setSearchTerm('')}>Clear search</Button>
                    )}
                  </div>
                </Card>
              )}

        {/* Table View */}
        {viewMode === 'table' && (
          <Card className="overflow-hidden border-0 shadow-xl">
            <ScrollArea className="h-[calc(100vh-260px)]">
              <table className="w-full">
                <colgroup>
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <thead className="sticky top-0 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 z-10">
                  <tr>
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedPeople.size === filteredAndSortedPeople.length && filteredAndSortedPeople.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPeople(new Set(filteredAndSortedPeople.map(p => p.id)));
                          } else {
                            clearSelection();
                          }
                        }}
                      />
                    </th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Contact</th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Lifecycle</th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Score</th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Programme</th>
                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPeople.map((person) => {
                    const isSelected = selectedPeople.has(person.id);
                    return (
                    <tr
                      key={person.id}
                      className={cn(
                        "group hover:bg-muted/50 transition-colors duration-200 border-b cursor-pointer",
                        isSelected && "bg-muted ring-1 ring-inset ring-border"
                      )}
                      onClick={() => navigate(`/directory/${person.id}`)}
                    >
                      <td className="p-4 relative" onClick={(e) => e.stopPropagation()}>
                        <ColorBar color={lifecycleToColor(person.lifecycle_state)} w={selectedPeople.has(person.id) ? 8 : 6} />
                        <Checkbox
                          checked={selectedPeople.has(person.id)}
                          onCheckedChange={() => togglePersonSelection(person.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="mr-1 sm:mr-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/80 text-muted-foreground text-sm font-bold border border-border">
                            {`${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">
                              {`${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {person.source || 'Unknown source'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          {person.email && (
                            <div className="text-sm">{person.email}</div>
                          )}
                          {person.phone && (
                            <div className="text-sm text-muted-foreground">{person.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={getLifecycleColor(person.lifecycle_state || '')}>
                          <div className="flex items-center gap-1">
                            {getLifecycleIcon(person.lifecycle_state || '')}
                            <span className="capitalize">{person.lifecycle_state || 'Unknown'}</span>
                          </div>
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full">
                            <div
                              className="h-2 rounded-full bg-muted-foreground/50"
                              style={{ width: `${Math.min(100, (person.lead_score || 0))}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium tabular-nums">{person.lead_score || 0}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          {person.latest_programme_name || 'Not specified'}
                        </div>
                        {person.latest_campus_name && (
                          <div className="text-xs text-muted-foreground">
                            {person.latest_campus_name}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); }}
                                aria-label="Call"
                                className="hover:bg-[hsl(var(--success))]/10 hover:text-[hsl(var(--success))]"
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Call</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); }}
                                aria-label="Email"
                                className="hover:bg-blue-500/10 hover:text-blue-600"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Email</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); navigate(`/directory/${person.id}`); }}
                                aria-label="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Open profile</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </ScrollArea>
          </Card>
        )}

        {/* Cards View */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedPeople.map((person) => (
              <Card
                key={person.id}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => navigate(`/directory/${person.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/80 text-muted-foreground text-sm font-bold border border-border">
                        {`${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium">
                          {`${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {person.source || 'Unknown source'}
                        </div>
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedPeople.has(person.id)}
                      onCheckedChange={() => togglePersonSelection(person.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="space-y-2 mb-4">
                    {person.email && (
                      <div className="text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {person.email}
                      </div>
                    )}
                    {person.phone && (
                      <div className="text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {person.phone}
                      </div>
                    )}
                    {person.latest_programme_name && (
                      <div className="text-sm flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        {person.latest_programme_name}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={getLifecycleColor(person.lifecycle_state || '')}>
                      <div className="flex items-center gap-1">
                        {getLifecycleIcon(person.lifecycle_state || '')}
                        <span className="capitalize">{person.lifecycle_state || 'Unknown'}</span>
                      </div>
                    </Badge>
                    <div className="text-sm font-medium">{person.lead_score || 0}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {filteredAndSortedPeople.map((person) => (
              <Card
                key={person.id}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/directory/${person.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedPeople.has(person.id)}
                        onCheckedChange={() => togglePersonSelection(person.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-muted to-muted/80 text-muted-foreground text-xs font-bold border border-border">
                        {`${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">
                          {`${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unnamed'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {person.email} • {person.phone || 'No phone'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                                          <Badge variant="outline" className={getLifecycleColor(person.lifecycle_state || '')}>
                      <div className="flex items-center gap-1">
                        {getLifecycleIcon(person.lifecycle_state || '')}
                        <span className="capitalize">{person.lifecycle_state || 'Unknown'}</span>
                      </div>
                    </Badge>
                      <div className="text-sm font-medium">{person.lead_score || 0}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/directory/${person.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
            </div>
          )}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};


export default Directory;
