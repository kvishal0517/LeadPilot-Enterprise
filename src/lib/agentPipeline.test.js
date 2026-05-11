import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAgentPipeline } from './agentPipeline';
import { entities } from '@/api/db';

// Mock DB entities
vi.mock('@/api/db', () => ({
  entities: {
    Settings: {
      list: vi.fn()
    },
    AgentRun: {
      create: vi.fn(),
      update: vi.fn()
    },
    Lead: {
      list: vi.fn(),
      create: vi.fn()
    }
  }
}));

// Mock fetch for LLM and Sheets
global.fetch = vi.fn();

describe('LeadPilot Agent Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default settings
    entities.Settings.list.mockResolvedValue([
      { key: 'llm_api_key', value: 'test-key' },
      { key: 'sheets_url', value: 'https://test-sheets-url.com' }
    ]);

    entities.Lead.list.mockResolvedValue([]);

    // Default AgentRun create
    entities.AgentRun.create.mockResolvedValue({ id: 'run-1', created_at: new Date().toISOString() });
    
    // Mock successful LLM discovery
    const mockLeadData = {
      candidates: [
        { 
          content: {
            parts: [{
              text: JSON.stringify({
                leads: [
                  { 
                    company_name: "Test Co", 
                    domain: "test.com", 
                    contact_email: "test@test.com", 
                    industry: "Test", 
                    contact_name: "Test Contact",
                    linkedin_url: "https://linkedin.com",
                    pain_points: "None" 
                  }
                ]
              })
            }]
          }
        }
      ]
    };

    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLeadData),
      text: () => Promise.resolve(JSON.stringify(mockLeadData))
    });
  });

  it('completes the pipeline successfully', async () => {
    const onStageChange = vi.fn();
    const onLogUpdate = vi.fn();
    const onMetricsUpdate = vi.fn();

    await runAgentPipeline({ onStageChange, onLogUpdate, onMetricsUpdate });

    expect(onStageChange).toHaveBeenCalledWith('done');
    expect(entities.AgentRun.create).toHaveBeenCalled();
    expect(entities.AgentRun.update).toHaveBeenCalledWith('run-1', expect.objectContaining({
      status: 'completed'
    }));
    expect(entities.Lead.create).toHaveBeenCalled();
  });

  it('handles LLM failure by throwing error', async () => {
    fetch.mockRejectedValueOnce(new Error("API Down"));
    
    const onStageChange = vi.fn();
    const onLogUpdate = vi.fn();
    const onMetricsUpdate = vi.fn();

    await expect(runAgentPipeline({ onStageChange, onLogUpdate, onMetricsUpdate }))
      .rejects.toThrow("API Down");
    
    expect(onLogUpdate).toHaveBeenCalledWith(expect.stringContaining("OPERATION FAILURE"));
  });

  it('fails the pipeline if critical error occurs', async () => {
    entities.Settings.list.mockRejectedValue(new Error("DB Error"));

    const onStageChange = vi.fn();
    const onLogUpdate = vi.fn();
    const onMetricsUpdate = vi.fn();

    await expect(runAgentPipeline({ onStageChange, onLogUpdate, onMetricsUpdate }))
      .rejects.toThrow("DB Error");
  });
});
