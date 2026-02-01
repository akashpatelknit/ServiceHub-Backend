import { User } from '../../models/auth/User.js';
import { KYC } from '../../models/auth/Kyc.js';
import { Profile } from '../../models/auth/Profile.js';

class KYCService {
  async createKYCRecord(userId, kycData) {
    try {
      // Check if KYC already exists
      const existingKYC = await KYC.findOne({ userId });
      if (existingKYC) {
        throw new Error('KYC record already exists for this user');
      }

      // Verify user exists and is a vendor
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      if (user.userType !== 'VENDOR') {
        throw new Error('KYC is only available for vendors');
      }

      // Create KYC record
      const kyc = new KYC({
        userId,
        firstName: kycData.firstName,
        lastName: kycData.lastName,
        dateOfBirth: kycData.dateOfBirth,
        companyName: kycData.companyName,
        gstNumber: kycData.gstNumber,
        panNumber: kycData.panNumber,
        businessAddress: kycData.businessAddress,
        status: KYC_STATUS.INCOMPLETE,
      });

      await kyc.save();
      return kyc;
    } catch (error) {
      throw new Error(`Failed to create KYC record: ${error.message}`);
    }
  }

  /**
   * Get KYC record for a user
   */
  async getKYCByUserId(userId) {
    try {
      const kyc = await KYC.findOne({ userId }).populate('userId', 'email phone userType');
      return kyc;
    } catch (error) {
      throw new Error(`Failed to fetch KYC: ${error.message}`);
    }
  }

  /**
   * Update KYC information (only when status is INCOMPLETE or REJECTED)
   */
  async updateKYCInfo(userId, updateData) {
    try {
      const kyc = await KYC.findOne({ userId });
      if (!kyc) {
        throw new Error('KYC record not found');
      }

      // Only allow updates when INCOMPLETE or REJECTED
      if (kyc.status !== KYC_STATUS.INCOMPLETE && kyc.status !== KYC_STATUS.REJECTED) {
        throw new Error(
          `Cannot update KYC in ${kyc.status} status. Only INCOMPLETE or REJECTED records can be edited.`
        );
      }

      // Update allowed fields
      const allowedFields = [
        'firstName',
        'lastName',
        'dateOfBirth',
        'companyName',
        'gstNumber',
        'panNumber',
        'businessAddress',
      ];

      allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
          kyc[field] = updateData[field];
        }
      });

      await kyc.save();
      return kyc;
    } catch (error) {
      throw new Error(`Failed to update KYC: ${error.message}`);
    }
  }

  /**
   * Add a document to KYC
   */
  async addDocument(userId, documentData) {
    try {
      const kyc = await KYC.findOne({ userId });
      if (!kyc) {
        throw new Error('KYC record not found. Create KYC record first.');
      }

      // Only allow document uploads when INCOMPLETE or REJECTED
      if (kyc.status !== KYC_STATUS.INCOMPLETE && kyc.status !== KYC_STATUS.REJECTED) {
        throw new Error(`Cannot upload documents in ${kyc.status} status. Resubmit your application first.`);
      }

      // Check if document type already exists
      const existingDoc = kyc.documents.find((doc) => doc.type === documentData.type);
      if (existingDoc) {
        throw new Error(`Document of type ${documentData.type} already exists. Delete it first or use update.`);
      }

      // Add document
      kyc.documents.push({
        type: documentData.type,
        url: documentData.url,
        status: DOCUMENT_STATUS.PENDING,
      });

      await kyc.save();
      return kyc;
    } catch (error) {
      throw new Error(`Failed to add document: ${error.message}`);
    }
  }

  /**
   * Update/replace a specific document
   */
  async updateDocument(userId, documentId, newUrl) {
    try {
      const kyc = await KYC.findOne({ userId });
      if (!kyc) {
        throw new Error('KYC record not found');
      }

      // Only allow when INCOMPLETE or REJECTED
      if (kyc.status !== KYC_STATUS.INCOMPLETE && kyc.status !== KYC_STATUS.REJECTED) {
        throw new Error(`Cannot update documents in ${kyc.status} status.`);
      }

      const document = kyc.documents.id(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      document.url = newUrl;
      document.uploadedAt = new Date();
      document.status = DOCUMENT_STATUS.PENDING;
      document.rejectionReason = null;

      await kyc.save();
      return kyc;
    } catch (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(userId, documentId) {
    try {
      const kyc = await KYC.findOne({ userId });
      if (!kyc) {
        throw new Error('KYC record not found');
      }

      // Only allow when INCOMPLETE or REJECTED
      if (kyc.status !== KYC_STATUS.INCOMPLETE && kyc.status !== KYC_STATUS.REJECTED) {
        throw new Error(`Cannot delete documents in ${kyc.status} status.`);
      }

      kyc.documents.pull(documentId);
      await kyc.save();
      return kyc;
    } catch (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Submit KYC for review (vendor action)
   */
  async submitKYC(userId) {
    try {
      const kyc = await KYC.findOne({ userId });
      if (!kyc) {
        throw new Error('KYC record not found');
      }

      // Validate all required documents are present
      const summary = kyc.documentSummary;
      if (!summary.isComplete) {
        throw new Error(`Missing required documents: ${summary.missing.join(', ')}`);
      }

      // Use the instance method (handles status transitions and audit trail)
      await kyc.submit();

      return kyc;
    } catch (error) {
      throw new Error(`Failed to submit KYC: ${error.message}`);
    }
  }

  /**
   * Get all pending KYC applications (admin)
   */
  async getPendingKYCs(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const kycs = await KYC.find({ status: KYC_STATUS.PENDING })
        .populate('userId', 'email phone')
        .sort({ submittedAt: 1 }) // Oldest first (FIFO)
        .skip(skip)
        .limit(limit);

      const total = await KYC.countDocuments({ status: KYC_STATUS.PENDING });

      return {
        kycs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch pending KYCs: ${error.message}`);
    }
  }

  /**
   * Get all KYCs under review (admin)
   */
  async getUnderReviewKYCs(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const kycs = await KYC.find({ status: KYC_STATUS.UNDER_REVIEW })
        .populate('userId', 'email phone')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await KYC.countDocuments({
        status: KYC_STATUS.UNDER_REVIEW,
      });

      return {
        kycs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch under-review KYCs: ${error.message}`);
    }
  }

  /**
   * Admin picks up a KYC for review
   */
  async moveToReview(kycId, adminId) {
    try {
      const kyc = await KYC.findById(kycId);
      if (!kyc) {
        throw new Error('KYC record not found');
      }

      await kyc.moveToReview(adminId);
      return kyc;
    } catch (error) {
      throw new Error(`Failed to move to review: ${error.message}`);
    }
  }

  /**
   * Admin approves KYC
   */
  async approveKYC(kycId, adminId, comments) {
    try {
      const kyc = await KYC.findById(kycId);
      if (!kyc) {
        throw new Error('KYC record not found');
      }

      await kyc.approve(adminId, comments);

      // Update profile verification status
      await Profile.findOneAndUpdate({ userId: kyc.userId }, { isVerified: true, approvedByAdmin: true });

      return kyc;
    } catch (error) {
      throw new Error(`Failed to approve KYC: ${error.message}`);
    }
  }

  /**
   * Admin rejects KYC with reason
   */
  async rejectKYC(kycId, adminId, reason) {
    try {
      const kyc = await KYC.findById(kycId);
      if (!kyc) {
        throw new Error('KYC record not found');
      }

      await kyc.reject(adminId, reason);
      return kyc;
    } catch (error) {
      throw new Error(`Failed to reject KYC: ${error.message}`);
    }
  }

  /**
   * Admin rejects a specific document
   */
  async rejectDocument(kycId, documentId, adminId, reason) {
    try {
      const kyc = await KYC.findById(kycId);
      if (!kyc) {
        throw new Error('KYC record not found');
      }

      const document = kyc.documents.id(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      document.status = DOCUMENT_STATUS.REJECTED;
      document.rejectionReason = reason;

      // Add to verification history
      kyc.verificationHistory.push({
        action: 'DOCUMENT_REJECTED',
        performedBy: adminId,
        previousStatus: kyc.status,
        newStatus: kyc.status,
        comments: `Document ${document.type} rejected: ${reason}`,
      });

      await kyc.save();
      return kyc;
    } catch (error) {
      throw new Error(`Failed to reject document: ${error.message}`);
    }
  }

  /**
   * Get KYC statistics for admin dashboard
   */
  async getKYCStats() {
    try {
      const stats = await Promise.all([
        KYC.countDocuments({ status: KYC_STATUS.INCOMPLETE }),
        KYC.countDocuments({ status: KYC_STATUS.PENDING }),
        KYC.countDocuments({ status: KYC_STATUS.UNDER_REVIEW }),
        KYC.countDocuments({ status: KYC_STATUS.APPROVED }),
        KYC.countDocuments({ status: KYC_STATUS.REJECTED }),
        KYC.countDocuments({ status: KYC_STATUS.EXPIRED }),
        KYC.countDocuments({
          status: KYC_STATUS.APPROVED,
          expiryDate: { $lt: new Date() },
        }),
      ]);

      return {
        incomplete: stats[0],
        pending: stats[1],
        underReview: stats[2],
        approved: stats[3],
        rejected: stats[4],
        expired: stats[5],
        expiringSoon: stats[6],
        total: stats[0] + stats[1] + stats[2] + stats[3] + stats[4] + stats[5],
      };
    } catch (error) {
      throw new Error(`Failed to fetch KYC stats: ${error.message}`);
    }
  }

  /**
   * Get KYCs expiring in next N days
   */
  async getExpiringKYCs(days = 30) {
    try {
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + days);

      const kycs = await KYC.find({
        status: KYC_STATUS.APPROVED,
        expiryDate: {
          $gte: new Date(),
          $lte: expiryThreshold,
        },
      })
        .populate('userId', 'email phone')
        .sort({ expiryDate: 1 });

      return kycs;
    } catch (error) {
      throw new Error(`Failed to fetch expiring KYCs: ${error.message}`);
    }
  }

  /**
   * Mark expired KYCs (run via cron job)
   */
  async markExpiredKYCs() {
    try {
      const expiredKYCs = await KYC.find({
        status: KYC_STATUS.APPROVED,
        expiryDate: { $lt: new Date() },
      });

      const results = [];
      for (const kyc of expiredKYCs) {
        try {
          await kyc.markExpired();
          results.push({ userId: kyc.userId, success: true });
        } catch (error) {
          results.push({
            userId: kyc.userId,
            success: false,
            error: error.message,
          });
        }
      }

      return {
        total: expiredKYCs.length,
        results,
      };
    } catch (error) {
      throw new Error(`Failed to mark expired KYCs: ${error.message}`);
    }
  }

  /**
   * Get KYC verification history
   */
  async getVerificationHistory(kycId) {
    try {
      const kyc = await KYC.findById(kycId)
        .populate('verificationHistory.performedBy', 'email firstName lastName')
        .select('verificationHistory');

      if (!kyc) {
        throw new Error('KYC record not found');
      }

      return kyc.verificationHistory;
    } catch (error) {
      throw new Error(`Failed to fetch verification history: ${error.message}`);
    }
  }

  /**
   * Search KYCs (admin)
   */
  async searchKYCs(filters, page = 1, limit = 10) {
    try {
      const query = {};

      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.gstNumber) {
        query.gstNumber = new RegExp(filters.gstNumber, 'i');
      }
      if (filters.panNumber) {
        query.panNumber = new RegExp(filters.panNumber, 'i');
      }
      if (filters.companyName) {
        query.companyName = new RegExp(filters.companyName, 'i');
      }
      if (filters.submittedFrom || filters.submittedTo) {
        query.submittedAt = {};
        if (filters.submittedFrom) {
          query.submittedAt.$gte = new Date(filters.submittedFrom);
        }
        if (filters.submittedTo) {
          query.submittedAt.$lte = new Date(filters.submittedTo);
        }
      }

      const skip = (page - 1) * limit;

      const kycs = await KYC.find(query)
        .populate('userId', 'email phone')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await KYC.countDocuments(query);

      return {
        kycs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to search KYCs: ${error.message}`);
    }
  }
}

const kycService = new KYCService();

export default kycService;
