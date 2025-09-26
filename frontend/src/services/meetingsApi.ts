import { apiFetch } from './api';

// Types
export interface MeetingType {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  type: "consultation" | "campus_tour" | "interview" | "follow_up" | "general";
  location: "campus" | "virtual" | "phone" | "hybrid";
  max_participants: number;
  requires_preparation: boolean;
  tags: string[];
}

export interface MeetingSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  meeting_type_id?: string;
}

export interface MeetingBookingCreate {
  lead_id: string;
  meeting_type_id: string;
  scheduled_start: string; // ISO datetime string
  scheduled_end: string; // ISO datetime string
  location: string;
  participants: string[];
  agenda: string;
  preparation_notes: string;
  reminder_settings: {
    email: boolean;
    sms: boolean;
    calendar: boolean;
    reminder_time: number;
  };
  status?: "scheduled" | "confirmed" | "completed" | "cancelled" | "rescheduled";
}

export interface MeetingBookingResponse {
  id: string;
  lead_id: string;
  meeting_type: MeetingType;
  scheduled_start: string;
  scheduled_end: string;
  location: string;
  participants: string[];
  agenda: string;
  preparation_notes: string;
  reminder_settings: {
    email: boolean;
    sms: boolean;
    calendar: boolean;
    reminder_time: number;
  };
  status: string;
  created_at: string;
}

// API functions
export const meetingsApi = {
  // Get all available meeting types
  async getMeetingTypes(): Promise<MeetingType[]> {
    return await apiFetch<MeetingType[]>('/meetings/types');
  },

  // Get available meeting slots
  async getAvailableSlots(
    startDate: string = "2025-01-20",
    endDate: string = "2025-02-03",
    meetingTypeId?: string
  ): Promise<MeetingSlot[]> {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    
    if (meetingTypeId) {
      params.append('meeting_type_id', meetingTypeId);
    }

    return await apiFetch<MeetingSlot[]>(`/meetings/slots?${params.toString()}`);
  },

  // Book a meeting
  async bookMeeting(booking: MeetingBookingCreate): Promise<MeetingBookingResponse> {
    return await apiFetch<MeetingBookingResponse>('/meetings/book', {
      method: 'POST',
      body: JSON.stringify(booking),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  // Get meetings for a lead
  async getMeetings(
    leadId?: string,
    status?: string
  ): Promise<MeetingBookingResponse[]> {
    const params = new URLSearchParams();
    
    if (leadId) {
      params.append('lead_id', leadId);
    }
    
    if (status) {
      params.append('status', status);
    }

    const queryString = params.toString();
    const url = queryString ? `/meetings/bookings?${queryString}` : '/meetings/bookings';
    
    return await apiFetch<MeetingBookingResponse[]>(url);
  },

  // Update a meeting
  async updateMeeting(
    bookingId: string,
    updates: Partial<MeetingBookingCreate>
  ): Promise<MeetingBookingResponse> {
    return await apiFetch<MeetingBookingResponse>(`/meetings/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  // Cancel a meeting
  async cancelMeeting(bookingId: string): Promise<void> {
    await apiFetch(`/meetings/bookings/${bookingId}`, {
      method: 'DELETE',
      returnType: 'void',
    });
  },
};

export default meetingsApi;
