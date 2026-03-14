# Internal Transfers & Stock Adjustments - Feature Documentation

## Overview

This document describes the two major operational features added to Core Inventory IMS:
1. **Internal Transfers** - Move stock between warehouses and locations
2. **Stock Adjustments** - Fix discrepancies between recorded and physical inventory counts

Both features are built with **modularity**, **scalability**, and **audit compliance** in mind.

---

## 1. Internal Transfers

### Purpose
Move stock from one warehouse to another warehouse, handling:
- Warehouse-to-warehouse transfers
- Location-to-location transfers within same warehouse
- Location-to-location transfers across warehouses

### Key Features

#### 1.1 Automatic Inventory Updates
```
Transfer: 100 units of Product A from Warehouse 1 → Warehouse 2

Result:
- Warehouse 1 stock: -100
- Warehouse 2 stock: +100
- Stock Ledger: Two entries (source -100, destination +100)
```

#### 1.2 Stock Validation
- Verifies stock availability before transfer
- Returns user-friendly error messages
- Prevents transfers from empty warehouses

#### 1.3 Audit Trail
Every transfer is logged with:
- Product information
- Source and destination
- Quantity transferred
- User who initiated transfer
- Timestamp
- Reference ID for tracking

### User Interface

#### Access Location
**Dashboard → Operations Menu → Internal Transfers**

#### Main Components

1. **Statistics Cards** (Dashboard view)
   - Total transfers completed
   - Total quantity transferred across system
   - Unique products moved

2. **Transfer Form**
   - Product selector: Choose product to transfer
   - Source warehouse: Select warehouse to transfer from
   - Destination warehouse: Select different warehouse to transfer to
   - Quantity: Enter number of units (must be ≤ available stock)
   - Notes: Optional field for additional context

3. **Transfers List**
   - Search functionality (by product, warehouse)
   - Shows all transfers chronologically
   - Displays: Product name, source → destination, quantity, user, date

### API Endpoints

#### Create Transfer
```
POST /transfer
Headers: { Authorization: Bearer <token> }
Body: {
  product_id: integer,
  from_warehouse: integer,
  to_warehouse: integer,
  quantity: integer,
  notes: string (optional)
}

Response: {
  success: true,
  message: "Transfer completed successfully",
  transfer: {...}
}
```

#### Get All Transfers
```
GET /transfers?status=completed&warehouse_id=1
Headers: { Authorization: Bearer <token> }

Response: {
  success: true,
  data: [...],
  count: number
}
```

#### Get Transfer Statistics
```
GET /transfer-stats?warehouse_id=1
Headers: { Authorization: Bearer <token> }

Response: {
  success: true,
  data: {
    total_transfers: 125,
    total_quantity_transferred: 5000,
    unique_products: 42
  }
}
```

### Database Structure

**transfers table:**
```sql
- transfer_id (INT, PK)
- product_id (INT, FK → products)
- from_warehouse (INT, FK → warehouses)
- to_warehouse (INT, FK → warehouses)
- quantity (INT)
- transferred_by (INT, FK → users)
- transferred_at (TIMESTAMP)
- status (VARCHAR) - currently 'completed'
```

**stock_ledger table:**
```sql
- ledger_id (INT, PK)
- product_id (INT, FK → products)
- warehouse_id (INT, FK → warehouses)
- operation_type (VARCHAR) - 'TRANSFER' for transfers
- quantity (INT) - negative for source, positive for destination
- reference_id (INT) - links to transfer_id
- created_at (TIMESTAMP)
```

### Business Rules

1. **Source ≠ Destination**
   - Cannot transfer to same warehouse
   - System prevents self-transfers

2. **Sufficient Stock**
   - Transfer quantity must be ≤ available quantity
   - Returns available count if insufficient

3. **Valid Warehouses**
   - Both warehouses must exist
   - Verified before transaction begins

4. **User Authorization**
   - Managers and Admins can create transfers
   - Staff have read-only access to their warehouse transfers

### Workflow Example

```
1. Manager logs into dashboard
2. Clicks "Operations" → "Internal Transfers"
3. Enters transfer details:
   - Product: "Widget A"
   - From: "Main Warehouse"
   - To: "Regional Branch"
   - Quantity: 500
4. System validates:
   ✓ Product exists
   ✓ Main Warehouse has ≥ 500 units
   ✓ Regional Branch exists
5. Creates transfer record with status='completed'
6. Updates inventory:
   - Main Warehouse Widget A: -500
   - Regional Branch Widget A: +500
7. Logs to stock_ledger (2 entries)
8. Shows success confirmation
9. Entry appears in transfers list
```

---

## 2. Stock Adjustments

### Purpose
Fix discrepancies between recorded inventory (in system) and physical count (actual warehouse count).

### Key Features

#### 2.1 Physical Count Workflow
```
System Records: 100 units of Product A in Warehouse 1
Physical Count: 95 units found during inventory check

Adjustment: -5 units (reason: shrinkage/damage)

Result:
- Inventory updated to 95 units
- Adjustment logged with reason
- Variance tracked for audit
```

#### 2.2 Adjustment Reasons
Built-in reason categories:
- Physical Count Mismatch (standard variance)
- Damage/Loss (broken/unusable inventory)
- Data Entry Error (previous incorrect entry)
- Theft/Shrinkage (unexplained loss)
- Return/Rework (damaged goods returned to stock)
- Expired Stock (removed from usable inventory)
- Other (custom reason)

#### 2.3 Automatic Updates
- No manual stock updates needed
- System calculates variance automatically
- Updates inventory atomically
- Logs all details for audit trail

### User Interface

#### Access Location
**Dashboard → Operations Menu → Stock Adjustments**

#### Main Components

1. **Instructions Section**
   - Explains physical count process
   - Emphasizes accuracy importance

2. **Adjustment Form**
   - Product selector: Choose product to adjust
   - Product information display:
     - Current stock in system
     - SKU
     - Warehouse name
     - Stock status (in_stock, low_stock, out_of_stock)
   - Counted quantity: Enter physically counted amount
   - Adjustment amount: Auto-displays variance
     - Green (+) for increases
     - Red (-) for decreases
     - Gray (0) for no change
   - Reason dropdown: Select reason for adjustment

3. **Adjustments History List**
   - Product and warehouse information
   - Adjustment amount with color coding
   - Reason displayed
   - User who recorded adjustment
   - Timestamp

### API Endpoints

#### Create Adjustment
```
POST /adjustment
Headers: { Authorization: Bearer <token> }
Body: {
  product_id: integer,
  warehouse_id: integer,
  counted_quantity: integer,
  reason: string
}

Response: {
  success: true,
  message: "Stock adjusted by +5",
  adjustment: {
    adjustment_id: 123,
    product_id: 456,
    warehouse_id: 789,
    adjustment: 5,
    reason: "Return/Rework",
    adjusted_by: 2,
    adjusted_at: "2024-03-14T10:30:00Z"
  }
}
```

#### Get All Adjustments
```
GET /adjustments?warehouse_id=1&limit=50&offset=0
Headers: { Authorization: Bearer <token> }

Response: {
  success: true,
  data: [...],
  count: number
}
```

#### Get Low Stock Alerts
```
GET /inventory/alerts/low-stock?warehouse_id=1
Headers: { Authorization: Bearer <token> }

Response: {
  success: true,
  data: [
    {
      product_id: 1,
      product_name: "Widget A",
      reorder_level: 100,
      quantity: 45,
      units_needed: 55
    }
  ],
  alert_count: 12
}
```

### Database Structure

**stock_adjustments table:**
```sql
- adjustment_id (INT, PK)
- product_id (INT, FK → products)
- warehouse_id (INT, FK → warehouses)
- adjustment (INT) - positive or negative change
- reason (VARCHAR) - reason for adjustment
- adjusted_by (INT, FK → users)
- adjusted_at (TIMESTAMP)
```

**inventory table (updated):**
```sql
- inventory_id (INT, PK)
- product_id (INT, FK)
- warehouse_id (INT, FK)
- quantity (INT) - updated by adjustments
- last_updated (TIMESTAMP)
```

### Business Rules

1. **Non-Negative Final Quantity**
   - Counted quantity must be ≥ 0
   - If 0, inventory record deleted
   - If > 0, inventory updated

2. **Reason Required**
   - Every adjustment must have a reason
   - Supports custom reasons via "Other" option

3. **User Authorization**
   - Managers and Admins can create adjustments
   - All adjustments are logged with user ID

4. **Audit Trail**
   - Original vs. counted quantity tracked
   - Adjustment amount calculated and stored
   - Reason documented
   - Timestamp recorded

### Workflow Example

```
1. Manager schedules physical inventory count
2. Staff physically counts products
3. Manager logs into dashboard
4. Clicks "Operations" → "Stock Adjustments"
5. Enters adjustment:
   - Product: "Widget A"
   - Warehouse: "Main Warehouse"
   - Counted Quantity: 95 (system showed 100)
   - Reason: "Physical Count Mismatch"
6. System displays:
   - Current stock: 100
   - Counted: 95
   - Adjustment: -5
7. Confirms adjustment
8. System:
   ✓ Updates inventory: 95 units
   ✓ Logs adjustment entry
   ✓ Logs to stock_ledger
   ✓ Shows success message
9. Entry appears in adjustments history
10. Variance tracked for next audit
```

---

## 3. Integration with Existing Systems

### Approval Workflow
Both features integrate with existing approval system:
- Transfers are auto-approved (managers/admins create them)
- Adjustments are auto-approved but fully audited
- All operations logged to audit trail

### Warehouse Access Control
- Staff access restricted to assigned warehouses
- Managers/Admins have full system access
- Audit logs show who made each change

### Low Stock Alerts
- Stock Adjustments feed into low stock system
- Alert threshold: `quantity ≤ reorder_level`
- Available via `/inventory/alerts/low-stock` endpoint

### Analytics
Both features provide operational data:
```
Transfer Statistics:
- Total transfers over time period
- Volume by product
- Volume by warehouse pair
- Busiest transfer routes

Adjustment Statistics:
- Adjustment frequency
- Top reasons for adjustments
- Variance trends
- Warehouse accuracy metrics
```

---

## 4. Implementation Details

### Modularity

**Controller Functions:**
```javascript
// transferController.js
- validateTransfer()       // Validation logic
- getAllTransfers()        // Query with filtering
- getTransfer()           // Single record
- createTransfer()        // Atomic transaction
- getTransferHistory()    // Paginated history
- getTransferStats()      // Analytics

// inventoryController.js
- getAllInventory()       // List inventory
- getProductInventory()   // Product across warehouses
- getWarehouseInventory() // Warehouse details
- createAdjustment()      // Atomic adjustment
- getAllAdjustments()     // Adjustment history
- getInventoryStats()     // Statistics
- getLowStockAlerts()     // Alert system
```

**Component Structure:**
```
TransfersPage.jsx      - 380 lines
├─ Form (create transfer)
├─ Statistics (cards)
├─ Search/Filter
└─ Transfers List

StockAdjustmentsPage.jsx - 420 lines
├─ Instructions
├─ Form (create adjustment)
├─ Product Details
├─ Adjustment Calculator
└─ History List
```

### Scalability

**Database Optimization:**
- Indexed foreign keys
- Efficient pagination support
- Ledger-based transaction history
- Non-destructive audit trail

**Query Efficiency:**
- Minimal JOIN operations
- Filter push-down to database
- Pagination for large result sets
- Statistics use aggregate functions

**Transaction Safety:**
- Database transactions ensure atomicity
- Rollback on any error during update
- Consistent state guaranteed

---

## 5. Testing Checklist

### Transfer Tests
- [ ] Transfer between different warehouses
- [ ] Prevent self-transfers
- [ ] Validate stock availability
- [ ] Check inventory updates (both sides)
- [ ] Verify stock ledger entries (2 entries)
- [ ] Test search and filtering
- [ ] Check permission (staff can't create transfer)
- [ ] Verify timestamp and user tracking
- [ ] Test with zero/negative quantities
- [ ] Test with non-existent products

### Adjustment Tests
- [ ] Adjust up (increase stock)
- [ ] Adjust down (decrease stock)
- [ ] Adjust to zero (delete inventory record)
- [ ] Test all reason options
- [ ] Verify inventory updates
- [ ] Verify stock ledger entry
- [ ] Check "Other" reason field
- [ ] Test search and filtering
- [ ] Verify permission (staff can't create adjustment)
- [ ] Test with negative quantities (should fail)

### Integration Tests
- [ ] Transfer affects low stock alerts
- [ ] Adjustment affects low stock alerts
- [ ] Both update stock ledger correctly
- [ ] Audit log captures all operations
- [ ] User tracking works correctly
- [ ] Timestamps are accurate
- [ ] Statistics aggregation correct
- [ ] Role-based access works

---

## 6. Troubleshooting

### Transfer Not Creating
**Issue:** Transfer creation fails with validation error
**Solution:** 
- Verify source warehouse has sufficient stock
- Ensure source and destination are different
- Check that both warehouses exist in system

### Stock Adjustment Showing Wrong Variance
**Issue:** Adjustment amount calculation incorrect
**Solution:**
- Verify current stock in system is correct
- Re-count physical inventory carefully
- Check if other operations occurred during count

### Missing Transfers in History
**Issue:** Creating transfer but doesn't appear in list
**Solution:**
- Refresh page (cache issue)
- Verify warehouse permissions
- Check browser console for errors
- Ensure API endpoints are properly registered

### Audit Log Not Recording
**Issue:** Operations completing but not logged
**Solution:**
- Verify logOperation() is called
- Check audit log database table exists
- Ensure user ID is passed to logger
- Check database connection

---

## 7. Future Enhancements

### Planned Features
1. **Bulk Transfer Operations**
   - Multiple products in single transfer request
   - Template-based recurring transfers

2. **Approval Workflow**
   - Optional approval for transfers > threshold
   - Manager review before execution

3. **Advanced Analytics**
   - Transfer heat maps
   - Warehouse efficiency metrics
   - Adjustment pattern analysis

4. **Alerts & Notifications**
   - Email on low stock
   - SMS for critical transfers
   - Dashboard notifications

5. **Integration**
   - Export to CSV/Excel
   - API webhooks for external systems
   - Real-time sync with ERP systems

---

## 8. Support & Questions

For issues or questions about these features:

1. Check the troubleshooting section above
2. Review audit logs for operation history
3. Verify database schema matches expected structure
4. Check API response status codes and error messages
5. Enable debug logging for more details

---

**Last Updated:** March 14, 2026  
**Version:** 1.0  
**Status:** Production Ready
