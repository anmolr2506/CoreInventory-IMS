# User Approval Workflow - Implementation Guide

## Overview
The user approval workflow system controls access to the Core Inventory system by requiring new signups to be approved by managers or admins before accessing the dashboard.

## System Architecture

### Database Changes
- **New Columns in `users` table:**
  - `is_approved` (BOOLEAN, DEFAULT false) - Gates dashboard access
  - `approval_status` (VARCHAR) - Values: 'pending', 'approved', 'rejected'
  - `approved_by` (INT, FK→users) - Audit: who approved the user
  - `approved_at` (TIMESTAMP) - Audit: when approval occurred
  - `requested_role` (VARCHAR) - Role requested during signup ('staff' or 'manager')
  - **Updated Role constraint:** Added 'pending_user' to allowed roles for temporary signup state

### Workflow States
1. **New User Signup** → `role='pending_user'`, `approval_status='pending'`, `is_approved=false`
2. **Manager/Admin Reviews** → Can view pending requests in dashboard
3. **Approval** → User promoted to `requested_role`, `approval_status='approved'`, `is_approved=true`
4. **Rejection** → `approval_status='rejected'` (user account remains but cannot login)
5. **Dashboard Access** → Only available when `is_approved=true`

## Frontend Components

### 1. WaitingForApproval Component
- **Location:** `client/src/components/WaitingForApproval.jsx`
- **Purpose:** Displays to users waiting for approval
- **Features:**
  - Pulsing clock icon (yellow-500) indicating pending status
  - User info card showing username and signup date
  - Information about the approval process
  - Logout button with confirmation dialog
- **Props:**
  - `username` (string) - Display user's name
  - `onLogout` (function) - Callback for logout
  - `createdAt` (timestamp) - User signup date

### 2. ApprovalRequests Component
- **Location:** `client/src/components/ApprovalRequests.jsx`
- **Purpose:** Displays pending user approval requests for managers and admins
- **Features:**
  - List of pending user requests with user info
  - Approve/Reject buttons for each request
  - Optional rejection reason input
  - Auto-refreshes every 30 seconds
  - Success/error notifications
- **API Endpoints Used:**
  - `GET /approvals/pending` - Fetch pending requests
  - `POST /approval/:user_id/approve` - Approve user
  - `POST /approval/:user_id/reject` - Reject user

### 3. Updated Dashboard Components
- **ManagerDashboard:** Added "Approval Requests" option in Settings dropdown
- **AdminDashboard:** Added "User Approvals" tab
- **App.jsx:** Added conditional rendering to show WaitingForApproval when user is not approved

## Backend Implementation

### 1. Controller: approvalUserController.js
Located at `server/controllers/approvalUserController.js`

**Functions:**
- `getPendingApprovals()` - Query pending users, filtered by manager role
- `approveUser()` - Atomic transaction to approve and assign role
- `rejectUser()` - Atomic transaction to reject with optional reason
- `getUserApprovalStatus()` - Check user's approval state
- `getAllUsersWithStatus()` - Admin view of all users with approval status

**Key Features:**
- Atomic transactions ensure data consistency
- Role-based filtering (managers only see staff, admins see all)
- Comprehensive audit logging for all actions
- Error handling with proper HTTP status codes

### 2. Routes: approvalUserRoutes.js
Located at `server/routes/approvalUserRoutes.js`

**Endpoints:**
```
GET  /user/approval-status           - Check own approval status
GET  /approvals/pending              - List pending requests (manager/admin)
POST /approval/:user_id/approve      - Approve user (manager/admin)
POST /approval/:user_id/reject       - Reject user (manager/admin)
GET  /users/all                      - All users with status (admin only)
```

All endpoints require:
- `Authorization: Bearer <token>` header
- Role-based access control middleware

### 3. Updated authController.js
- **signup()** - Creates new users with role='pending_user', approval_status='pending'
- **login()** - Returns `is_approved` and `approval_status` flags in response
- Both return `created_at` timestamp for display in WaitingForApproval

## Authorization Rules

### Managers
- Can view pending staff approval requests only
- Can approve staff (assigns role='staff')
- **Cannot** approve managers

### Admins
- Can view all pending requests (staff and managers)
- Can approve both staff and managers
- Can view all users with approval status

## Testing the System

### Setup
1. Run the setup script to create a test admin account:
```bash
cd server
node setup_test_admin.js
```

Test Admin Credentials:
- Email: `admin@example.com`
- Password: `admin123`

### Test Workflow

#### Step 1: Create New User (Signup)
1. Go to signup page
2. Fill in details (request role: 'staff')
3. Submit signup
4. See "Waiting for Approval" screen with pulsing clock icon

#### Step 2: View Approval Requests as Manager
1. Login as manager: `manager@example.com`
2. Click Settings → "Approval Requests"
3. See pending staff request
4. Click "Approve" → Staff user gets approved

#### Step 3: View Approval Requests as Admin
1. Login as admin: `admin@example.com`
2. Click "User Approvals" tab
3. See all pending requests (staff and managers)
4. Approve or reject as needed

#### Step 4: Approved User Access
1. Logout and login with approved user account
2. Should now see appropriate dashboard (staff/manager)
3. Not see "Waiting for Approval" screen anymore

## Database Schema Changes

```sql
-- Added to users table:
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'pending' 
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS requested_role VARCHAR(30) NOT NULL DEFAULT 'staff' 
  CHECK (requested_role IN ('manager', 'staff'));

-- Updated role constraint:
ALTER TABLE users MODIFY role VARCHAR(30) NOT NULL 
  CHECK (role IN ('manager','staff','admin','pending_user'));
```

## Audit Logging
All approval/rejection actions are logged using the existing `logOperation()` function:
- Records which admin/manager performed the action
- Tracks timestamp of action
- Stores user info and assigned role
- Rejection reasons are captured

## Files Modified/Created

### New Files
- `client/src/components/WaitingForApproval.jsx` (120 lines)
- `client/src/components/ApprovalRequests.jsx` (130 lines)
- `server/controllers/approvalUserController.js` (250+ lines)
- `server/routes/approvalUserRoutes.js` (50+ lines)
- `server/setup_test_admin.js` (40+ lines)

### Modified Files
- `client/src/App.jsx` - Added approval status tracking and conditional rendering
- `client/src/components/login.jsx` - Returns approval status fields
- `client/src/components/signup.jsx` - Returns approval status and created_at
- `client/src/components/ManagerDashboard.jsx` - Added Approval Requests dropdown option
- `client/src/components/AdminDashboard.jsx` - Added User Approvals tab
- `server/controllers/authController.js` - Returns approval status in signup/login
- `server/database/schema.sql` - Added approval workflow columns and updated role constraint
- `server/database/seed.sql` - Updated admin user to be pre-approved
- `server/index.js` - Registered approvalUserRoutes

## Security Considerations
1. **Role-Based Access Control:** Enforced at route level with middleware
2. **Atomic Transactions:** Prevent partial state updates
3. **Audit Trail:** All actions logged with timestamps and user info
4. **Token-Based Auth:** All endpoints require valid JWT token
5. **Email Verification:** Existing system can be extended with OTP for approvals

## Performance Notes
- ApprovalRequests component auto-refreshes every 30 seconds
- Database queries use indexed columns (email, user_id)
- Transactions kept minimal for lock duration
- No N+1 queries - uses single SELECT with JOINs

## Future Enhancements
1. Email notifications when users request access
2. Email notifications when approvals/rejections occur
3. Approval request comments/feedback
4. Batch approval for multiple users
5. Scheduled auto-rejection of pending requests after X days
6. Department-level approval workflows
7. Approval history and analytics dashboard

