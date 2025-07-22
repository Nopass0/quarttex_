import { useState, useEffect } from 'react';

interface RapiraRate {
  baseRate: number;
  kkk: number;
  rate: number;
  timestamp: string;
}

export function useRapiraRate() {
  const [rate, setRate] = useState<RapiraRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rapira-rate`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch Rapira rate');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setRate(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch rate');
      }
    } catch (err) {
      console.error('Error fetching Rapira rate:', err);
      setError('Ошибка загрузки курса');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    
    // Refresh rate every 30 seconds
    const interval = setInterval(fetchRate, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { rate, loading, error, refetch: fetchRate };
}