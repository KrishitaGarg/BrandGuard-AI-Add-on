/**
 * Fixes Context
 * 
 * React context for managing fix suggestions state.
 * This is a NEW context that doesn't modify existing contexts.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Fix {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  currentValue: string;
  recommendedValue: string; // From database
  reasoning: string;
  autoFixable: boolean;
  elementId: string;
  metadata?: {
    guidelineSource?: string;
    industryStandard?: string;
    brandRule?: string;
    [key: string]: any;
  };
}

export interface FixSuggestionsResponse {
  fixes: Fix[];
  potentialScoreIncrease: number;
  summary: {
    totalFixes: number;
    criticalFixes: number;
    warningFixes: number;
    autoFixable: number;
    manualReview: number;
  };
}

interface FixesContextType {
  fixes: Fix[];
  loading: boolean;
  applyingFix: string | null;
  error: string | null;
  generateFixes: (designId: string, brandId: string, industry?: string, complianceResults?: any, design?: any, brandRules?: any) => Promise<void>;
  applyFix: (fixId: string, designId: string, design?: any) => Promise<void>;
  applyAllFixes: (fixIds: string[], designId: string, design?: any) => Promise<void>;
  getFixPreview: (fixId: string, designId: string) => Promise<any>;
  clearFixes: () => void;
}

const FixesContext = createContext<FixesContextType | undefined>(undefined);

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3000';

export function FixesProvider({ children }: { children: ReactNode }) {
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [loading, setLoading] = useState(false);
  const [applyingFix, setApplyingFix] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateFixes = async (
    designId: string,
    brandId: string,
    industry: string = 'general',
    complianceResults?: any,
    design?: any,
    brandRules?: any
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/fixes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designId,
          brandId,
          industry,
          complianceResults,
          design,
          brandRules,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate fixes');
      }

      const data = await response.json();
      
      if (data.success) {
        setFixes(data.data.fixes || []);
      } else {
        throw new Error(data.error?.message || 'Failed to generate fixes');
      }
    } catch (err: any) {
      console.error('Error generating fixes:', err);
      setError(err.message || 'Failed to generate fixes');
      setFixes([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFix = async (fixId: string, designId: string, design?: any) => {
    setApplyingFix(fixId);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/fixes/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fixId,
          designId,
          design,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to apply fix');
      }

      const data = await response.json();

      if (data.success) {
        // Update fix in state to mark as applied
        setFixes((prev) =>
          prev.map((fix) =>
            fix.id === fixId ? { ...fix, applied: true } : fix
          )
        );

        // Return commands for execution in Adobe Express
        return data.data.commands;
      } else {
        throw new Error(data.error?.message || 'Failed to apply fix');
      }
    } catch (err: any) {
      console.error('Error applying fix:', err);
      setError(err.message || 'Failed to apply fix');
      throw err;
    } finally {
      setApplyingFix(null);
    }
  };

  const applyAllFixes = async (fixIds: string[], designId: string, design?: any) => {
    setApplyingFix('batch');
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/fixes/apply-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fixIds,
          designId,
          design,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to apply fixes');
      }

      const data = await response.json();

      if (data.success) {
        // Update fixes in state to mark as applied
        const appliedIds = data.data.details?.applied || [];
        setFixes((prev) =>
          prev.map((fix) =>
            appliedIds.includes(fix.id) ? { ...fix, applied: true } : fix
          )
        );

        // Return commands for execution in Adobe Express
        return data.data.commands;
      } else {
        throw new Error(data.error?.message || 'Failed to apply fixes');
      }
    } catch (err: any) {
      console.error('Error applying fixes:', err);
      setError(err.message || 'Failed to apply fixes');
      throw err;
    } finally {
      setApplyingFix(null);
    }
  };

  const getFixPreview = async (fixId: string, designId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/fixes/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fixId,
          designId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get preview');
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (err: any) {
      console.error('Error getting preview:', err);
      setError(err.message || 'Failed to get preview');
      return null;
    }
  };

  const clearFixes = () => {
    setFixes([]);
    setError(null);
  };

  return (
    <FixesContext.Provider
      value={{
        fixes,
        loading,
        applyingFix,
        error,
        generateFixes,
        applyFix,
        applyAllFixes,
        getFixPreview,
        clearFixes,
      }}
    >
      {children}
    </FixesContext.Provider>
  );
}

export function useFixes() {
  const context = useContext(FixesContext);
  if (context === undefined) {
    throw new Error('useFixes must be used within a FixesProvider');
  }
  return context;
}
