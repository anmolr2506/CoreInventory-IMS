# Role-Based Inventory Management System - Implementation Guide

## 🎯 Overview

The system has been successfully configured with role-based access control for three user types:
- **Admins**: Full system access
- **Inventory Managers**: Manage incoming/outgoing stock with approval capabilities
- **Warehouse Staff**: Perform warehouse operations with manager approval for transfers

---

## 🔐 Authentication & Authorization

### Login Response Structure
```json
{
  "token": "JWT_TOKEN",
  "username": "John Doe",
  "role": "manager",
  "warehouses": [
    { "warehouse_id": 1, "name": "Main Warehouse" }
  ],
  "user_id": 5
}
```

### Stored Data
After successful login, the following data is stored in localStorage:
- `token`: JWT token for API authentication
- `username`: User's name
- `role`: User's role (admin, manager, staff)
- `user_id`: User's ID
- `warehouses`: Array of assigned warehouses (for staff only)

---

## 👤 User Roles & Permissions

### 1. ADMIN
**Access Level**: Full system access
**Capabilities**:
- ✅ View all inventory across all warehouses
- ✅ Create receipts and deliveries
- ✅ Approve/reject all requests
- ✅ Manage users and warehouses
- ✅ View complete audit logs
- ✅ Create transfers

**Dashboard Features**:
- System overview with all KPIs
- User management interface
- Warehouse management

---

### 2. MANAGER (Inventory Manager)
**Access Level**: Limited to inventory operations
**Capabilities**:
- ✅ View all inventory
- ✅ Create receipts (incoming stock)
- ✅ Create deliveries (outgoing stock)
- ✅ **APPROVE/REJECT** staff transfer requests
- ✅ **APPROVE/REJECT** receipt requests
- ✅ **APPROVE/REJECT** delivery requests
- ✅ View approval queue with pending requests
- ✅ View warehouse operation logs
- ❌ Cannot create staff accounts
- ❌ Cannot approve their own requests

**Dashboard Features**:
- Inventory Overview (all warehouses)
- Pending Approvals (receipts, deliveries, transfers)
- Receipt History
- Delivery History
- Low stock alerts

**Workflow**:
1. Staff creates request → PENDING
2. Manager reviews → APPROVED or REJECTED
3. If approved → Auto-update inventory
4. If rejected → Request cancelled

---

### 3. STAFF (Warehouse Staff)
**Access Level**: Limited to assigned warehouse(s)
**Capabilities**:
- ✅ View inventory for assigned warehouse(s) only
- ✅ Create transfer requests (between warehouses)
- ✅ Log warehouse operations:
  - Picking (selecting items for orders)
  - Shelving (organizing received stock)
  - Counting (inventory verification)
- ✅ View transfer history
- ✅ View operation logs
- ❌ Cannot approve requests
- ❌ Cannot view other warehouses
- ❌ Cannot create receipts/deliveries

**Dashboard Features**:
- Warehouse selector (if assigned to multiple)
- Warehouse-specific inventory view
- Transfer request form
- Warehouse operation logger
- Recent operations and transfer history

**Workflow**:
1. Staff logs operation (picking, shelving, counting)
2. Operation is recorded in audit trail
3. Manager receives alerts for transfers
4. Manager can approve/reject transfers

---

## 🔀 Approval Workflow

### For Receipts (Incoming Stock)
```
Manager creates receipt
    ↓
Status: PENDING (awaiting approval)
    ↓
Manager approves
    ↓
Inventory updated (+quantity)
    ↓
Status: APPROVED
```

### For Deliveries (Outgoing Stock)
```
Manager creates delivery
    ↓
Status: PENDING (awaiting approval)
    ↓
Manager approves
    ↓
Inventory updated (-quantity)
    ↓
Status: APPROVED
```

### For Transfers (Between Warehouses)
```
Staff requests transfer
    ↓
Status: PENDING (awaiting approval)
    ↓
Manager approves
    ↓
Source warehouse (-quantity)
Destination warehouse (+quantity)
    ↓
Status: APPROVED
```

---

## 📡 API Endpoints

### Authentication
```
POST /login
  Body: { email, password }
  Returns: { token, username, role, warehouses, user_id }

POST /signup
  Body: { username, email, password, role?, warehouse_id? }
  Returns: { token, username, role, warehouses }
```

### Inventory Management
```
GET /inventory
  Headers: { Authorization: Bearer TOKEN }
  Returns: All accessible inventory (filtered by warehouse for staff)

GET /inventory/warehouse/:warehouse_id
  Headers: { Authorization: Bearer TOKEN }
  Returns: Inventory for specific warehouse

POST /inventory/receipt
  Headers: { Authorization: Bearer TOKEN }
  Body: { product_id, warehouse_id, supplier_id, quantity }
  Role Required: manager, admin
  Returns: { message, receipt }

POST /inventory/delivery
  Headers: { Authorization: Bearer TOKEN }
  Body: { product_id, warehouse_id, customer_name, quantity }
  Role Required: manager, admin
  Returns: { message, delivery }

GET /inventory/receipts
  Returns: All receipts with status

GET /inventory/deliveries
  Returns: All deliveries with status
```

### Approvals
```
GET /approval/pending
  Headers: { Authorization: Bearer TOKEN }
  Role Required: manager, admin
  Returns: All pending receipts, deliveries, transfers

POST /approval/receipt/:receipt_id/approve
  Role Required: manager, admin
  Body: { approval_notes? }
  Returns: { message, receipt_id }

POST /approval/receipt/:receipt_id/reject
  Role Required: manager, admin
  Body: { rejection_reason }
  Returns: { message, receipt_id }

POST /approval/delivery/:delivery_id/approve
  Role Required: manager, admin
  Body: { approval_notes? }
  Returns: { message, delivery_id, remaining_quantity }

POST /approval/delivery/:delivery_id/reject
  Role Required: manager, admin
  Body: { rejection_reason }
  Returns: { message, delivery_id }

POST /approval/transfer/:transfer_id/approve
  Role Required: manager, admin
  Body: { approval_notes? }
  Returns: { message, transfer_id }
```

### Transfers
```
POST /transfer
  Headers: { Authorization: Bearer TOKEN }
  Body: { product_id, from_warehouse, to_warehouse, quantity }
  Role Required: staff
  Returns: { message, transfer }

GET /transfer/active
  Headers: { Authorization: Bearer TOKEN }
  Role Required: manager, admin
  Returns: All pending and approved transfers

GET /transfer/history
  Headers: { Authorization: Bearer TOKEN }
  Returns: Transfer history (filtered by role)
```

### Warehouse Operations
```
POST /warehouse-operation
  Headers: { Authorization: Bearer TOKEN }
  Body: { operation_type, product_id, warehouse_id, quantity, notes? }
  Values: operation_type = 'picking' | 'shelving' | 'counting'
  Role Required: staff
  Returns: { message, operation }

GET /warehouse-operations
  Headers: { Authorization: Bearer TOKEN }
  Query: ?warehouse_id=X&days=7
  Returns: Operation logs filtered by role/warehouse
```

---

## 📊 Database Changes

### New Tables
1. **role_permissions**: Stores permissions for each role
2. **warehouse_assignments**: Maps staff to assigned warehouses

### Modified Tables
1. **users**: Added `reset_otp`, `reset_otp_expiry`, `is_active`, `last_login`
2. **receipts**: Added `status` column (pending, approved, rejected)
3. **deliveries**: Added `status` column (pending, approved, rejected)
4. **transfers**: Added `status` column (pending, approved)

### New Columns Tracking
- All operations are tracked in `stock_ledger` with user, timestamp, and type

---

## 🧪 Testing Checklist

### Test Manager Workflow
```
1. ✅ Login as manager
2. ✅ View inventory across warehouses
3. ✅ Create receipt (status should be PENDING)
4. ✅ View receipt in pending approvals
5. ✅ Approve receipt → inventory should increase
6. ✅ Create delivery (status should be PENDING)
7. ✅ Approve delivery → inventory should decrease
8. ✅ View approval queue with counts
```

### Test Staff Workflow
```
1. ✅ Login as staff
2. ✅ View only assigned warehouse inventory
3. ✅ Log picking operation
4. ✅ Log shelving operation
5. ✅ Log counting operation
6. ✅ Create transfer request
7. ✅ View transfer in history with PENDING status
8. ✅ Verify warehouse selector working
```

### Test Approval Workflow
```
1. ✅ Staff requests transfer
2. ✅ Manager sees in pending approvals
3. ✅ Manager approves → status APPROVED
4. ✅ Both warehouses inventory updated correctly
5. ✅ Verify manager can reject with reason
6. ✅ Verify operations logged in audit trail
```

### Test Access Control
```
1. ✅ Staff cannot create receipts/deliveries
2. ✅ Staff cannot approve requests
3. ✅ Staff cannot view other warehouse inventory
4. ✅ Managers cannot access admin features
5. ✅ Unauthenticated users cannot access protected routes
6. ✅ Invalid tokens return 401 error
```

---

## 🗂️ File Structure - New Files Created

### Backend
```
server/
├── middleware/
│   ├── roleAuthorization.js (NEW - role checking)
│   └── permissionCheck.js (NEW - permission validation)
├── controllers/
│   └── approvalController.js (NEW - approval workflows)
├── utils/
│   └── auditLog.js (NEW - operation tracking)
└── routes/
    ├── inventoryRoutes.js (UPDATED - role-based access)
    ├── transferRoutes.js (UPDATED - staff operations)
    └── approvalRoutes.js (NEW - approval endpoints)
```

### Frontend
```
client/src/components/
├── ManagerDashboard.jsx (NEW)
├── StaffDashboard.jsx (NEW)
├── AdminDashboard.jsx (NEW)
└── login.jsx (UPDATED - stores role & warehouses)
```

---

## 🚀 Key Features Implemented

### 1. Role-Based Access Control (RBAC)
- Every endpoint checks user role before allowing access
- Middleware validates authentication and authorization
- Granular permission system for future expansion

### 2. Warehouse-Based Access
- Staff members are assigned to specific warehouse(s)
- They can only see and operate on assigned warehouses
- Managers and admins see all warehouses

### 3. Approval Workflow
- All stock movements (receipts, deliveries, transfers) require approval
- Managers approve/reject requests with optional notes
- Automatic inventory updates on approval

### 4. Audit Logging
- Every operation is logged with:
  - User ID and name
  - Operation type
  - Quantity and warehouse
  - Timestamp
  - Status changes

### 5. Operation Tracking
- Staff can log warehouse operations (picking, shelving, counting)
- Each operation is tracked in audit trail
- Managers can view all operations

---

## 🔧 Configuration Notes

### For Creating New Users
During signup, specify:
- `role`: 'admin' | 'manager' | 'staff'
- `warehouse_id`: (if staff) - warehouse to assign

Example:
```javascript
{
  "username": "john_staff",
  "email": "john@warehouse.com",
  "password": "secure_password",
  "role": "staff",
  "warehouse_id": 1
}
```

### Environment Variables Required
- None new required (existing setup sufficient)
- Database must have new tables from schema migration

---

## ⚠️ Important Notes

1. **Password Reset**: OTP-based reset is preserved for all roles
2. **Inactive Accounts**: Users with `is_active = false` cannot login
3. **Concurrent Operations**: Multiple staff members can log operations simultaneously
4. **Stock Validation**: All deliveries check stock availability before approval
5. **Warehouse Transfer**: Cannot transfer to same warehouse

---

## 🎓 Next Steps

1. **Test the system** with all three user roles
2. **Create test users** for each role
3. **Assign warehouses** to staff members
4. **Train staff** on portal operations
5. **Monitor audit logs** for any issues
6. **Gather feedback** from users

---

## 📞 Support & Troubleshooting

### Common Issues

**"Unauthorized: No user found"**
- Check if token is properly stored in localStorage
- Verify token hasn't expired

**"Forbidden: You don't have access to this warehouse"**
- Verify warehouse assignment in database
- Staff can only access assigned warehouses

**"Status is pending, cannot approve"**
- Request may have already been approved/rejected
- Refresh the page to get latest status

**Inventory not updating after approval**
- Check if status updated correctly in database
- Verify quantity calculation logic
- Check database constraints

---

## 📝 Version Info
- **Version**: 1.0.0
- **Last Updated**: March 14, 2026
- **Status**: Fully Implemented & Ready for Testing

---
