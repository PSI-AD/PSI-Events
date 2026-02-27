import { Outlet } from 'react-router-dom';

/**
 * PublicLayout
 * A completely blank, full-bleed wrapper for public-facing pages
 * (e.g. /executive-presentation, /login).
 * No sidebar, no header — just the raw page rendered edge-to-edge.
 */
export default function PublicLayout() {
    return <Outlet />;
}
