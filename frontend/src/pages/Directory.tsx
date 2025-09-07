import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, MoreHorizontal, Phone, Mail, Calendar, Eye, 
  Users, GraduationCap, UserCheck, UserX, Clock, Star, 
  ChevronDown, ChevronUp, RefreshCw, Download, Settings,
  BookUser, MapPin, Calendar as CalendarIcon, Target, TrendingUp
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { peopleApi, PersonEnriched } from '@/services/api';

type LifecycleState = 'enquiry' | 'applicant' | 'enrolled' | 'alumni';
type ViewMode = 'table' | 'cards' | 'list';

const Directory: React.FC = () => {
  const navigate = useNavigate();
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

  if (loading) return <div className="p-6 text-center">Loading directory...</div>;
  if (error) return <div className="p-6 text-destructive">Error: {error}</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Directory</h1>
          <p className="text-muted-foreground">Master contact list - all people across the student lifecycle</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPeople}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search people by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={lifecycleFilter} onValueChange={(value) => setLifecycleFilter(value as LifecycleState | 'all')}>
                <SelectTrigger className="w-40">
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

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger className="w-32">
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
              >
                {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(prev => prev === 'table' ? 'cards' : prev === 'cards' ? 'list' : 'table')}
              >
                {viewMode === 'table' ? 'Table' : viewMode === 'cards' ? 'Cards' : 'List'}
              </Button>
            </div>
          </div>

          {/* Selected count */}
          {selectedPeople.size > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedPeople.size} selected
              </span>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear Selection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {filteredAndSortedPeople.length} people
          </h2>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <Card>
            <ScrollArea className="h-[600px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-background border-b">
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
                    <th className="p-4 text-left font-semibold">Name</th>
                    <th className="p-4 text-left font-semibold">Contact</th>
                    <th className="p-4 text-left font-semibold">Lifecycle</th>
                    <th className="p-4 text-left font-semibold">Score</th>
                    <th className="p-4 text-left font-semibold">Programme</th>
                    <th className="p-4 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedPeople.map((person) => (
                    <tr
                      key={person.id}
                      className="hover:bg-muted/50 border-b cursor-pointer"
                      onClick={() => navigate(`/directory/${person.id}`)}
                    >
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedPeople.has(person.id)}
                          onCheckedChange={() => togglePersonSelection(person.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center text-primary-foreground text-sm font-bold">
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
                            className="h-2 bg-gradient-to-r from-chart-1 to-chart-2 rounded-full"
                            style={{ width: `${Math.min(100, (person.lead_score || 0))}%` }}
                          />
                        </div>
                          <span className="text-sm font-medium">{person.lead_score || 0}</span>
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle phone call
                            }}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle email
                            }}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
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
                      </td>
                    </tr>
                  ))}
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
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center text-primary-foreground font-bold">
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
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center text-primary-foreground text-sm font-bold">
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
    </div>
  );
};

export default Directory;
