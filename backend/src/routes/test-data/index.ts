/**
 * Test Data Routes — Coordinator
 *
 * Combines all test-data sub-route modules into a single router.
 * This replaces the monolithic test-data.routes.ts (2,652 lines)
 * with focused, domain-specific modules.
 *
 * Mounted at /api/test-data in app.ts
 *
 * Sub-modules:
 *   sheets.routes      — Sheet CRUD, schema, validation, scenario queries
 *   rows.routes        — Row CRUD, bulk ops, search-replace, fill-series, data export
 *   import-export      — Excel import/export, preview, template download
 *   views.routes       — Saved grid views CRUD
 *   environments       — Environments, env variables, global variables
 *   relationships      — Table relationships CRUD + lookup
 *   references         — Reference resolution, row expansion, formula evaluation
 *   tables.routes      — Runtime-compatible endpoints (vero-lang)
 *   versions.routes    — Version manifest + bulk fetch (vero-lang)
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';

// Domain-specific sub-routers (frontend-facing)
import sheetsRoutes from './sheets.routes';
import rowsRoutes from './rows.routes';
import importExportRoutes from './import-export.routes';
import viewsRoutes from './views.routes';
import environmentsRoutes from './environments.routes';
import relationshipsRoutes from './relationships.routes';
import referencesRoutes from './references.routes';
import previewRoutes from './preview.routes';

const router = Router();

// Apply authentication to all frontend-facing routes
router.use(authenticateToken);

// Mount all sub-routers (order matters for path matching)
router.use(sheetsRoutes);
router.use(rowsRoutes);
router.use(importExportRoutes);
router.use(viewsRoutes);
router.use(environmentsRoutes);
router.use(relationshipsRoutes);
router.use(referencesRoutes);
router.use(previewRoutes);

export default router;
