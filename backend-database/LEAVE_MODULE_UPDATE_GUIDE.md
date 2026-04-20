# Leave Management Module Updates - Comprehensive Guide

## Overview
The Leave Management modules for both Admin and Employee have been completely updated with the following enhancements:

### Key Changes

#### 1. **Date Range Support**
- **Replaced**: Single "Date of Leave" field
- **Added**: 
  - "Date From" - Start date of the leave period
  - "Date To" - End date of the leave period

#### 2. **Automatic Days Calculation**
- **Feature**: No. of Days field now automatically calculates based on Date From and Date To
- **Read-only**: Employees cannot manually edit the days - it's auto-calculated
- **Formula**: Days = (Date To - Date From) + 1 (inclusive of both start and end dates)

#### 3. **Supporting Documents**
- **New Field**: Optional document upload during leave application
- **Features**:
  - Multiple file support
  - File size limit: 5MB per file
  - Supported formats: PDF, Images, Documents (any type)
  - Display count of documents in admin panel
  - Documents stored as JSON array in database

#### 4. **Database Enhancements**
- New columns in `leave_requests` table:
  - `date_from` (date)
  - `date_to` (date)
  - `documents` (jsonb array)
  - `days` (auto-calculated, stored for reference)

---

## Employee Module Changes (`employee_leave.html`)

### Updated Form Fields
1. **Type of Leave** ✓ (unchanged)
2. **Date of Leave** ✓ (kept for backward compatibility)
3. **Date From** ✓ (NEW)
4. **Date To** ✓ (NEW)
5. **No. of Days** ✓ (auto-calculated, read-only)
6. **Date Filed** ✓ (auto-populated, read-only)
7. **Supporting Documents** ✓ (NEW - optional)
8. **Additional Note** ✓ (unchanged)

### Updated History Table Columns
- Filed (Date filed)
- Date From (NEW)
- Date To (NEW)
- Type (Leave category)
- No. of Days (Previously "Duration")
- Status
- Details (View note)

### New JavaScript Functions
```javascript
calculateDays()              // Auto-calculates days from date range
handleDocumentUpload(event)  // Processes uploaded documents
removeDocument(index)        // Removes document from list
```

---

## Admin Module Changes (`admin_leave_management.html`)

### Updated Table Columns
- Employee
- Date/Time Filed
- Category (Leave type)
- Date From (NEW)
- Date To (NEW)
- No. of Days (auto-calculated)
- Documents (NEW - shows file count)
- Status
- Actions (Approve/Decline/Verify)

### Admin Features
- View document count for each leave request
- See complete date ranges for all leaves
- Approve/decline based on date ranges
- Automatic calculation ensures data consistency

---

## Backend Service Updates (`supabase-hr-service.js`)

### Updated Mappings
- **mapLeaveLocalToDb()**: Converts local form data to database format
  - Includes: dateFrom, dateTo, documents
  - Properly formats dates using safeDateString()
  - Stores documents as JSON array

- **mapLeaveDbToLocal()**: Converts database data to frontend format
  - Reads: dateFrom, dateTo, documents from database
  - Complete mapping for all leave fields
  - Handles null/undefined documents gracefully

---

## Database Migration (`10_add_leave_date_range_documents.sql`)

### What the Migration Does
1. Adds `date_from` column (date type)
2. Adds `date_to` column (date type)
3. Ensures `documents` column exists (jsonb type)
4. Populates existing records with fallback values
5. Creates performance indexes
6. Adds helpful comments

### How to Apply
```bash
# Run migration directly in Supabase dashboard
# Or execute via your database client
psql -U your_user -d your_database -f 10_add_leave_date_range_documents.sql
```

---

## Feature Workflow

### Employee Side
1. Employee opens "File a Leave" form
2. Selects leave type (Vacation, Sick, Emergency)
3. Enters Date From and Date To
4. **No. of Days automatically calculates** (read-only)
5. Optionally attaches supporting documents
6. Adds detailed reason/note
7. Submits request
8. Data saves to:
   - localStorage (client-side)
   - Supabase (server-side)

### Admin Side
1. Admin views all leave requests in table
2. Can see complete date ranges for each leave
3. Views document count for each request
4. Approves, declines, or marks for verification
5. Days are already calculated and validated
6. System automatically syncs to attendance records when approved

---

## Data Storage Format

### Leave Object Structure
```javascript
{
  id: 1234567890,
  empId: 1,
  name: "John Doe",
  dateFiled: "April 20, 2026",           // Date submitted
  timeFiled: "02:30:45 PM",               // Time submitted
  dateOfLeave: "2026-04-25",              // Original single date
  dateFrom: "2026-04-25",                 // NEW: Range start
  dateTo: "2026-04-27",                   // NEW: Range end
  days: 3,                                // Auto-calculated
  reason: "Vacation",
  note: "Family trip",
  documents: [                            // NEW: Document array
    { 
      name: "ticket.pdf",
      size: 245000,
      type: "application/pdf"
    }
  ],
  status: "Pending",
  createdAt: "2026-04-20T14:30:45.000Z"
}
```

### Database Structure
```sql
CREATE TABLE leave_requests (
  id bigint PRIMARY KEY,
  employee_id bigint REFERENCES employees(id),
  employee_name text NOT NULL,
  date_filed date,
  date_from date,              -- NEW
  date_to date,                -- NEW
  reason text,
  note text,
  days integer NOT NULL DEFAULT 1,
  documents jsonb DEFAULT '[]'::jsonb,  -- NEW
  status text NOT NULL DEFAULT 'Pending',
  time_filed text,
  created_at timestamptz,
  updated_at timestamptz
);
```

---

## API Integration

### Fetch Leaves
```javascript
const leaves = await window.HRDataService.fetchLeaves();
// Returns array of leave objects with all new fields
```

### Save Leave Request
```javascript
const success = await window.HRDataService.upsertLeave(leaveObject);
// Automatically handles dateFrom, dateTo, documents
```

---

## Browser Compatibility

✅ Chrome/Edge: Full support (5MB file upload)
✅ Firefox: Full support (5MB file upload)
✅ Safari: Full support (5MB file upload)
✅ Mobile browsers: Touch-friendly file picker

---

## Validation Rules

### Date Range Validation
- Date To must be after or equal to Date From
- System prevents invalid date ranges
- Shows error message if Date To < Date From

### Days Calculation
- Minimum: 1 day (same date)
- Maximum: Unlimited
- Formula: (Date To - Date From) + 1

### Document Validation
- Maximum file size: 5MB
- File type: Any (PDF, Images, Documents, etc.)
- Maximum files per request: Unlimited
- Files are optional (leave can be submitted without documents)

---

## Testing Checklist

- [ ] Employee can submit leave with date range
- [ ] Days auto-calculate correctly
- [ ] Documents can be uploaded (test with 3MB file)
- [ ] Documents display in admin panel
- [ ] Admin can see date ranges
- [ ] Approval syncs to attendance records
- [ ] Historical data loads correctly
- [ ] Responsive on mobile devices
- [ ] No console errors

---

## Backward Compatibility

### Old Data
- Existing leave requests with only "dateOfLeave" will continue to work
- Migration populates "dateFrom" and "dateTo" from "dateOfLeave"
- No data loss during migration

### Form Behavior
- "Date of Leave" field is kept for backward compatibility
- New form uses dateFrom/dateTo as primary fields
- System intelligently handles both formats

---

## Known Limitations

1. **Document Storage**: Currently stored as metadata only (names/sizes)
   - Actual file content not stored (add file storage service like Firebase as needed)
   - File data persists until explicitly removed

2. **Offline Support**: Documents require network access
   - File upload won't work without internet connection
   - Consider implementing offline queue if needed

3. **Edit After Approval**: Cannot edit approved leaves
   - Status select becomes disabled after approval
   - Prevents accidental changes to approved requests

---

## Troubleshooting

### Days not calculating?
1. Check browser console for errors
2. Ensure Date From and Date To are valid date inputs
3. Verify calculateDays() function is loaded

### Documents not saving?
1. Check file size (must be under 5MB)
2. Verify documents array is being populated
3. Check Supabase permissions for jsonb field

### Admin table not showing new columns?
1. Clear browser cache
2. Verify column count in table header matches body
3. Check colspan in "no data" message

---

## Future Enhancements

1. **File Storage Integration**
   - Upload actual files to cloud storage (Firebase, AWS S3)
   - Generate downloadable links

2. **Advanced Filtering**
   - Filter by date range
   - Filter by document status

3. **Notifications**
   - Email notifications for document uploads
   - SMS alerts for leave approvals

4. **Bulk Operations**
   - Bulk approve/decline leaves
   - Batch download documents

---

## Questions or Issues?

For issues or questions:
1. Check browser console for error messages
2. Verify database migration has been applied
3. Clear localStorage and reload page
4. Check Supabase connection status

---

**Last Updated**: April 20, 2026
**Version**: 2.0 (with Date Ranges & Documents)
