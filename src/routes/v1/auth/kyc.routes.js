import express from 'express';
import kycController from '../../../controllers/auth/kyc.controller';
const router = express.Router();

const { protect, authorize } = require('../middleware/auth'); // Your auth middleware
const kycValidation = require('../middleware/kycValidation');

// All vendor routes require authentication and VENDOR role

/**
 * @route   POST /api/kyc/create
 * @desc    Create initial KYC record
 * @access  Private (Vendor)
 */
router.post('/create', protect, authorize('VENDOR'), kycValidation.validateCreateKYC, kycController.createKYC);

/**
 * @route   GET /api/kyc/status
 * @desc    Get current user's KYC status
 * @access  Private (Vendor)
 */
router.get('/status', protect, authorize('VENDOR'), kycController.getKYCStatus);

/**
 * @route   PUT /api/kyc/update
 * @desc    Update KYC information
 * @access  Private (Vendor)
 */
router.put('/update', protect, authorize('VENDOR'), kycValidation.validateUpdateKYC, kycController.updateKYC);

/**
 * @route   POST /api/kyc/documents
 * @desc    Add a document to KYC
 * @access  Private (Vendor)
 */
router.post('/documents', protect, authorize('VENDOR'), kycValidation.validateAddDocument, kycController.addDocument);

/**
 * @route   PUT /api/kyc/documents/:documentId
 * @desc    Update/replace a document
 * @access  Private (Vendor)
 */
router.put('/documents/:documentId', protect, authorize('VENDOR'), kycController.updateDocument);

/**
 * @route   DELETE /api/kyc/documents/:documentId
 * @desc    Delete a document
 * @access  Private (Vendor)
 */
router.delete('/documents/:documentId', protect, authorize('VENDOR'), kycController.deleteDocument);

/**
 * @route   POST /api/kyc/submit
 * @desc    Submit KYC for review
 * @access  Private (Vendor)
 */
router.post('/submit', protect, authorize('VENDOR'), kycController.submitKYC);

/**
 * @route   GET /api/kyc/history
 * @desc    Get KYC verification history
 * @access  Private (Vendor)
 */
router.get('/history', protect, authorize('VENDOR'), kycController.getMyHistory);

// ─────────────────────────────────────────────
// ADMIN KYC ROUTES
// ─────────────────────────────────────────────
// All admin routes require authentication and ADMIN role

/**
 * @route   GET /api/kyc/admin/pending
 * @desc    Get all pending KYC applications
 * @access  Private (Admin)
 */
router.get('/admin/pending', protect, authorize('ADMIN'), kycController.getPendingKYCs);

/**
 * @route   GET /api/kyc/admin/under-review
 * @desc    Get all KYCs under review
 * @access  Private (Admin)
 */
router.get('/admin/under-review', protect, authorize('ADMIN'), kycController.getUnderReviewKYCs);

/**
 * @route   GET /api/kyc/admin/stats
 * @desc    Get KYC statistics
 * @access  Private (Admin)
 */
router.get('/admin/stats', protect, authorize('ADMIN'), kycController.getKYCStats);

/**
 * @route   GET /api/kyc/admin/expiring
 * @desc    Get KYCs expiring soon
 * @access  Private (Admin)
 */
router.get('/admin/expiring', protect, authorize('ADMIN'), kycController.getExpiringKYCs);

/**
 * @route   GET /api/kyc/admin/search
 * @desc    Search KYCs with filters
 * @access  Private (Admin)
 */
router.get('/admin/search', protect, authorize('ADMIN'), kycController.searchKYCs);

/**
 * @route   GET /api/kyc/admin/:kycId
 * @desc    Get KYC details by ID
 * @access  Private (Admin)
 */
router.get('/admin/:kycId', protect, authorize('ADMIN'), kycController.getKYCById);

/**
 * @route   POST /api/kyc/admin/:kycId/review
 * @desc    Move KYC to under review
 * @access  Private (Admin)
 */
router.post('/admin/:kycId/review', protect, authorize('ADMIN'), kycController.moveToReview);

/**
 * @route   POST /api/kyc/admin/:kycId/approve
 * @desc    Approve KYC
 * @access  Private (Admin)
 */
router.post('/admin/:kycId/approve', protect, authorize('ADMIN'), kycController.approveKYC);

/**
 * @route   POST /api/kyc/admin/:kycId/reject
 * @desc    Reject KYC
 * @access  Private (Admin)
 */
router.post('/admin/:kycId/reject', protect, authorize('ADMIN'), kycController.rejectKYC);

/**
 * @route   POST /api/kyc/admin/:kycId/documents/:documentId/reject
 * @desc    Reject a specific document
 * @access  Private (Admin)
 */
router.post('/admin/:kycId/documents/:documentId/reject', protect, authorize('ADMIN'), kycController.rejectDocument);

/**
 * @route   GET /api/kyc/admin/:kycId/history
 * @desc    Get verification history
 * @access  Private (Admin)
 */
router.get('/admin/:kycId/history', protect, authorize('ADMIN'), kycController.getVerificationHistory);

module.exports = router;
