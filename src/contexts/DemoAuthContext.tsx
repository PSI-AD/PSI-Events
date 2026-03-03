/**
 * DemoAuthContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global demo Role-Based Access Control (RBAC) switcher context.
 *
 * This is a DEMO TOOL — not production auth. It simulates three distinct
 * permission levels so the system can visually lock/unlock during presentations.
 *
 * Roles:
 *  'admin'  — Full access. Every sidebar group visible.
 *  'hr'     — HR / Logistics officer. Operational tabs only, no Finance.
 *  'agent'  — Sales agent. Client-facing tabs only.
 *
 * Usage:
 *   const { demoRole, setDemoRole } = useDemoRole();
 */

import React, { createContext, useContext, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DemoRole = 'admin' | 'hr' | 'agent';

interface DemoAuthCtx {
    demoRole: DemoRole;
    setDemoRole: (role: DemoRole) => void;
}

// ── Context ────────────────────────────────────────────────────────────────────

const DemoAuthContext = createContext<DemoAuthCtx>({
    demoRole: 'admin',
    setDemoRole: () => { },
});

// ── Provider ───────────────────────────────────────────────────────────────────

export function DemoAuthProvider({ children }: { children: React.ReactNode }) {
    const [demoRole, setDemoRole] = useState<DemoRole>('admin');

    return (
        <DemoAuthContext.Provider value={{ demoRole, setDemoRole }}>
            {children}
        </DemoAuthContext.Provider>
    );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useDemoRole(): DemoAuthCtx {
    return useContext(DemoAuthContext);
}
