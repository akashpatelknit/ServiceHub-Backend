import kycService from '../../services/auth/kyc.service.js';

class KycController {
  createKYC = async (req, res) => {
    try {
      const userId = req.user._id;

      const kycData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        dateOfBirth: req.body.dateOfBirth,
        companyName: req.body.companyName,
        gstNumber: req.body.gstNumber,
        panNumber: req.body.panNumber,
        businessAddress: req.body.businessAddress,
      };

      const kyc = await kycService.createKYCRecord(userId, kycData);

      res.status(201).json({
        success: true,
        message: 'KYC record created successfully',
        data: kyc,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  getKYCStatus = async (req, res) => {
    try {
      const userId = req.user._id;
      const kyc = await kycService.getKYCByUserId(userId);

      if (!kyc) {
        return res.status(404).json({
          success: false,
          message: 'KYC record not found. Please create one first.',
          data: {
            exists: false,
            status: null,
          },
        });
      }

      res.status(200).json({
        success: true,
        data: {
          exists: true,
          status: kyc.status,
          isActive: kyc.isActive,
          submittedAt: kyc.submittedAt,
          approvedAt: kyc.approvedAt,
          expiryDate: kyc.expiryDate,
          rejectionReason: kyc.rejectionReason,
          documentSummary: kyc.documentSummary,
          kyc: kyc,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  updateKYC = async (req, res) => {
    try {
      const userId = req.user._id;
      const updateData = req.body;

      const kyc = await kycService.updateKYCInfo(userId, updateData);

      res.status(200).json({
        success: true,
        message: 'KYC information updated successfully',
        data: kyc,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  addDocument = async (req, res) => {
    try {
      const userId = req.user._id;
      const { type, url } = req.body; // URL comes from a separate file upload endpoint

      if (!type || !url) {
        return res.status(400).json({
          success: false,
          message: 'Document type and URL are required',
        });
      }

      const kyc = await kycService.addDocument(userId, { type, url });

      res.status(200).json({
        success: true,
        message: 'Document added successfully',
        data: kyc,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  updateDocument = async (req, res) => {
    try {
      const userId = req.user._id;
      const { documentId } = req.params;
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: 'Document URL is required',
        });
      }

      const kyc = await kycService.updateDocument(userId, documentId, url);

      res.status(200).json({
        success: true,
        message: 'Document updated successfully',
        data: kyc,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  deleteDocument = async (req, res) => {
    try {
      const userId = req.user._id;
      const { documentId } = req.params;

      const kyc = await kycService.deleteDocument(userId, documentId);

      res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
        data: kyc,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  submitKYC = async (req, res) => {
    try {
      const userId = req.user._id;
      const kyc = await kycService.submitKYC(userId);

      res.status(200).json({
        success: true,
        message: "KYC submitted successfully. You will be notified once it's reviewed.",
        data: kyc,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  getMyHistory = async (req, res) => {
    try {
      const userId = req.user._id;
      const kyc = await kycService.getKYCByUserId(userId);

      if (!kyc) {
        return res.status(404).json({
          success: false,
          message: 'KYC record not found',
        });
      }

      const history = await kycService.getVerificationHistory(kyc._id);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  getPendingKYCs = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await kycService.getPendingKYCs(page, limit);

      res.status(200).json({
        success: true,
        data: result.kycs,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  getUnderReviewKYCs = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await kycService.getUnderReviewKYCs(page, limit);

      res.status(200).json({
        success: true,
        data: result.kycs,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  getKYCById = async (req, res) => {
    try {
      const { kycId } = req.params;
      const kyc = await kycService.getKYCByUserId(kycId);

      if (!kyc) {
        return res.status(404).json({
          success: false,
          message: 'KYC record not found',
        });
      }

      res.status(200).json({
        success: true,
        data: kyc,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  moveToReview = async (req, res) => {
    try {
      const { kycId } = req.params;
      const adminId = req.user._id;

      const kyc = await kycService.moveToReview(kycId, adminId);

      res.status(200).json({
        success: true,
        message: 'KYC moved to under review',
        data: kyc,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  approveKYC = async (req, res) => {
    try {
      const { kycId } = req.params;
      const adminId = req.user._id;
      const { comments } = req.body;

      const kyc = await kycService.approveKYC(kycId, adminId, comments);

      res.status(200).json({
        success: true,
        message: 'KYC approved successfully',
        data: kyc,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  rejectKYC = async (req, res) => {
    try {
      const { kycId } = req.params;
      const adminId = req.user._id;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required',
        });
      }

      const kyc = await kycService.rejectKYC(kycId, adminId, reason);

      res.status(200).json({
        success: true,
        message: 'KYC rejected',
        data: kyc,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  rejectDocument = async (req, res) => {
    try {
      const { kycId, documentId } = req.params;
      const adminId = req.user._id;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required',
        });
      }

      const kyc = await kycService.rejectDocument(kycId, documentId, adminId, reason);

      res.status(200).json({
        success: true,
        message: 'Document rejected',
        data: kyc,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  };

  getKYCStats = async (req, res) => {
    try {
      const stats = await kycService.getKYCStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  getExpiringKYCs = async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const kycs = await kycService.getExpiringKYCs(days);

      res.status(200).json({
        success: true,
        data: kycs,
        count: kycs.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  searchKYCs = async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        gstNumber: req.query.gstNumber,
        panNumber: req.query.panNumber,
        companyName: req.query.companyName,
        submittedFrom: req.query.submittedFrom,
        submittedTo: req.query.submittedTo,
      };

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await kycService.searchKYCs(filters, page, limit);

      res.status(200).json({
        success: true,
        data: result.kycs,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  getVerificationHistory = async (req, res) => {
    try {
      const { kycId } = req.params;
      const history = await kycService.getVerificationHistory(kycId);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  markExpiredKYCs = async (req, res) => {
    try {
      // Add API key validation here for security
      const result = await kycService.markExpiredKYCs();

      res.status(200).json({
        success: true,
        message: `Marked ${result.total} KYCs as expired`,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
}

const kycController = new KycController();

export default kycController;
