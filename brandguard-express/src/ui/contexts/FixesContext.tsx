/**
 * Fixes Context
 * 
 * React context for managing fix suggestions state.
 * This is a NEW context that doesn't modify existing contexts.
 * 
 * Frontend-safe: NO backend references, NO env vars, NO globals.
 * Uses FixesApi adapter which handles fallback to mocked data.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import * as FixesApi from '../../services/FixesApi';

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
  applyFix: (fixId: string, designId: string, design?: any) => Promise<any[] | undefined>;
  applyAllFixes: (fixIds: string[], designId: string, design?: any) => Promise<any[] | undefined>;
  getFixPreview: (fixId: string, designId: string) => Promise<any>;
  clearFixes: () => void;
}

const FixesContext = createContext<FixesContextType | undefined>(undefined);

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
      // Use frontend-safe API adapter (handles fallback internally)
      const result = await FixesApi.generateFixes(
        designId,
        brandId,
        industry,
        complianceResults,
        design,
        brandRules
      );

      setFixes(result.fixes || []);
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
      // Use frontend-safe API adapter (handles fallback internally)
      const result = await FixesApi.applyFix(fixId, designId, design);

      if (result && result.commands) {
        // Update fix in state to mark as applied
        setFixes((prev) =>
          prev.map((fix) =>
            fix.id === fixId ? { ...fix, applied: true } : fix
          )
        );

        // Return commands for execution in Adobe Express
        return result.commands;
      } else {
        throw new Error('Failed to apply fix - no commands returned');
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
      // Use frontend-safe API adapter (handles fallback internally)
      const result = await FixesApi.applyAllFixes(fixIds, designId, design);

      if (result && result.commands) {
        // Update fixes in state to mark as applied
        setFixes((prev) =>
          prev.map((fix) =>
            fixIds.includes(fix.id) ? { ...fix, applied: true } : fix
          )
        );

        // Return commands for execution in Adobe Express
        return result.commands;
      } else {
        throw new Error('Failed to apply fixes - no commands returned');
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
      // Use frontend-safe API adapter (handles fallback internally)
      const result = await FixesApi.getFixPreview(fixId, designId);
      return result;
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
