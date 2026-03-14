# 🚀 Role-Based System - Quick Start Guide

## What's New?

Your Core Inventory IMS now has **role-based access control** with three distinct user types:
- **Admin**: Full system access
- **Inventory Manager**: Approves stock movements
- **Warehouse Staff**: Logs operations, requests transfers

---

## 🎯 Quick Setup (5 minutes)

### 1. Database Migration (Already Done)
✅ DB engineer has pushed all schema changes
✅ New tables created: `role_permissions`, `warehouse_assignments`
✅ Status tracking added to receipts, deliveries, transfers

### 2. Backend Ready
✅ All APIs are implemented with role validation
✅ Approval workflows are active
✅ Audit logging is enabled

### 3. Frontend Ready
✅ Role-specific dashboards created
✅ Smart routing based on user role
✅ New login flow stores role & warehouse data

---

## 👥 Create Test Users

### Test Admin User
```sql
INSERT INTO users (name, email, password_hash, role, is_active) 
VALUES ('Admin User', 'admin@company.com', '$2b$10$...', 'admin', true);
```

### Test Manager User
```sql
INSERT INTO users (name, email, password_hash, role, is_active) 
VALUES ('John Manager', 'john@company.com', '$2b$10$...', 'manager', true);
```

### Test Staff User (with warehouse assignment)
```sql
INSERT INTO users (name, email, password_hash, role, is_active) 
VALUES ('Jane Staff', 'jane@company.com', '$2b$10$...', 'staff', true);

-- Assign to warehouse
INSERT INTO warehouse_assignments (user_id, warehouse_id) 
VALUES (3, 1);  -- Assign user 3 to warehouse 1
```

---

## 📋 Testing Workflow

### Manager Test Scenario
```
1. Login as: john@company.com (manager)
2. Go to "Inventory" tab
3. Click "Create Receipt"
4. Fill: Product ID=1, Warehouse=1, Supplier=1, Qty=100
5. Tab changes to "Approvals"
6. Click "Approve" on the pending receipt
7. Check inventory - should increase by 100
8. View receipt history - status should be "approved"
```

### Staff Test Scenario
```
1. Login as: jane@company.com (staff)
2. See "Warehouse Inventory" for assigned warehouse only
3. Click "Operations" tab
4. Select "Picking" operation
5. Enter Product ID=1, Qty=5
6. Click "Log Operation"
7. Check "Recent Operations" - should see new entry
8. Click "Transfers" tab
9. Request transfer to another warehouse
10. View history - status should be "pending"
```

### Approval Test
```
1. As Staff: Request a transfer (Step 9 above)
2. As Manager: Go to "Approvals" tab
3. See pending transfer request
4. Click "Approve"
5. Check inventory in both warehouses - should be updated
```

---

## 🔑 Key Login Responses

**Manager Login:**
```json
{
  "token": "eyJhbGc...",
  "username": "John Manager",
  "role": "manager",
  "warehouses": [],
  "user_id": 2
}
```

**Staff Login:**
```json
{
  "token": "eyJhbGc...",
  "username": "Jane Staff",
  "role": "staff",
  "warehouses": [
    { "warehouse_id": 1, "name": "Main Warehouse" }
  ],
  "user_id": 3
}
```

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Staff sees wrong warehouse | Check `warehouse_assignments` table |
| Cannot approve request | Verify user role is 'manager' or 'admin' |
| Inventory not updating | Check if status is 'approved' in database |
| "Unauthorized" error | Ensure JWT token is in Authorization header |

---

## 🎓 Key Features to Test

- [ ] Manager can approve receipts
- [ ] Manager can approve deliveries
- [ ] Manager can approve transfers
- [ ] Staff cannot see other warehouses
- [ ] Staff can log operations
- [ ] Staff cannot approve requests
- [ ] Inventory updates on approval
- [ ] Operations are audit-logged
- [ ] Status tracking works correctly

---

## 📞 If Issues Arise

1. Check browser console for errors
2. Check server logs: `npm run dev` or `node index.js`
3. Verify database connection
4. Verify role is stored in localStorage
5. Check API response status codes

---

## 🚀 Next Steps

1. **Today**: Test all three roles
2. **Tomorrow**: Create actual staff accounts & assign warehouses
3. **This Week**: Train staff on portal
4. **Next Week**: Go live with role-based system

---

**Status**: ✅ READY FOR TESTING
**Created**: March 14, 2026
**Last Updated**: March 14, 2026
