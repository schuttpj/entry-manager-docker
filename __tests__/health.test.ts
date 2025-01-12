import { GET } from '@/app/api/health/route';
import { getDB } from '@/lib/db';

// Mock the database module
jest.mock('@/lib/db', () => ({
  getDB: jest.fn()
}));

describe('Health Check API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return healthy status when database is connected', async () => {
    // Mock successful database connection
    (getDB as jest.Mock).mockResolvedValueOnce({});

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(expect.objectContaining({
      status: 'healthy',
      database: 'connected',
      timestamp: expect.any(String)
    }));
  });

  it('should return unhealthy status when database connection fails', async () => {
    // Mock database connection failure
    (getDB as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual(expect.objectContaining({
      status: 'unhealthy',
      database: 'disconnected',
      error: 'Database connection failed',
      timestamp: expect.any(String)
    }));
  });
}); 