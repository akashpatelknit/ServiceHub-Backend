import { User, Vendor, Admin } from '../core/models/index.js';
import { Address } from '../features/address/models/address.model.js';
import { BankAccount } from './bankAccount.model.js';
import Transaction from './transaction.model.js';
import Wallet from './wallet.model.js';
import { VendorService } from './vendorServiceSchema.js';
import { ServiceTemplate } from './serviceTemplateSchema.js';
import Order from './order.model.js';
import { Booking } from './booking.model.js';
import { Product } from './product.model.js';
import { Category } from './category.model.js';
import { Membership } from './membership.model.js';
import { MembershipPlan } from './membershipPlan.model.js';
import { AddOn } from './addOns.model.js';
import { Setting } from './settings.model.js';
import { Rating } from './rating.model.js';
import WithdrawalRequest from './withdrawalRequest.model.js';
import { Service } from './service.model.js';
import { Coupon } from './coupon.model.js';
import { CalculatorLead } from './calculatorLead.model.js';

// User/Vendor/Admin live in core/models/ (see features/auth); Address lives
// in features/address/models/. KYC moved entirely to
// features/auth/models/kyc.model.js — no more VendorKYC here.
export {
  User,
  BankAccount,
  Admin,
  Vendor,
  Transaction,
  Wallet,
  Booking,
  VendorService,
  ServiceTemplate,
  Order,
  Address,
  Product,
  Category,
  Membership,
  MembershipPlan,
  AddOn,
  Setting,
  Rating,
  WithdrawalRequest,
  Service,
  Coupon,
  CalculatorLead,
};
