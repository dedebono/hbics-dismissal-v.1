# TODO: Add Search Box for Active Student Names in ActiveStudentsTab.js

- [x] Import useState from React
- [x] Add state for searchTerm using useState
- [x] Add input field for search in the tab-header section
- [x] Create filteredStudents by filtering activeStudents based on name matching searchTerm (case insensitive)
- [x] Update the active-students-grid to display filteredStudents instead of activeStudents
- [x] Update the header count to show filteredStudents.length
- [x] Update empty state logic: if filteredStudents.length === 0 and activeStudents.length > 0, show "No students match your search"; else "No active students"
