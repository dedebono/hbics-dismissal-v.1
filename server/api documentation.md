# HBICS Dismissal System API Documentation

This document provides detailed API documentation for the HBICS Dismissal System, a Node.js/Express application for managing student dismissals, analytics, and user authentication.

## Base URL
```
http://localhost:5000/api
```

## Application Flow

1.  **Initialization**: The first time the application is run, an administrator should send a request to `POST /api/auth/init` to initialize the database and create a default admin account.
2.  **Login**: Users (admins or teachers) log in using their credentials via `POST /api/auth/login` to obtain a JWT token.
3.  **Student Management**: Administrators can add, update, and delete students using the `/api/students` endpoints. This includes uploading student photos and sounds.
4.  **Dismissal Process**: During dismissal, a teacher or admin uses a barcode scanner (or manual input) to check students in or out via `POST /api/dismissal/check-in` and `POST /api/dismissal/check-out`.
5.  **Real-time Updates**: As students are checked in or out, the server broadcasts the updated list of active students to all connected WebSocket clients. This allows for real-time monitoring of the dismissal process.
6.  **Analytics**: Administrators and teachers can view dismissal analytics and logs through the `/api/analytics` endpoints.

## WebSocket API

The application uses WebSockets to provide real-time updates for the student dismissal process.

### Connecting to the WebSocket Server

Clients can connect to the WebSocket server at the following URL:

```
ws://localhost:5000
```

### WebSocket Messages

The server broadcasts messages to all connected clients when the list of active (checked-in) students changes. The message is a JSON object with the following structure:

```json
{
  "type": "active_students",
  "payload": [
    {
      "id": 1,
      "student_id": 123,
      "checked_in_at": "2023-01-01T12:00:00.000Z",
      "name": "John Doe",
      "class": "Grade 1",
      "photo_url": "http://localhost:5000/api/students/photo/student_123.jpg"
    }
  ]
}
```

-   `type`: Always `active_students`.
-   `payload`: An array of active student objects. If no students are active, the payload will be an empty array.

Clients should listen for messages and update their UI accordingly to reflect the real-time status of student dismissals.

## Authentication
Most endpoints require authentication via JWT token. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### Authentication (`/auth`)

#### POST /auth/init
Initialize the database with a default admin user.

**Authentication:** None required

**Request Body:** None

**Response (200):**
```json
{
  "message": "Database initialized successfully",
  "adminUser": {
    "username": "admin",
    "role": "admin"
  }
}
```

**Response (200 - Already initialized):**
```json
{
  "message": "Database already initialized"
}
```

**Errors:**
- 500: Initialization failed

#### POST /auth/login
Authenticate a user and receive a JWT token.

**Authentication:** None required

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

**Errors:**
- 400: Username and password required
- 401: Invalid credentials
- 500: Database/Authentication error

#### GET /auth/profile
Get current user profile (placeholder endpoint).

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Profile endpoint - requires authentication"
}
```

#### POST /auth/change-password
Change user password (placeholder endpoint).

**Authentication:** Required

**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

**Response (200):**
```json
{
  "message": "Password change endpoint - requires authentication"
}
```

**Errors:**
- 400: Current and new password required

#### POST /auth/create-user
Create a new user (Admin only).

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "role": "admin|teacher|student" // optional, defaults to "teacher"
}
```

**Response (201):**
```json
{
  "message": "Admin/Teacher/Student user created successfully",
  "user": {
    "id": 1,
    "username": "newuser",
    "role": "teacher",
    "created_at": "2023-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- 400: Username and password required, Password too short, Invalid role
- 409: Username already exists
- 500: Error creating user

### Students (`/students`)

#### GET /students
Get all students.

**Authentication:** Required

**Response (200):**
```json
[
  {
    "id": 1,
    "barcode": "123456",
    "name": "John Doe",
    "class": "Grade 1",
    "photo_url": "http://localhost:5000/api/students/photo/student_1.jpg",
    "sound_url": "http://localhost:5000/api/students/sound/student_1.mp3"
  }
]
```

**Errors:**
- 500: Error fetching students

#### GET /students/barcode/:barcode
Get student by barcode.

**Authentication:** Required

**Parameters:**
- `barcode` (path): Student barcode

**Response (200):**
```json
{
  "id": 1,
  "barcode": "123456",
  "name": "John Doe",
  "class": "Grade 1",
  "photo_url": "http://localhost:5000/api/students/photo/student_1.jpg",
  "sound_url": "http://localhost:5000/api/students/sound/student_1.mp3"
}
```

**Errors:**
- 404: Student not found
- 500: Error fetching student

#### GET /students/:id
Get student by ID.

**Authentication:** Required

**Parameters:**
- `id` (path): Student ID

**Response:** Same as above

#### POST /students
Create a new student (Admin only).

**Authentication:** Required (Admin)

**Request Body:**
```json
{
  "barcode": "string",
  "name": "string",
  "class": "string"
}
```

**Response (201):**
```json
{
  "message": "Student created successfully",
  "student": {
    "id": 1,
    "barcode": "123456",
    "name": "John Doe",
    "class": "Grade 1"
  }
}
```

**Errors:**
- 400: Required fields missing, Barcode already exists
- 500: Error creating student

#### PUT /students/:id
Update student (Admin only).

**Authentication:** Required (Admin)

**Parameters:**
- `id` (path): Student ID

**Request Body:** Same as POST

**Response (200):**
```json
{
  "message": "Student updated successfully"
}
```

**Errors:**
- 400: Required fields missing, Barcode already exists
- 404: Student not found
- 500: Error updating student

#### DELETE /students/:id
Delete student (Admin only).

**Authentication:** Required (Admin)

**Parameters:**
- `id` (path): Student ID

**Response (200):**
```json
{
  "message": "Student deleted successfully"
}
```

**Errors:**
- 404: Student not found
- 500: Error deleting student

#### GET /students/classes/available
Get available classes.

**Authentication:** Required

**Response (200):**
```json
[
  "Grade 1",
  "Grade 2",
  "Grade 3"
]
```

**Errors:**
- 500: Error fetching classes

#### GET /students/class/:className
Get students by class.

**Authentication:** Required

**Parameters:**
- `className` (path): Class name

**Response (200):** Array of student objects

**Errors:**
- 500: Error fetching students

#### GET /students/search/:name
Search students by name.

**Authentication:** Required

**Parameters:**
- `name` (path): Search term

**Response (200):** Array of student objects

**Errors:**
- 500: Error searching students

#### POST /students/upload-csv
Upload CSV file to create multiple students (Admin only).

**Authentication:** Required (Admin)

**Request Body:** Multipart form data
- `csvFile`: CSV file with columns: barcode, name, class

**Response (201):**
```json
{
  "message": "CSV upload processed",
  "created": 10,
  "failed": 2,
  "total": 12,
  "createdStudents": [...],
  "errors": [...]
}
```

**Errors:**
- 400: CSV file required, Invalid file type, No valid data
- 500: Error processing CSV

#### POST /students/:id/photo
Upload student photo (Admin only).

**Authentication:** Required (Admin)

**Parameters:**
- `id` (path): Student ID

**Request Body:** Multipart form data
- `photo`: Image file (jpeg, jpg, png, gif) - Max 5MB

**Response (200):**
```json
{
  "message": "Photo uploaded successfully",
  "photoUrl": "http://localhost:5000/api/students/photo/student_1.jpg",
  "filename": "student_1.jpg"
}
```

**Errors:**
- 400: Photo file required, File too large, Invalid file type
- 404: Student not found
- 500: Error updating student photo

#### GET /students/photo/:filename
Serve student photo.

**Authentication:** None required

**Parameters:**
- `filename` (path): Photo filename

**Response:** Image file

**Errors:**
- 404: Photo not found

#### DELETE /students/:id/photo
Delete student photo (Admin only).

**Authentication:** Required (Admin)

**Parameters:**
- `id` (path): Student ID

**Response (200):**
```json
{
  "message": "Photo deleted successfully"
}
```

**Errors:**
- 404: Student not found, No photo found
- 500: Error removing photo

#### POST /students/:id/sound
Upload student sound (Admin only).

**Authentication:** Required (Admin)

**Parameters:**
- `id` (path): Student ID

**Request Body:** Multipart form data
- `sound`: Sound file (mp3, wav, ogg, m4a, aac) - Max 10MB

**Response (200):**
```json
{
  "message": "Sound uploaded successfully",
  "soundUrl": "http://localhost:5000/api/students/sound/student_1.mp3",
  "filename": "student_1.mp3"
}
```

**Errors:**
- 400: Sound file required, File too large, Invalid file type
- 404: Student not found
- 500: Error updating student sound

#### GET /students/sound/:filename
Serve student sound.

**Authentication:** None required

**Parameters:**
- `filename` (path): Sound filename

**Response:** Sound file

**Errors:**
- 404: Sound not found

#### DELETE /students/:id/sound
Delete student sound (Admin only).

**Authentication:** Required (Admin)

**Parameters:**
- `id` (path): Student ID

**Response (200):**
```json
{
  "message": "Sound deleted successfully"
}
```

**Errors:**
- 404: Student not found, No sound found
- 500: Error removing sound

### Dismissal (`/dismissal`)

**Note:** The `/check-in`, `/check-out`, and `/active/clear` endpoints trigger a WebSocket broadcast to all connected clients with the updated list of active students.

#### POST /dismissal/check-in
Check in a student by barcode.

**Authentication:** Required

**Request Body:**
```json
{
  "barcode": "string"
}
```

**Response (200):**
```json
{
  "message": "Student checked in successfully",
  "student": {
    "id": 1,
    "name": "John Doe",
    "class": "Grade 1",
    "barcode": "123456"
  },
  "timestamp": "2023-01-01T12:00:00.000Z"
}
```

**Errors:**
- 400: Barcode required, Student already checked in
- 404: Student not found
- 500: Error checking in student

#### POST /dismissal/check-out
Check out a student by barcode.

**Authentication:** Required

**Request Body:** Same as check-in

**Response (200):**
```json
{
  "message": "Student checked out successfully",
  "student": {
    "id": 1,
    "name": "John Doe",
    "class": "Grade 1",
    "barcode": "123456"
  },
  "timestamp": "2023-01-01T15:00:00.000Z"
}
```

**Errors:**
- 400: Barcode required, Student not checked in
- 404: Student not found
- 500: Error checking out student

#### GET /dismissal/active
Get all active (checked in) students.

**Authentication:** Required

**Response (200):** Array of active student objects

**Errors:**
- 500: Error fetching active students

#### GET /dismissal/logs
Get dismissal logs.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 50)

**Response (200):** Array of log objects

**Errors:**
- 500: Error fetching dismissal logs

#### GET /dismissal/today
Get today's dismissal activity (Teacher/Admin only).

**Authentication:** Required (Teacher/Admin)

**Response (200):** Today's activity data

**Errors:**
- 500: Error fetching today's activity

#### GET /dismissal/history/:studentId
Get student dismissal history.

**Authentication:** Required

**Parameters:**
- `studentId` (path): Student ID

**Query Parameters:**
- `limit` (optional): Number of records (default: 20)

**Response (200):** Array of history records

**Errors:**
- 500: Error fetching student history

#### DELETE /dismissal/active/clear
Clear all active students.

**Authentication:** Required

**Response (200):**
```json
{
  "message": "Cleared 5 active students",
  "cleared": 5
}
```

**Errors:**
- 500: Error clearing active students

#### GET /dismissal/status/:barcode
Check student status by barcode.

**Authentication:** Required

**Parameters:**
- `barcode` (path): Student barcode

**Response (200):**
```json
{
  "student": {
    "id": 1,
    "name": "John Doe",
    "class": "Grade 1",
    "barcode": "123456"
  },
  "isActive": true,
  "checkedInAt": "2023-01-01T12:00:00.000Z"
}
```

**Errors:**
- 404: Student not found
- 500: Error checking student status

### Users (`/users`)

#### GET /users
Get all users (Admin only).

**Authentication:** Required (Admin)

**Response (200):**
```json
{
  "message": "Users retrieved successfully",
  "users": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "created_at": "2023-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

**Errors:**
- 500: Error fetching users

#### GET /users/:id
Get user by ID (Admin only).

**Authentication:** Required (Admin)

**Parameters:**
- `id` (path): User ID

**Response (200):**
```json
{
  "message": "User retrieved successfully",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "created_at": "2023-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- 400: Invalid user ID
- 404: User not found
- 500: Error fetching user

#### DELETE /users/:id
Delete user by ID (Admin only).

**Authentication:** Required (Admin)

**Parameters:**
- `id` (path): User ID

**Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

**Errors:**
- 400: Invalid user ID
- 404: User not found
- 500: Error deleting user

### Analytics (`/analytics`)

#### GET /analytics/daily-stats/:date
Get daily statistics (Teacher/Admin only).

**Authentication:** Required (Teacher/Admin)

**Parameters:**
- `date` (path): Date in YYYY-MM-DD format

**Response (200):**
```json
{
  "date": "2023-01-01",
  "check_ins": 25,
  "check_outs": 23,
  "unique_students": 24
}
```

**Errors:**
- 500: Error fetching daily statistics

#### GET /analytics/weekly-stats
Get weekly statistics (Teacher/Admin only).

**Authentication:** Required (Teacher/Admin)

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Response (200):** Weekly statistics object

**Errors:**
- 400: startDate and endDate required
- 500: Error fetching weekly statistics

#### GET /analytics/class-stats/:date
Get class-based statistics (Teacher/Admin only).

**Authentication:** Required (Teacher/Admin)

**Parameters:**
- `date` (path): Date in YYYY-MM-DD format

**Response (200):** Class statistics object

**Errors:**
- 500: Error fetching class statistics

#### GET /analytics/peak-hours/:date
Get peak hours analysis (Teacher/Admin only).

**Authentication:** Required (Teacher/Admin)

**Parameters:**
- `date` (path): Date in YYYY-MM-DD format

**Response (200):** Peak hours data

**Errors:**
- 500: Error fetching peak hours data

#### GET /analytics/student-summary/:studentId
Get student activity summary (Teacher/Admin only).

**Authentication:** Required (Teacher/Admin)

**Parameters:**
- `studentId` (path): Student ID

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Response (200):**
```json
{
  "total_check_ins": 10,
  "total_check_outs": 10
}
```

**Errors:**
- 400: startDate and endDate required
- 500: Error fetching student summary

#### GET /analytics/filtered-logs
Get filtered logs (Teacher/Admin only).

**Authentication:** Required (Teacher/Admin)

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `action` (optional): check_in or check_out
- `class` (optional): Class name
- `studentId` (optional): Student ID
- `limit` (optional): Limit results (default: 50)
- `offset` (optional): Offset for pagination (default: 0)

**Response (200):** Array of filtered log objects

**Errors:**
- 500: Error fetching filtered logs

#### GET /analytics/export-logs
Export logs to CSV (Teacher/Admin only).

**Authentication:** Required (Teacher/Admin)

**Query Parameters:** Same as filtered-logs

**Response:** CSV file download

**Errors:**
- 500: Error exporting logs

#### GET /analytics/logs-by-period
Get logs by period (Teacher/Admin only).

**Authentication:** Required (Teacher/Admin)

**Query Parameters:**
- `year` (optional): Year (2000-2100)
- `month` (optional): Month (1-12)
- `limit` (optional): Limit results (default: 100)
- `offset` (optional): Offset (default: 0)

**Response (200):** Array of log objects

**Errors:**
- 400: Invalid year or month
- 500: Error fetching logs by period

### Health Check

#### GET /health
Check server health.

**Authentication:** None required

**Response (200):**
```json
{
  "status": "Server is running",
  "timestamp": "2023-01-01T12:00:00.000Z"
}
```

## Error Response Format
All error responses follow this format:
```json
{
  "message": "Error description"
}
```

Some endpoints may include additional error details.

## Notes
- All dates should be in YYYY-MM-DD format
- Timestamps are in ISO 8601 format
- File uploads have size limits: 5MB for photos, 10MB for sounds
- CSV uploads should have headers: barcode, name, class
- Authentication tokens expire and need to be refreshed
- Admin-only endpoints require the user to have "admin" role
- Teacher/Admin endpoints require "teacher" or "admin" role
