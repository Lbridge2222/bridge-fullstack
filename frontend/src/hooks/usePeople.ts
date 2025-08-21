import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { peopleApi, PersonEnriched } from '../services/api';

export interface PeopleFilters {
  q?: string;
  limit?: number;
  lifecycle_state?: string;
}

export function usePeople(area: 'leads' | 'admissions' | 'student-records' | 'enriched', filters: PeopleFilters = {}) {
  const [people, setPeople] = useState<PersonEnriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to store filters for comparison to prevent unnecessary re-renders
  const filtersRef = useRef(filters);
  const areaRef = useRef(area);

  const fetchPeople = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data: PersonEnriched[];
      
      switch (areaRef.current) {
        case 'leads':
          data = await peopleApi.getLeads(filtersRef.current);
          break;
        case 'admissions':
          data = await peopleApi.getAdmissions(filtersRef.current);
          break;
        case 'student-records':
          data = await peopleApi.getStudentRecords(filtersRef.current);
          break;
        case 'enriched':
          data = await peopleApi.getEnriched(filtersRef.current);
          break;
        default:
          throw new Error(`Unknown area: ${areaRef.current}`);
      }
      
      setPeople(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to fetch ${areaRef.current}`);
      console.error(`Error fetching ${areaRef.current}:`, err);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed since we use refs

  // Update refs when props change
  useEffect(() => {
    filtersRef.current = filters;
    areaRef.current = area;
  }, [filters, area]);

  // Only fetch when area or filters actually change
  useEffect(() => {
    fetchPeople();
  }, [fetchPeople, area, filters]);

  const promotePerson = useCallback(async (personId: string, newState: string, reason?: string) => {
    try {
      await peopleApi.promote(personId, newState, reason);
      // Refresh the list after promotion
      await fetchPeople();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to promote person');
      console.error('Error promoting person:', err);
      return false;
    }
  }, [fetchPeople]);

  // Filter people by lifecycle state
  const getPeopleByLifecycleState = useCallback((state: string) => {
    return people.filter(person => person.lifecycle_state === state);
  }, [people]);

  // Get lifecycle state distribution
  const getLifecycleDistribution = useCallback(() => {
    return people.reduce((acc, person) => {
      const state = person.lifecycle_state;
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [people]);

  // Get lead score distribution
  const getLeadScoreDistribution = useCallback(() => {
    return people.reduce((acc, person) => {
      const score = person.lead_score || 0;
      const range = score < 25 ? '0-24' : score < 50 ? '25-49' : score < 75 ? '50-74' : '75-100';
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [people]);

  // Get conversion probability distribution
  const getConversionProbabilityDistribution = useCallback(() => {
    return people.reduce((acc, person) => {
      const prob = person.conversion_probability || 0;
      const range = prob < 0.25 ? '0-24%' : prob < 0.5 ? '25-49%' : prob < 0.75 ? '50-74%' : '75-100%';
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [people]);

  // Search people by name or email
  const searchPeople = useCallback(async (query: string) => {
    const searchFilters = { ...filtersRef.current, q: query };
    try {
      setLoading(true);
      setError(null);
      
      let data: PersonEnriched[];
      
      switch (areaRef.current) {
        case 'leads':
          data = await peopleApi.getLeads(searchFilters);
          break;
        case 'admissions':
          data = await peopleApi.getAdmissions(searchFilters);
          break;
        case 'student-records':
          data = await peopleApi.getStudentRecords(searchFilters);
          break;
        case 'enriched':
          data = await peopleApi.getEnriched(searchFilters);
          break;
        default:
          throw new Error(`Unknown area: ${areaRef.current}`);
      }
      
      setPeople(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to search ${areaRef.current}`);
      console.error(`Error searching ${areaRef.current}:`, err);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed since we use refs

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    people,
    loading,
    error,
    fetchPeople,
    promotePerson,
    getPeopleByLifecycleState,
    getLifecycleDistribution,
    getLeadScoreDistribution,
    getConversionProbabilityDistribution,
    searchPeople,
  }), [
    people,
    loading,
    error,
    fetchPeople,
    promotePerson,
    getPeopleByLifecycleState,
    getLifecycleDistribution,
    getLeadScoreDistribution,
    getConversionProbabilityDistribution,
    searchPeople,
  ]);

  return returnValue;
}
