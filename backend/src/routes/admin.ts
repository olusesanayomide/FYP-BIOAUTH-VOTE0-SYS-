import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { getDashboardStats, createElection, getAllElections, getAllCandidates, createCandidate, updateCandidate, getAllVoters, updateVoterStatus, deleteVoter, updateCandidateStatus, deleteCandidate, updateElection, updateElectionStatus, updateElectionResultsVisibility, getElectionAnalytics, deleteElection, getSystemSettings, updateSystemSettings, getAuditLogs, importStudentData, createAdmin, exportAuditLogs, exportElectionResults } from '../services/adminService';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Apply strict authentication and RBAC to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

/**
 * @route   GET /admin/stats
 * @desc    Get top-level command center overview metrics
 * @access  Private (Admin only) - Note: Add JWT verification middleware later
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const stats = await getDashboardStats();
        res.json(stats);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /admin/settings
 * @desc    Get global application settings (e.g., University Name)
 * @access  Public or Admin (depending on exact use)
 */
router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await getSystemSettings();
        res.json(settings);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /admin/settings
 * @desc    Update global application settings
 * @access  Private (Admin only)
 */
router.post('/settings', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const settings = await updateSystemSettings(req.body, adminId);
        res.json(settings);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /admin/elections
 * @desc    Create a new election
 * @access  Private (Admin only)
 */
router.post('/elections', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const result = await createElection(req.body, adminId);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /admin/elections
 * @desc    Get all elections
 * @access  Private (Admin only)
 */
router.get('/elections', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await getAllElections();
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /admin/elections/:id/analytics
 * @desc    Get specific live stats for an election
 * @access  Private (Admin only)
 */
router.get('/elections/:id/analytics', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await getElectionAnalytics(req.params.id);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   PUT /admin/elections/:id
 * @desc    Update an entire election configuration
 * @access  Private (Admin only)
 */
router.put('/elections/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const result = await updateElection(req.params.id, req.body, adminId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   PATCH /admin/elections/:id/status
 * @desc    Update election status (e.g. suspend)
 * @access  Private (Admin only)
 */
router.patch('/elections/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const result = await updateElectionStatus(req.params.id, req.body.status, adminId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   PATCH /admin/elections/:id/results
 * @desc    Publish or hide election results
 * @access  Private (Admin only)
 */
router.patch('/elections/:id/results', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const publish = Boolean(req.body?.results_published);
        const result = await updateElectionResultsVisibility(req.params.id, publish, adminId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   DELETE /admin/elections/:id
 * @desc    Permanently delete an election
 * @access  Private (Admin only)
 */
router.delete('/elections/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const result = await deleteElection(req.params.id, adminId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /admin/candidates
 * @desc    Get all candidates
 * @access  Private (Admin only)
 */
router.get('/candidates', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await getAllCandidates();
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /admin/candidates
 * @desc    Create a new candidate
 * @access  Private (Admin only)
 */
router.post('/candidates', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const result = await createCandidate(req.body, adminId);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   PUT /admin/candidates/:id
 * @desc    Update a candidate profile
 * @access  Private (Admin only)
 */
router.put('/candidates/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const result = await updateCandidate(req.params.id, req.body, adminId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /admin/voters
 * @desc    Get all registered voters
 * @access  Private (Admin only)
 */
router.get('/voters', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await getAllVoters();
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   PATCH /admin/voters/:id/status
 * @desc    Update voter status (suspend/activate)
 * @access  Private (Admin only)
 */
router.patch('/voters/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const result = await updateVoterStatus(req.params.id, req.body.status, adminId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   DELETE /admin/voters/:id
 * @desc    Permanently delete a voter
 * @access  Private (Admin only)
 */
router.delete('/voters/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const result = await deleteVoter(req.params.id, adminId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /admin/voters/import
 * @desc    Import student data from CSV/Excel
 * @access  Private (Admin only)
 */
router.post('/voters/import', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!(req as any).file) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded' });
        }

        const adminId = (req as any).user.id;
        const mode = req.body.mode || 'add'; // 'overwrite' or 'add'

        const result = await importStudentData((req as any).file, mode, adminId);
        res.json({ status: 'success', ...result });
    } catch (error: any) {
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Import failed'
        });
    }
});

/**
 * @route   PATCH /admin/candidates/:id/status
 * @desc    Update candidate approval status
 * @access  Private (Admin only)
 */
router.patch('/candidates/:id/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const result = await updateCandidateStatus(req.params.id, req.body.status, adminId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   DELETE /admin/candidates/:id
 * @desc    Delete a rejected candidate
 * @access  Private (Admin only)
 */
router.delete('/candidates/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const result = await deleteCandidate(req.params.id, adminId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /admin/elections/:id/export
 * @desc    Export election results as PDF or Word
 * @access  Private (Admin only)
 */
router.get('/elections/:id/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const format = (req.query.format as string) || 'pdf';

        const { buffer, contentType, fileName } = await exportElectionResults(id, format);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /admin/audit-logs
 * @desc    Get detailed audit trails
 * @access  Private (Admin only)
 */
router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const logs = await getAuditLogs();
        res.json(logs);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /admin/audit-logs/export
 * @desc    Export audit logs in various formats
 * @access  Private (Admin only)
 */
router.get('/audit-logs/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { format, adminId } = req.query;
        const result = await exportAuditLogs(format as string, adminId as string);

        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`);
        res.send(result.buffer);
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /admin/admins
 * @desc    Create a new administrator
 * @access  Private (Admin only)
 */
router.post('/admins', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as any).user.id;
        const result = await createAdmin(req.body, adminId);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
