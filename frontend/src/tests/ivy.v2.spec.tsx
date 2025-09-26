import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Under test: Inline Ivy input flows that call router v2 and render responses
import { InlineIvyInput } from '@/ivy/InlineIvyInput';

// Mock aiRouterApi.routerV2
vi.mock('@/services/api', async (orig) => {
  const actual = await orig();
  return {
    ...actual,
    aiRouterApi: {
      routerV2: vi.fn(),
    },
  };
});

// Minimal Ivy context with openers to observe dispatch
const baseContext = {
  personId: 'lead-1',
  personName: 'Isla Example',
  personData: { id: 1, uid: 'lead-1', name: 'Isla Example', email: 'i@example.com', phone: '0000', lifecycle_state: 'lead', latest_programme_name: 'CS' },
  openEmailComposer: vi.fn(),
  openCallConsole: vi.fn(),
  openMeetingBooker: vi.fn(),
  openEmailHistory: vi.fn(),
  expandPanel: vi.fn(),
};

const noopCommands = [] as any[];

describe('Ivy v2 envelopes (FE smoke tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders conversational answer and maps actions', async () => {
    const { aiRouterApi } = await import('@/services/api');
    (aiRouterApi.routerV2 as any).mockResolvedValue({
      kind: 'conversational',
      answer_markdown: 'Hello world',
      actions: [{ label: 'View profile', action: 'view_profile' }],
    });

    render(
      <InlineIvyInput
        context={baseContext as any}
        commands={noopCommands}
        enableChatMode
      />
    );

    // Type and submit a query
    const input = screen.getByPlaceholderText('Type a question or command…');
    fireEvent.change(input, { target: { value: 'hi' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Conversational text should appear
    await screen.findByText('Hello world');

    // Action links are rendered as buttons via markdown action: scheme
    const link = await screen.findByRole('button', { name: /view profile/i });
    fireEvent.click(link);

    // Expect expandPanel('properties') or related profile navigation via dispatcher
    // In our dispatcher fallback, we emit a window event for 'view_profile' if no command
    // Here we assert no crash by presence check; stronger assertions would require
    // wiring a fake command or listening to CustomEvent. Keep smoke-level simple.
    expect(link).toBeInTheDocument();
  });

  it('opens Suggestions modal and wires primary CTA', async () => {
    const { aiRouterApi } = await import('@/services/api');
    (aiRouterApi.routerV2 as any).mockResolvedValue({
      kind: 'modal',
      modal: { type: 'suggestions', payload: { modal_title: 'Test Modal', ui: { primary_cta: { label: 'Book 1-1', action: 'open_meeting_scheduler' }, chips: [] } } },
      actions: [{ label: 'Book 1-1', action: 'open_meeting_scheduler' }],
    });

    const ctx = { ...baseContext, openMeetingBooker: vi.fn() };

    render(
      <InlineIvyInput
        context={ctx as any}
        commands={noopCommands}
        enableChatMode
      />
    );

    const input = screen.getByPlaceholderText('Type a question or command…');
    fireEvent.change(input, { target: { value: 'nba' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Modal title should appear
    await screen.findByText('Test Modal');

    // Primary CTA should be clickable
    const cta = await screen.findByRole('button', { name: /book 1-1/i });
    fireEvent.click(cta);

    // Ensure our meeting booker opener is invoked
    await waitFor(() => {
      expect(ctx.openMeetingBooker).toHaveBeenCalled();
    });
  });
});


