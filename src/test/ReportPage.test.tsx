import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReportPage from '@/pages/ReportPage';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: 'test-session-id' }),
  useNavigate: () => vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

import { apiFetch } from '@/lib/api';
const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Disable refetch intervals in tests
        refetchOnWindowFocus: false,
      },
    },
  });
}

function renderReportPage() {
  const queryClient = makeQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ReportPage />
    </QueryClientProvider>,
  );
}

function makeResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const COMPLETE_SUBMISSION = {
  files: { 'index.ts': 'const x = 1;' },
  file_count: 1,
  total_bytes: 14,
  ai_scores: {
    reasoning: 8,
    correctness: 7,
    codeQuality: 8,
    speed: 6,
    vibe: 9,
    summary: 'Solid work overall.',
    redFlags: [],
    greenFlags: ['Clean code'],
  },
  scoring_status: 'complete' as const,
  scoring_started_at: null,
  session_duration_seconds: 3600,
  total_claude_prompts: 5,
  total_claude_tool_calls: 10,
};

const PENDING_SUBMISSION = {
  ...COMPLETE_SUBMISSION,
  ai_scores: null,
  scoring_status: 'pending' as const,
  scoring_started_at: new Date().toISOString(),
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ReportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches submission via apiFetch when sessionId is in URL', async () => {
    mockApiFetch.mockResolvedValueOnce(makeResponse(COMPLETE_SUBMISSION));

    renderReportPage();

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/api/sessions/test-session-id/submission');
    });
  });

  it('shows skeleton UI while query is loading', () => {
    // Never resolves — stays in loading state
    mockApiFetch.mockReturnValueOnce(new Promise(() => {}));

    renderReportPage();

    // Skeleton elements use animate-pulse class
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error message when apiFetch throws', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'));

    renderReportPage();

    await waitFor(() => {
      expect(screen.getByText('Report unavailable')).toBeInTheDocument();
    });
  });

  it('shows error message when apiFetch returns non-ok response', async () => {
    mockApiFetch.mockResolvedValueOnce(makeResponse({ error: 'Not found' }, false, 404));

    renderReportPage();

    await waitFor(() => {
      expect(screen.getByText('Report unavailable')).toBeInTheDocument();
    });
  });

  it('shows "in progress" text when scoring_status is pending', async () => {
    mockApiFetch.mockResolvedValueOnce(makeResponse(PENDING_SUBMISSION));

    renderReportPage();

    await waitFor(() => {
      expect(screen.getByText(/AI scoring in progress/i)).toBeInTheDocument();
    });
  });

  it('shows composite score and hire band when scoring_status is complete', async () => {
    mockApiFetch.mockResolvedValueOnce(makeResponse(COMPLETE_SUBMISSION));

    renderReportPage();

    await waitFor(() => {
      // Should show the composite score (calculated from ai_scores)
      // reasoning=8, correctness=7, codeQuality=8, speed=6, vibe=9
      // composite = (80*0.3) + (70*0.3) + (80*0.25) + (60*0.05) + (90*0.1) = 24+21+20+3+9 = 77
      // rounded = 77, band = 'pass'
      expect(screen.getByText('77')).toBeInTheDocument();
      expect(screen.getByText('pass')).toBeInTheDocument();
    });

    // Should also show the AI summary
    expect(screen.getByText('Solid work overall.')).toBeInTheDocument();
  });
});
