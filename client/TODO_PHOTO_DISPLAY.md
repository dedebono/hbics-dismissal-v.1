# Photo Display Implementation Plan

## Tasks to Complete:

### Phase 1: Admin Dashboard
- [ ] Modify `src/pages/AdminDashboard.js` - Update `renderActiveStudentsTab()` function
- [ ] Add conditional photo display in student cards
- [ ] Ensure no "no photo" placeholder appears when photo is missing

### Phase 2: Teacher Dashboard  
- [ ] Modify `src/pages/TeacherDashboard.js` - Update student card rendering
- [ ] Add conditional photo display in students-grid
- [ ] Update CSS structure for photo layout

### Phase 3: Student Dashboard
- [ ] Modify `src/pages/StudentDashboard.js` - Update student card rendering
- [ ] Add conditional photo display in students-grid
- [ ] Update CSS structure for photo layout

### Phase 4: Testing
- [ ] Test photo display functionality
- [ ] Verify responsive design
- [ ] Test with actual data

## Implementation Details:

1. **Conditional Logic**: 
   - If `student.photo_url` exists → Show photo using `<img>` with `.student-photo` class
   - If no photo → Only show name, class, and check-in time (no placeholder)

2. **CSS Requirements**:
   - Update card layout to accommodate photos
   - Maintain responsive design
   - Ensure proper spacing and alignment

## Current Status: Starting Phase 1
